import type { PlaceCategory } from './place.ts'
import type { CanvasRatio } from './project.ts'
import type { RoutableTravelMode } from './routing.ts'

export interface AiRoutePlanPlace {
  name: string
  searchQuery?: string
  category: PlaceCategory
  note: string
  arrivalMode?: RoutableTravelMode
}

export interface AiRoutePlan {
  title: string
  subtitle?: string
  city: string
  canvasRatio?: Exclude<CanvasRatio, '1:1'>
  places: AiRoutePlanPlace[]
}

