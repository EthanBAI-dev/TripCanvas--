import { importLibrary, setOptions } from '@googlemaps/js-api-loader'

const environment = import.meta.env ?? {}

export const googleMapsApiKey = environment.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? ''
export const hasGoogleMapsApiKey = googleMapsApiKey.length > 0

if (hasGoogleMapsApiKey) {
  setOptions({
    key: googleMapsApiKey,
    language: 'zh-CN',
    region: 'JP',
    v: 'weekly',
  })
}

function assertGoogleMapsConfigured(): void {
  if (!hasGoogleMapsApiKey) {
    throw new Error('尚未配置 VITE_GOOGLE_MAPS_API_KEY。')
  }
}

export async function loadGoogleMapsLibrary(): Promise<google.maps.MapsLibrary> {
  assertGoogleMapsConfigured()
  return importLibrary('maps') as Promise<google.maps.MapsLibrary>
}

export async function loadGoogleRoutesLibrary(): Promise<google.maps.RoutesLibrary> {
  assertGoogleMapsConfigured()
  return importLibrary('routes') as Promise<google.maps.RoutesLibrary>
}
