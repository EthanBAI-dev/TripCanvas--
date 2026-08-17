import type { RoutingAdapter } from '../../types/routing.ts'
import { loadGoogleRoutesLibrary } from '../google/googleMapsLoader.ts'

function toTravelMode(mode: 'walking' | 'driving'): google.maps.TravelModeString {
  return mode === 'driving' ? 'DRIVING' : 'WALKING'
}

function toLngLat(point: google.maps.LatLngAltitude): { lng: number; lat: number } {
  return { lng: point.lng, lat: point.lat }
}

export function createGoogleRoutingAdapter(): RoutingAdapter {
  return {
    source: 'google',
    calculateRoute: async ({ places, travelMode }) => {
      const { Route } = await loadGoogleRoutesLibrary()
      const destination = places.at(-1)
      if (!destination) {
        throw new Error('Google Routes 至少需要两个地点。')
      }

      let result: { routes: google.maps.routes.Route[] | undefined }
      try {
        result = await Route.computeRoutes({
          destination: { lat: destination.lat, lng: destination.lng },
          fields: ['path', 'distanceMeters', 'durationMillis', 'legs'],
          intermediates: places.slice(1, -1).map((place) => ({
            location: { lat: place.lat, lng: place.lng },
          })),
          origin: { lat: places[0].lat, lng: places[0].lng },
          polylineQuality: 'HIGH_QUALITY',
          travelMode: toTravelMode(travelMode),
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : ''
        if (message.includes('Rpc failed due to xhr error')) {
          throw new Error(
            'Google Routes 请求被拒绝。请确认 Cloud 项目已启用 Routes API，且 Key 的 API 限制允许 Routes API。',
          )
        }
        throw error
      }
      const route = result.routes?.[0]

      if (!route?.path || !route.legs || route.legs.length !== places.length - 1) {
        throw new Error('Google Routes 没有返回完整的多点路线。')
      }

      return {
        geometry: route.path.map(toLngLat),
        distanceMeters: Math.round(route.distanceMeters ?? 0),
        durationSeconds: Math.round((route.durationMillis ?? 0) / 1_000),
        legs: route.legs.map((leg, index) => ({
          id: `leg-${index + 1}`,
          fromPlaceId: places[index].id,
          toPlaceId: places[index + 1].id,
          geometry: leg.path.map(toLngLat),
          distanceMeters: Math.round(leg.distanceMeters),
          durationSeconds: Math.round((leg.durationMillis ?? 0) / 1_000),
        })),
      }
    },
  }
}
