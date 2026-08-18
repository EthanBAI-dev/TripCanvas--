export interface PlaceSearchCandidate {
  id: string
  name: string
  address?: string
  lat: number
  lng: number
  externalUrl?: string
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
