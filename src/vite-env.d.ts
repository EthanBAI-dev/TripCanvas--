/// <reference types="vite/client" />
/// <reference types="google.maps" />

interface ImportMetaEnv {
  readonly VITE_GEOCODING_PROVIDER?: 'mock' | 'nominatim'
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
  readonly VITE_MAP_PROVIDER?: 'maplibre' | 'google'
  readonly VITE_NOMINATIM_BASE_URL?: string
  readonly VITE_ROUTING_PROVIDER?: 'straight' | 'osrm' | 'google'
  readonly VITE_ROUTING_API_BASE_URL?: string
  readonly VITE_OSRM_DRIVING_PROFILE?: string
  readonly VITE_OSRM_WALKING_PROFILE?: string
  readonly VITE_AI_ROUTE_ENDPOINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
