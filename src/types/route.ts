import type { LngLat } from './geo.ts'

export type TravelMode = 'walking' | 'driving' | 'transit' | 'cycling'
export type RouteSource = 'straight-line' | 'osrm' | 'google'

export interface RouteLeg {
  id: string
  fromPlaceId: string
  toPlaceId: string
  geometry: LngLat[]
  distanceMeters: number
  durationSeconds: number
}

export interface RouteStyle {
  color: string
  width: number
  dashed: boolean
  showArrow: boolean
}

export interface Route {
  id: string
  name: string
  travelMode: TravelMode
  placeIds: string[]
  geometry: LngLat[]
  distanceMeters?: number
  durationSeconds?: number
  legs: RouteLeg[]
  source?: RouteSource
  style: RouteStyle
}
