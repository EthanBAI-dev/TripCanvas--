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
    fields: ['id', 'displayName', 'formattedAddress', 'location', 'googleMapsURI', 'photos'],
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

    const photo = place.photos?.[0]
    return [{
      id: place.id,
      name,
      address: place.formattedAddress ?? undefined,
      lat,
      lng,
      externalUrl: place.googleMapsURI ?? undefined,
      imageUrl: photo?.getURI({ maxHeight: 900, maxWidth: 1200 }),
      imageSourceUrl: photo?.googleMapsURI ?? place.googleMapsURI ?? undefined,
      imageAttributions: photo?.authorAttributions.map((attribution) => ({
          displayName: attribution.displayName,
          uri: attribution.uri ?? undefined,
          photoUri: attribution.photoURI ?? undefined,
        })),
    }]
  })
}
