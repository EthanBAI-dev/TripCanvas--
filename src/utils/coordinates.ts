import type { LngLat } from '../types/geo.ts'
import type { CanvasMapController, ScreenPoint } from '../types/map.ts'

export function lngLatToScreen(map: CanvasMapController, lngLat: LngLat): ScreenPoint {
  return map.project(lngLat)
}

export function screenToLngLat(map: CanvasMapController, point: ScreenPoint): LngLat {
  return map.unproject(point)
}
