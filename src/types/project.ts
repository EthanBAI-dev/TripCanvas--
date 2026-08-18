import type { Annotation } from './annotation.ts'
import type { CarouselSettings } from './carousel.ts'
import type { LngLat } from './geo.ts'
import type { Place } from './place.ts'
import type { Route } from './route.ts'
import type { TripTemplateId } from './template.ts'

export type CanvasRatio = '3:4' | '4:5' | '9:16' | '1:1'

export interface ExportSize {
  width: number
  height: number
}

export interface MapView {
  center: LngLat
  zoom: number
  bearing?: number
  pitch?: number
}

export type MapDetail = 'standard' | 'clean' | 'minimal'

export interface TripCanvasProject {
  id: string
  title: string
  subtitle?: string
  city?: string
  theme?: string[]
  templateId?: TripTemplateId
  canvasRatio: CanvasRatio
  exportSize: ExportSize
  mapView: MapView
  mapDetail: MapDetail
  places: Place[]
  routes: Route[]
  annotations: Annotation[]
  carousel: CarouselSettings
  createdAt: string
  updatedAt: string
}
