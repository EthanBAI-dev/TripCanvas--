import type { LngLat } from '../../types/geo.ts'
import type { PlaceSearchCandidate } from '../../types/placeSearch.ts'
import { loadGooglePlacesLibrary } from './googleMapsLoader.ts'

export async function searchGooglePlaces(
  query: string,
  locationBias: LngLat,
): Promise<PlaceSearchCandidate[]> {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) {
    return []
  }

  const { Place } = await loadGooglePlacesLibrary()
  const { places } = await Place.searchByText({
    fields: ['id', 'displayName', 'formattedAddress', 'location', 'googleMapsURI'],
    language: 'zh-CN',
    locationBias: { lat: locationBias.lat, lng: locationBias.lng },
    maxResultCount: 5,
    region: 'jp',
    textQuery: normalizedQuery,
  })

  return places.flatMap((place) => {
    const location = place.location
    const name = place.displayName?.trim()
    if (!location || !name || !place.id) {
      return []
    }

    const lat = location.lat()
    const lng = location.lng()
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return []
    }

    return [{
      id: place.id,
      name,
      address: place.formattedAddress ?? undefined,
      lat,
      lng,
      externalUrl: place.googleMapsURI ?? undefined,
    }]
  })
}
