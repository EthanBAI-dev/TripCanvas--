import type { LngLat } from './geo.ts'

export interface ScreenPoint {
  x: number
  y: number
}

export interface CanvasMapController {
  project: (lngLat: LngLat) => ScreenPoint
  unproject: (point: ScreenPoint) => LngLat
  flyTo: (lngLat: LngLat, zoom: number) => void
  fitBounds: (locations: LngLat[]) => void
}
