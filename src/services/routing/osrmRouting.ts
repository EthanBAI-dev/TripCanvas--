import { z } from 'zod'
import type { RoutingAdapter, RoutingRequest } from '../../types/routing.ts'

const longitudeSchema = z.number().finite().min(-180).max(180)
const latitudeSchema = z.number().finite().min(-90).max(90)
const osrmResponseSchema = z.object({
  code: z.string(),
  routes: z
    .array(
      z.object({
        distance: z.number().finite().nonnegative(),
        duration: z.number().finite().nonnegative(),
        geometry: z.object({
          type: z.literal('LineString'),
          coordinates: z.array(z.tuple([longitudeSchema, latitudeSchema])).min(2),
        }),
        legs: z.array(
          z.object({
            distance: z.number().finite().nonnegative(),
            duration: z.number().finite().nonnegative(),
          }),
        ),
      }),
    )
    .optional(),
})

interface OsrmRoutingOptions {
  baseUrl: string
  drivingProfile?: string
  fetcher?: typeof fetch
  walkingProfile?: string
}

function createRouteUrl(
  baseUrl: string,
  request: RoutingRequest,
  profiles: Record<RoutingRequest['travelMode'], string>,
): URL {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const coordinates = request.places.map((place) => `${place.lng},${place.lat}`).join(';')
  const url = new URL(`route/v1/${profiles[request.travelMode]}/${coordinates}`, normalizedBaseUrl)
  url.searchParams.set('alternatives', 'false')
  url.searchParams.set('geometries', 'geojson')
  url.searchParams.set('overview', 'full')
  url.searchParams.set('steps', 'false')
  return url
}

export function createOsrmRoutingAdapter({
  baseUrl,
  drivingProfile = 'driving',
  fetcher = fetch,
  walkingProfile = 'walking',
}: OsrmRoutingOptions): RoutingAdapter {
  const profiles = { driving: drivingProfile, walking: walkingProfile }

  return {
    source: 'osrm',
    calculateRoute: async (request) => {
      let response: Response
      try {
        response = await fetcher(createRouteUrl(baseUrl, request, profiles), {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(15_000),
        })
      } catch {
        throw new Error('无法连接路线服务，请检查网络或服务配置。')
      }

      if (!response.ok) {
        throw new Error(`路线服务暂时不可用（HTTP ${response.status}）。`)
      }

      let payload: unknown
      try {
        payload = await response.json()
      } catch {
        throw new Error('路线服务没有返回有效的 JSON。')
      }

      const parsed = osrmResponseSchema.safeParse(payload)
      if (!parsed.success) {
        throw new Error('路线服务返回了无法识别的数据。')
      }

      const route = parsed.data.routes?.[0]
      if (parsed.data.code !== 'Ok' || !route) {
        throw new Error('没有找到连接这些地点的可用路线。')
      }

      return {
        geometry: route.geometry.coordinates.map(([lng, lat]) => ({ lng, lat })),
        distanceMeters: Math.round(route.distance),
        durationSeconds: Math.round(route.duration),
        legs: route.legs.map((leg, index) => {
          const fromPlace = request.places[index]
          const toPlace = request.places[index + 1]

          return {
            id: `leg-${index + 1}`,
            fromPlaceId: fromPlace.id,
            toPlaceId: toPlace.id,
            geometry: [
              { lng: fromPlace.lng, lat: fromPlace.lat },
              { lng: toPlace.lng, lat: toPlace.lat },
            ],
            distanceMeters: Math.round(leg.distance),
            durationSeconds: Math.round(leg.duration),
          }
        }),
      }
    },
  }
}
