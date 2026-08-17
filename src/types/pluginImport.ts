import type { PlaceCategory } from './place.ts'
import type { RoutableTravelMode } from './routing.ts'

export const PLUGIN_ROUTE_IMPORT_TYPE = 'TRIPCANVAS_IMPORT_ROUTE' as const

export interface PluginPlaceInput {
  name: string
  address?: string
  category?: PlaceCategory
  note?: string
  lat: number
  lng: number
  externalUrl?: string
  googlePlaceId?: string
}

export interface PluginRouteImportPayload {
  title?: string
  city?: string
  travelMode: RoutableTravelMode
  places: PluginPlaceInput[]
}

export interface PluginRouteImportMessage {
  type: typeof PLUGIN_ROUTE_IMPORT_TYPE
  payload: PluginRouteImportPayload
}
