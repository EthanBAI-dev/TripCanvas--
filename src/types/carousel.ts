export type CarouselPageType = 'cover' | 'route' | 'place'

export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface WatermarkSettings {
  enabled: boolean
  text: string
  position: WatermarkPosition
  opacity: number
}

export interface CarouselSettings {
  pageOrder: string[]
  hiddenPageIds: string[]
  watermark: WatermarkSettings
}

export interface CarouselPage {
  id: string
  index: number
  type: CarouselPageType
  title: string
  subtitle?: string
  placeId?: string
  placeIndex?: number
  included: boolean
}
