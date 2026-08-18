export interface PlaceSearchCandidate {
  id: string
  name: string
  address?: string
  lat: number
  lng: number
  externalUrl?: string
  imageUrl?: string
  imageSourceUrl?: string
  imageAttributions?: Array<{
    displayName: string
    uri?: string
    photoUri?: string
  }>
}

export interface ExtensionAiRoutePlanRequest {
  type: 'TRIPCANVAS_EXTENSION_PLAN_AI_ROUTE'
  requestId: string
  prompt: string
}

export interface ExtensionAiRoutePlanResult {
  type: 'TRIPCANVAS_EXTENSION_AI_ROUTE_RESULT'
  requestId: string
  plan?: {
    title: string
    subtitle?: string
    city: string
    canvasRatio?: '3:4' | '4:5' | '9:16'
    places: Array<PlaceSearchCandidate & {
      category: import('./place.ts').PlaceCategory
      note: string
      arrivalMode?: 'walking' | 'driving'
    }>
    geometry: Array<{ lat: number; lng: number }>
    distanceMeters: number
    durationSeconds: number
    warning?: string
    segments: Array<{
      travelMode: 'walking' | 'driving'
      geometry: Array<{ lat: number; lng: number }>
    }>
  }
  error?: string
}

export interface ExtensionPlaceSearchRequest {
  type: 'TRIPCANVAS_EXTENSION_SEARCH_PLACES'
  requestId: string
  query: string
}

export interface ExtensionPlaceSearchResult {
  type: 'TRIPCANVAS_EXTENSION_SEARCH_RESULT'
  requestId: string
  candidates?: PlaceSearchCandidate[]
  error?: string
}

export interface ExtensionRoutePreviewRequest {
  type: 'TRIPCANVAS_EXTENSION_CALCULATE_ROUTE'
  requestId: string
  travelMode: 'walking' | 'driving'
  places: Array<{ name: string; lat: number; lng: number; arrivalMode?: 'walking' | 'driving' }>
}

export interface ExtensionRoutePreviewResult {
  type: 'TRIPCANVAS_EXTENSION_ROUTE_RESULT'
  requestId: string
  geometry?: Array<{ lat: number; lng: number }>
  distanceMeters?: number
  durationSeconds?: number
  warning?: string
  segments?: Array<{
    travelMode: 'walking' | 'driving'
    geometry: Array<{ lat: number; lng: number }>
  }>
  error?: string
}
