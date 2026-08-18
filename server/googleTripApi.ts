import { z } from 'zod'

export interface ServerPlaceCandidate {
  id: string
  name: string
  address?: string
  lat: number
  lng: number
  externalUrl?: string
  imageUrl?: string
  imageSourceUrl?: string
  imageAttributions?: Array<{
    displayName: string
    uri?: string
    photoUri?: string
  }>
}

export interface ServerRoutePlace {
  name: string
  lat: number
  lng: number
  arrivalMode?: 'walking' | 'driving'
}

export interface ServerRouteResult {
  geometry: Array<{ lat: number; lng: number }>
  distanceMeters: number
  durationSeconds: number
  segments: Array<{
    travelMode: 'walking' | 'driving'
    geometry: Array<{ lat: number; lng: number }>
  }>
}

interface GoogleServerOptions {
  apiKey: string
}

export interface StaticMapSnapshotRequest {
  center: { lat: number; lng: number }
  zoom: number
  canvasRatio: '3:4' | '4:5' | '9:16'
}

export interface StaticMapSnapshot {
  imageDataUrl: string
  logicalWidth: number
  logicalHeight: number
}

const searchResponseSchema = z.object({
  places: z.array(z.object({
    id: z.string(),
    displayName: z.object({ text: z.string() }),
    formattedAddress: z.string().optional(),
    location: z.object({ latitude: z.number(), longitude: z.number() }),
    googleMapsUri: z.string().optional(),
    photos: z.array(z.object({
      name: z.string(),
      googleMapsUri: z.string().optional(),
      authorAttributions: z.array(z.object({
        displayName: z.string(),
        uri: z.string().optional(),
        photoUri: z.string().optional(),
      })).optional(),
    })).optional(),
  })).default([]),
})

const routeResponseSchema = z.object({
  routes: z.array(z.object({
    distanceMeters: z.number().default(0),
    duration: z.string().default('0s'),
    polyline: z.object({ encodedPolyline: z.string() }),
  })).min(1),
})

function requireApiKey(options: GoogleServerOptions): string {
  const apiKey = options.apiKey.trim()
  if (!apiKey) throw new Error('服务端尚未配置 GOOGLE_MAPS_API_KEY。')
  return apiKey
}

function parseDurationSeconds(duration: string): number {
  const seconds = Number(duration.replace(/s$/, ''))
  return Number.isFinite(seconds) ? Math.round(seconds) : 0
}

function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = []
  let index = 0
  let lat = 0
  let lng = 0
  while (index < encoded.length) {
    let result = 0
    let shift = 0
    let byte: number
    do {
      byte = encoded.charCodeAt(index) - 63
      index += 1
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20 && index < encoded.length)
    lat += result & 1 ? ~(result >> 1) : result >> 1

    result = 0
    shift = 0
    do {
      byte = encoded.charCodeAt(index) - 63
      index += 1
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20 && index < encoded.length)
    lng += result & 1 ? ~(result >> 1) : result >> 1
    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }
  return points
}

