import type { Annotation } from '../../types/annotation.ts'
import type { Place } from '../../types/place.ts'
import { createId } from '../../utils/id.ts'

export function createPlaceAnnotations(places: Place[]): Annotation[] {
  return places.flatMap((place, index) => {
    const number = String(index + 1)

    return [
      {
        id: createId('annotation'),
        type: 'pin' as const,
        lng: place.lng,
        lat: place.lat,
        text: number,
        placeId: place.id,
        style: {
          backgroundColor: '#0f9d94',
          color: '#ffffff',
          fontSize: 12,
          fontWeight: 'bold' as const,
        },
      },
      {
        id: createId('annotation'),
        type: 'label' as const,
        lng: place.lng,
        lat: place.lat,
        text: place.name,
        placeId: place.id,
        style: {
          backgroundColor: '#ffffff',
          color: '#17343d',
          fontSize: 13,
          fontWeight: 'bold' as const,
          borderRadius: 10,
        },
      },
    ]
  })
}
