import type { GeocodingAdapter, GeocodingQuery, GeocodingResult } from '../../types/geocoding.ts'
import { activeGeocodingAdapter } from './geocodingProvider.ts'

export async function geocodePlaces(
  queries: GeocodingQuery[],
  adapter: GeocodingAdapter = activeGeocodingAdapter,
): Promise<GeocodingResult[]> {
  return Promise.all(queries.map((query) => adapter.geocodePlace(query)))
}
