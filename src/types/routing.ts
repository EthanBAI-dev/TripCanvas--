import type { Place } from './place.ts'
import type { Route, RouteLeg, RouteSource, TravelMode } from './route.ts'
import type { LngLat } from './geo.ts'

export type RoutableTravelMode = Extract<TravelMode, 'walking' | 'driving'>

export interface RoutingRequest {
  places: Place[]
  travelMode: RoutableTravelMode
}

export interface RoutingDraft {
  geometry: LngLat[]
  distanceMeters: number
  durationSeconds: number
  legs: RouteLeg[]
}

export interface RoutingAdapter {
  source: RouteSource
  calculateRoute: (request: RoutingRequest) => Promise<RoutingDraft>
}

export interface RouteCalculationResult {
  route: Route | null
  usedFallback: boolean
  warning?: string
}
