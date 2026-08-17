import type { PlaceCategory } from './place.ts'
import type { CanvasRatio } from './project.ts'
import type { TravelMode } from './route.ts'

export interface TripDraftPlace {
  name: string
  category: PlaceCategory
  note?: string
}

export interface TripStyleSuggestion {
  routeColor: string
  labelStyle: 'xiaohongshu' | 'minimal'
  canvasRatio: CanvasRatio
}

export interface TripDraft {
  title: string
  city: string
  theme: string[]
  travelMode: TravelMode
  places: TripDraftPlace[]
  styleSuggestion: TripStyleSuggestion
}
