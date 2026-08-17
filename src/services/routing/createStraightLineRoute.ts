import type { Place } from '../../types/place.ts'
import type { Route, TravelMode } from '../../types/route.ts'
import { createId } from '../../utils/id.ts'

const EARTH_RADIUS_METERS = 6_371_000

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function distanceBetween(first: Place, second: Place): number {
  const latitudeDelta = toRadians(second.lat - first.lat)
  const longitudeDelta = toRadians(second.lng - first.lng)
  const latitudeA = toRadians(first.lat)
  const latitudeB = toRadians(second.lat)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

const APPROXIMATE_SPEED_METERS_PER_SECOND: Record<TravelMode, number> = {
  walking: 1.2,
  driving: 8.3,
  cycling: 4.2,
  transit: 7,
}

export function createStraightLineRoute(
  places: Place[],
  travelMode: TravelMode = 'walking',
): Route | null {
  if (places.length < 2) {
    return null
  }

  const legs = places.slice(1).map((place, index) => {
    const fromPlace = places[index]
    const distanceMeters = distanceBetween(fromPlace, place)

    return {
      id: createId('leg'),
      fromPlaceId: fromPlace.id,
      toPlaceId: place.id,
      geometry: [
        { lng: fromPlace.lng, lat: fromPlace.lat },
        { lng: place.lng, lat: place.lat },
      ],
      distanceMeters: Math.round(distanceMeters),
      durationSeconds: Math.round(distanceMeters / APPROXIMATE_SPEED_METERS_PER_SECOND[travelMode]),
    }
  })
  const distanceMeters = legs.reduce((total, leg) => total + leg.distanceMeters, 0)
  const durationSeconds = legs.reduce((total, leg) => total + leg.durationSeconds, 0)

  return {
    id: createId('route'),
    name: '我的旅行路线',
    travelMode,
    placeIds: places.map((place) => place.id),
    geometry: places.map(({ lng, lat }) => ({ lng, lat })),
    distanceMeters: Math.round(distanceMeters),
    durationSeconds,
    legs,
    source: 'straight-line',
    style: {
      color: '#0f9d94',
      width: 4,
      dashed: false,
      showArrow: true,
    },
  }
}
