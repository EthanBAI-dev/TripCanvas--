import type { LngLat } from './geo.ts'

export type PlaceCategory =
  | 'start'
  | 'end'
  | 'food'
  | 'coffee'
  | 'shopping'
  | 'photo'
  | 'hotel'
  | 'sight'
  | 'transport'
  | 'custom'

export type PlaceSource = 'manual' | 'google' | 'mapbox' | 'osm' | 'ai'

export interface Place extends LngLat {
  id: string
  name: string
  address?: string
  category: PlaceCategory
  note?: string
  imageUrl?: string
  arrivalMode?: 'walking' | 'driving'
  externalUrl?: string
  googlePlaceId?: string
  source?: PlaceSource
}
