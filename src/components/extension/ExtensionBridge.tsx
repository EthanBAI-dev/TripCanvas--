import { useEffect } from 'react'
import { searchGooglePlaces } from '../../services/google/searchGooglePlaces.ts'
import { useProjectStore } from '../../store/projectStore.ts'
import type { ExtensionPlaceSearchRequest, ExtensionPlaceSearchResult } from '../../types/placeSearch.ts'

function isSearchRequest(value: unknown): value is ExtensionPlaceSearchRequest {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<ExtensionPlaceSearchRequest>
  return candidate.type === 'TRIPCANVAS_EXTENSION_SEARCH_PLACES'
    && typeof candidate.requestId === 'string'
    && typeof candidate.query === 'string'
    && candidate.query.trim().length > 0
    && candidate.query.length <= 200
}

export function ExtensionBridge() {
  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== window || event.origin !== window.location.origin || !isSearchRequest(event.data)) return
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
