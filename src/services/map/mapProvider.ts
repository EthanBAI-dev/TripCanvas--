import { hasGoogleMapsApiKey } from '../google/googleMapsLoader.ts'

export type MapProvider = 'maplibre' | 'google'

const requestedProvider = import.meta.env.VITE_MAP_PROVIDER?.trim().toLocaleLowerCase()

export const mapProvider: MapProvider =
  requestedProvider === 'google' && hasGoogleMapsApiKey ? 'google' : 'maplibre'

export const mapProviderLabel =
  requestedProvider === 'google'
    ? hasGoogleMapsApiKey
      ? 'Google 地图'
      : 'Google 地图未配置，使用 MapLibre'
    : 'MapLibre 地图'
