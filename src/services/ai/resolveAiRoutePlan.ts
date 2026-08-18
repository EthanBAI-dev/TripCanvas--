import type { LngLat } from '../../types/geo.ts'
import type { Place } from '../../types/place.ts'
import type { ExtensionAiRoutePlanResult } from '../../types/placeSearch.ts'
import { searchGooglePlaces } from '../google/searchGooglePlaces.ts'
import { calculateMixedRoute } from '../routing/calculateMixedRoute.ts'
import { planRouteWithAi } from './planRouteWithAi.ts'

type ResolvedPlan = NonNullable<ExtensionAiRoutePlanResult['plan']>

export async function resolveAiRoutePlan(prompt: string, locationBias: LngLat): Promise<ResolvedPlan> {
  const draft = await planRouteWithAi(prompt)
  const resolvedPlaces: ResolvedPlan['places'] = []
  let currentBias = locationBias

  for (const [index, draftPlace] of draft.places.entries()) {
    const query = `${draftPlace.searchQuery ?? draftPlace.name}, ${draft.city}`
    const [candidate] = await searchGooglePlaces(query, currentBias)
    if (!candidate) {
      throw new Error(`无法在 Google Places 中确认「${draftPlace.name}」，当前路线未被修改。`)
    }
    currentBias = { lat: candidate.lat, lng: candidate.lng }
    resolvedPlaces.push({
      ...candidate,
      category: draftPlace.category,
      note: draftPlace.note,
      arrivalMode: index === 0 ? undefined : draftPlace.arrivalMode ?? 'walking',
    })
  }

  const places: Place[] = resolvedPlaces.map((place) => ({
    ...place,
    id: `ai-google-${place.id}`,
    googlePlaceId: place.id,
    category: place.category,
    source: 'google',
  }))
  const fallbackMode = resolvedPlaces[1]?.arrivalMode ?? 'walking'
  const { route, warning } = await calculateMixedRoute(places, fallbackMode)
  if (!route) throw new Error('地点已确认，但 Google Routes 无法生成路线。')

  return {
    title: draft.title,
    subtitle: draft.subtitle,
    city: draft.city,
    canvasRatio: draft.canvasRatio,
    places: resolvedPlaces,
    geometry: route.geometry,
    distanceMeters: route.distanceMeters ?? 0,
    durationSeconds: route.durationSeconds ?? 0,
    warning,
    segments: route.legs.map((leg) => ({
      travelMode: leg.travelMode ?? fallbackMode,
      geometry: leg.geometry,
    })),
  }
}
