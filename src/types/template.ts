import type { CanvasRatio } from './project.ts'

export type TripTemplateId = 'city-walk' | 'one-day' | 'coffee-hop' | 'photo-spots'

export interface TripTemplateVisuals {
  accentColor: string
  badgeBackground: string
  badgeColor: string
  canvasBackground: string
  gradientBottom: string
  gradientTop: string
  labelBackground: string
  labelColor: string
  titleColor: string
}

export interface TripTemplate {
  id: TripTemplateId
  name: string
  description: string
  badge: string
  canvasRatio: CanvasRatio
  defaultSubtitle: string
  visuals: TripTemplateVisuals
}
