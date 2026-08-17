import type { GeocodingResult } from '../../types/geocoding.ts'
import type { Place } from '../../types/place.ts'

export type GeocodingSelections = Record<number, Place>

export function getResolvedPlaces(
  results: GeocodingResult[],
  selections: GeocodingSelections,
): Place[] {
  return results.flatMap((result, index) => {
    if (result.status === 'resolved' && result.place) {
      return [result.place]
    }

    const selection = selections[index]
    return selection ? [selection] : []
  })
}

export function getPendingSelectionIndexes(
  results: GeocodingResult[],
  selections: GeocodingSelections,
): number[] {
  return results.flatMap((result, index) =>
    result.status === 'needs-selection' && !selections[index] ? [index] : [],
  )
}
