import { z } from 'zod'
import type { GeocodingAdapter, GeocodingQuery, GeocodingResult } from '../../types/geocoding.ts'
import type { Place } from '../../types/place.ts'
import { createId } from '../../utils/id.ts'

const nominatimSearchResponseSchema = z.array(
  z.object({
    display_name: z.string().min(1),
    lat: z.string().transform(Number).pipe(z.number().finite().min(-90).max(90)),
    lon: z.string().transform(Number).pipe(z.number().finite().min(-180).max(180)),
    name: z.string().min(1).optional(),
  }),
)

type NominatimSearchResult = z.infer<typeof nominatimSearchResponseSchema>[number]

interface NominatimGeocodingOptions {
  baseUrl: string
  fetcher?: typeof fetch
  minimumIntervalMs?: number
}

function createCandidate(
  result: NominatimSearchResult,
  query: GeocodingQuery,
): Place {
  return {
    id: createId('place'),
    name: result.name ?? result.display_name.split(',')[0]?.trim() ?? query.name,
    address: result.display_name,
    category: query.category,
    note: query.note,
    lng: result.lon,
    lat: result.lat,
    source: 'osm',
  }
}

function createSearchUrl(baseUrl: string, query: GeocodingQuery): URL {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const url = new URL('search', normalizedBaseUrl)
  url.searchParams.set('q', [query.name, query.city].filter(Boolean).join(', '))
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', '5')
  url.searchParams.set('accept-language', 'zh-CN,zh,en,ja')
  return url
}

export function createNominatimGeocodingAdapter({
  baseUrl,
  fetcher = fetch,
  minimumIntervalMs = 1_000,
}: NominatimGeocodingOptions): GeocodingAdapter {
  const cache = new Map<string, NominatimSearchResult[]>()
  let nextRequestAt = 0
  let requestQueue = Promise.resolve()

  const search = async (query: GeocodingQuery): Promise<Place[]> => {
    const cacheKey = `${query.city ?? ''}:${query.name}`.toLocaleLowerCase()
    const cached = cache.get(cacheKey)
    if (cached) {
      return cached.map((result) => createCandidate(result, query))
    }

    const waitTime = Math.max(0, nextRequestAt - Date.now())
    if (waitTime > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, waitTime))
    }
    nextRequestAt = Date.now() + minimumIntervalMs

    let response: Response
    try {
      response = await fetcher(createSearchUrl(baseUrl, query), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
      })
    } catch {
      throw new Error('无法连接地点搜索服务，请检查网络或服务配置。')
    }

    if (!response.ok) {
      throw new Error(`地点搜索服务暂时不可用（HTTP ${response.status}）。`)
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new Error('地点搜索服务没有返回有效的 JSON。')
    }

    const parsed = nominatimSearchResponseSchema.safeParse(payload)
    if (!parsed.success) {
      throw new Error('地点搜索服务返回了无法识别的数据。')
    }

    cache.set(cacheKey, parsed.data)
    return parsed.data.map((result) => createCandidate(result, query))
  }

  const geocodePlace = (query: GeocodingQuery): Promise<GeocodingResult> => {
    const scheduled = requestQueue.then(async () => {
      const candidates = await search(query)

      if (candidates.length === 0) {
        return { query, status: 'unresolved' as const }
      }

      if (candidates.length === 1) {
        return { query, status: 'resolved' as const, place: candidates[0] }
      }

      return { query, status: 'needs-selection' as const, candidates }
    })

    requestQueue = scheduled.then(
      () => undefined,
      () => undefined,
    )
    return scheduled
  }

  return { geocodePlace }
}
