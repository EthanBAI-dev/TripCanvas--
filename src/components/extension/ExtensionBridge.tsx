import { useEffect } from 'react'
import { searchGooglePlaces } from '../../services/google/searchGooglePlaces.ts'
import { useProjectStore } from '../../store/projectStore.ts'
import type { ExtensionPlaceSearchRequest, ExtensionPlaceSearchResult } from '../../types/placeSearch.ts'
import type { ExtensionRoutePreviewRequest, ExtensionRoutePreviewResult } from '../../types/placeSearch.ts'
import { calculateRoute } from '../../services/routing/calculateRoute.ts'
import type { Place } from '../../types/place.ts'

function isSearchRequest(value: unknown): value is ExtensionPlaceSearchRequest {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<ExtensionPlaceSearchRequest>
  return candidate.type === 'TRIPCANVAS_EXTENSION_SEARCH_PLACES'
    && typeof candidate.requestId === 'string'
    && typeof candidate.query === 'string'
    && candidate.query.trim().length > 0
    && candidate.query.length <= 200
}

function isRouteRequest(value: unknown): value is ExtensionRoutePreviewRequest {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<ExtensionRoutePreviewRequest>
  return candidate.type === 'TRIPCANVAS_EXTENSION_CALCULATE_ROUTE'
    && typeof candidate.requestId === 'string'
    && (candidate.travelMode === 'walking' || candidate.travelMode === 'driving')
    && Array.isArray(candidate.places)
    && candidate.places.length >= 2
    && candidate.places.length <= 27
    && candidate.places.every((place) =>
      typeof place?.name === 'string'
      && place.name.trim().length > 0
      && Number.isFinite(place.lat)
      && Number.isFinite(place.lng),
    )
}

function toPreviewPlaces(request: ExtensionRoutePreviewRequest): Place[] {
  return request.places.map((place, index) => ({
    id: `extension-preview-${index}`,
    name: place.name.trim(),
    lat: place.lat,
    lng: place.lng,
    category: index === 0 ? 'start' : index === request.places.length - 1 ? 'end' : 'custom',
    source: 'google',
  }))
}

export function ExtensionBridge() {
  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== window || event.origin !== window.location.origin) return

      if (isRouteRequest(event.data)) {
        const request = event.data
        void calculateRoute(toPreviewPlaces(request), request.travelMode)
          .then(({ route, warning }) => {
            const result: ExtensionRoutePreviewResult = {
              type: 'TRIPCANVAS_EXTENSION_ROUTE_RESULT',
              requestId: request.requestId,
              geometry: route?.geometry,
              distanceMeters: route?.distanceMeters,
              durationSeconds: route?.durationSeconds,
              warning,
            }
            window.postMessage(result, window.location.origin)
          })
          .catch((error: unknown) => {
            const result: ExtensionRoutePreviewResult = {
              type: 'TRIPCANVAS_EXTENSION_ROUTE_RESULT',
              requestId: request.requestId,
              error: error instanceof Error ? error.message : '路线预览计算失败。',
            }
            window.postMessage(result, window.location.origin)
          })
        return
      }

      if (!isSearchRequest(event.data)) return
      const request = event.data

      void searchGooglePlaces(request.query, useProjectStore.getState().project.mapView.center)
        .then((candidates) => {
          const result: ExtensionPlaceSearchResult = {
            type: 'TRIPCANVAS_EXTENSION_SEARCH_RESULT',
            requestId: request.requestId,
            candidates,
          }
          window.postMessage(result, window.location.origin)
        })
        .catch((error: unknown) => {
          const result: ExtensionPlaceSearchResult = {
            type: 'TRIPCANVAS_EXTENSION_SEARCH_RESULT',
            requestId: request.requestId,
            error: error instanceof Error ? error.message : 'Google Places 搜索失败。',
          }
          window.postMessage(result, window.location.origin)
        })
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return null
}