async function getPhotoUri(photoName: string, apiKey: string): Promise<string | undefined> {
  const response = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&maxHeightPx=900&skipHttpRedirect=true`,
    { headers: { 'X-Goog-Api-Key': apiKey }, signal: AbortSignal.timeout(15_000) },
  )
  if (!response.ok) return undefined
  const payload = z.object({ photoUri: z.string().url() }).safeParse(await response.json())
  return payload.success ? payload.data.photoUri : undefined
}

export async function searchGooglePlacesRest(
  query: string,
  locationBias: { lat: number; lng: number } | undefined,
  options: GoogleServerOptions,
): Promise<ServerPlaceCandidate[]> {
  const apiKey = requireApiKey(options)
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.photos',
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: 'zh-CN',
      maxResultCount: 5,
      ...(locationBias ? {
        locationBias: {
          circle: {
            center: { latitude: locationBias.lat, longitude: locationBias.lng },
            radius: 50_000,
          },
        },
      } : {}),
    }),
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) throw new Error(`Google Places 请求失败（${response.status}）。`)
  const parsed = searchResponseSchema.safeParse(await response.json())
  if (!parsed.success) throw new Error('Google Places 返回结构不正确。')

  return Promise.all(parsed.data.places.map(async (place) => {
    const photo = place.photos?.[0]
    return {
      id: place.id,
      name: place.displayName.text,
      address: place.formattedAddress,
      lat: place.location.latitude,
      lng: place.location.longitude,
      externalUrl: place.googleMapsUri,
      imageUrl: photo ? await getPhotoUri(photo.name, apiKey) : undefined,
      imageSourceUrl: photo?.googleMapsUri ?? place.googleMapsUri,
      imageAttributions: photo?.authorAttributions,
    }
  }))
}

async function calculateSegment(
  from: ServerRoutePlace,
  to: ServerRoutePlace,
  travelMode: 'walking' | 'driving',
  apiKey: string,
): Promise<ServerRouteResult['segments'][number] & { distanceMeters: number; durationSeconds: number }> {
  const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
      destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
      travelMode: travelMode === 'driving' ? 'DRIVE' : 'WALK',
      ...(travelMode === 'driving' ? { routingPreference: 'TRAFFIC_AWARE' } : {}),
      computeAlternativeRoutes: false,
      polylineQuality: 'OVERVIEW',
      polylineEncoding: 'ENCODED_POLYLINE',
      languageCode: 'zh-CN',
      units: 'METRIC',
    }),
    signal: AbortSignal.timeout(25_000),
  })
  if (!response.ok) throw new Error(`Google Routes 请求失败（${response.status}）。`)
  const parsed = routeResponseSchema.safeParse(await response.json())
  if (!parsed.success) throw new Error('Google Routes 返回结构不正确。')
  const route = parsed.data.routes[0]
  return {
    travelMode,
    geometry: decodePolyline(route.polyline.encodedPolyline),
    distanceMeters: route.distanceMeters,
    durationSeconds: parseDurationSeconds(route.duration),
  }
}

export async function calculateGoogleRouteRest(
  places: ServerRoutePlace[],
  fallbackMode: 'walking' | 'driving',
  options: GoogleServerOptions,
): Promise<ServerRouteResult> {
  const apiKey = requireApiKey(options)
  if (places.length < 2 || places.length > 12) throw new Error('路线需要 2–12 个路径点。')
  const segments = await Promise.all(places.slice(1).map((place, index) =>
    calculateSegment(places[index], place, place.arrivalMode ?? fallbackMode, apiKey)))
  const geometry: ServerRouteResult['geometry'] = []
  segments.forEach((segment) => segment.geometry.forEach((point, index) => {
    const previous = geometry.at(-1)
    if (index === 0 && previous?.lat === point.lat && previous.lng === point.lng) return
    geometry.push(point)
  }))
  return {
    geometry,
    distanceMeters: segments.reduce((total, segment) => total + segment.distanceMeters, 0),
    durationSeconds: segments.reduce((total, segment) => total + segment.durationSeconds, 0),
    segments: segments.map(({ travelMode, geometry: segmentGeometry }) => ({ travelMode, geometry: segmentGeometry })),
  }
}

const STATIC_MAP_SIZES: Record<StaticMapSnapshotRequest['canvasRatio'], [number, number]> = {
  '3:4': [480, 640],
  '4:5': [512, 640],
  '9:16': [360, 640],
}

export async function createMinimalStaticMap(
  request: StaticMapSnapshotRequest,
  options: GoogleServerOptions,
): Promise<StaticMapSnapshot> {
  const apiKey = requireApiKey(options)
  const [logicalWidth, logicalHeight] = STATIC_MAP_SIZES[request.canvasRatio]
  const url = new URL('https://maps.googleapis.com/maps/api/staticmap')
  url.searchParams.set('center', `${request.center.lat},${request.center.lng}`)
  url.searchParams.set('zoom', String(Math.max(1, Math.min(20, Math.round(request.zoom)))))
  url.searchParams.set('size', `${logicalWidth}x${logicalHeight}`)
  url.searchParams.set('scale', '2')
  url.searchParams.set('format', 'png')
  url.searchParams.set('language', 'zh-CN')
  url.searchParams.append('style', 'element:labels|visibility:off')
  url.searchParams.append('style', 'feature:road|element:geometry|saturation:-60|lightness:20')
  url.searchParams.append('style', 'feature:poi|visibility:off')
  url.searchParams.append('style', 'feature:transit|visibility:off')
  url.searchParams.set('key', apiKey)

  const response = await fetch(url, { signal: AbortSignal.timeout(25_000) })
  if (!response.ok) throw new Error(`Google Static Maps 请求失败（${response.status}）。`)
  const contentType = response.headers.get('content-type') ?? 'image/png'
  if (!contentType.startsWith('image/')) throw new Error('Google Static Maps 没有返回图片。')
  const bytes = Buffer.from(await response.arrayBuffer())
  return {
    imageDataUrl: `data:${contentType};base64,${bytes.toString('base64')}`,
    logicalWidth,
    logicalHeight,
  }
}
