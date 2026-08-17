import type { GeocodingAdapter, GeocodingQuery, GeocodingResult } from '../../types/geocoding.ts'
import type { Place } from '../../types/place.ts'
import { createId } from '../../utils/id.ts'

interface DemoLocation {
  name: string
  address: string
  aliases: string[]
  lng: number
  lat: number
}

const TOKYO_DEMO_LOCATIONS: DemoLocation[] = [
  { name: '东京站', address: '东京都千代田区丸之内 1 丁目', aliases: ['东京站', 'tokyo station'], lng: 139.7671, lat: 35.6812 },
  { name: '银座', address: '东京都中央区银座', aliases: ['银座', 'ginza'], lng: 139.7638, lat: 35.6716 },
  { name: '筑地市场', address: '东京都中央区筑地 4 丁目', aliases: ['筑地市场', 'tsukiji market'], lng: 139.7708, lat: 35.6654 },
  { name: '东京塔', address: '东京都港区芝公园 4 丁目', aliases: ['东京塔', 'tokyo tower'], lng: 139.7454, lat: 35.6586 },
  { name: '涩谷站', address: '东京都涩谷区道玄坂', aliases: ['涩谷站', 'shibuya station'], lng: 139.7016, lat: 35.658 },
  { name: '涩谷十字路口', address: '东京都涩谷区宇田川町', aliases: ['涩谷十字路口', 'shibuya crossing'], lng: 139.7006, lat: 35.6595 },
  { name: '表参道', address: '东京都港区北青山 3 丁目', aliases: ['表参道', 'omotesando'], lng: 139.7125, lat: 35.6652 },
]

const AMBIGUOUS_DEMO_QUERIES: Record<string, string[]> = {
  涩谷: ['涩谷站', '涩谷十字路口'],
  shibuya: ['涩谷站', '涩谷十字路口'],
}

function normalizeName(name: string): string {
  return name.trim().replaceAll(/\s+/g, ' ').toLocaleLowerCase()
}

function isSupportedCity(city: string | undefined): boolean {
  return city === undefined || /^(tokyo|东京)$/i.test(city.trim())
}

function createPlace(location: DemoLocation, query: GeocodingQuery): Place {
  return {
    id: createId('place'),
    name: location.name,
    address: location.address,
    category: query.category,
    note: query.note,
    lng: location.lng,
    lat: location.lat,
    source: query.source,
  }
}

async function geocodeMockPlace(query: GeocodingQuery): Promise<GeocodingResult> {
  if (!isSupportedCity(query.city)) {
    return { query, status: 'unresolved' }
  }

  const normalized = normalizeName(query.name)
  const ambiguousNames = AMBIGUOUS_DEMO_QUERIES[normalized]

  if (ambiguousNames) {
    const candidates = ambiguousNames
      .map((name) => TOKYO_DEMO_LOCATIONS.find((location) => location.name === name))
      .filter((location): location is DemoLocation => Boolean(location))
      .map((location) => createPlace(location, query))

    return { query, status: 'needs-selection', candidates }
  }

  const location = TOKYO_DEMO_LOCATIONS.find((candidate) =>
    candidate.aliases.some((alias) => normalizeName(alias) === normalized),
  )

  if (!location) {
    return { query, status: 'unresolved' }
  }

  return {
    query,
    status: 'resolved',
    place: createPlace(location, query),
  }
}

export const mockGeocodingAdapter: GeocodingAdapter = {
  geocodePlace: geocodeMockPlace,
}
