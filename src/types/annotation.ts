export type AnnotationType = 'label' | 'sticker' | 'route' | 'pin' | 'title' | 'note'

export interface AnnotationStyle {
  color?: string
  backgroundColor?: string
  fontSize?: number
  fontWeight?: 'normal' | 'bold'
  borderColor?: string
  borderRadius?: number
  opacity?: number
  rotation?: number
}

export interface Annotation {
  id: string
  type: AnnotationType
  lng?: number
  lat?: number
  x?: number
  y?: number
  text?: string
  placeId?: string
  routeId?: string
  style: AnnotationStyle
}
