import type { Place, PlaceCategory, PlaceSource } from './place.ts'

export interface GeocodingQuery {
  name: string
  city?: string
  category: PlaceCategory
  note?: string
  source: PlaceSource
}

export type GeocodingStatus = 'resolved' | 'unresolved' | 'needs-selection'

export interface GeocodingResult {
  query: GeocodingQuery
  status: GeocodingStatus
  place?: Place
  candidates?: Place[]
}

export interface GeocodingAdapter {
  geocodePlace: (query: GeocodingQuery) => Promise<GeocodingResult>
}
