import type { MapDetail } from '../../types/project.ts'

const HIDDEN_LABEL: google.maps.MapTypeStyle = {
  elementType: 'labels',
  stylers: [{ visibility: 'off' }],
}

export const GOOGLE_MAP_STYLES: Record<MapDetail, google.maps.MapTypeStyle[] | undefined> = {
  standard: undefined,
  clean: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  ],
  minimal: [
    HIDDEN_LABEL,
    { featureType: 'road', elementType: 'geometry', stylers: [{ saturation: -60 }, { lightness: 20 }] },
  ],
}

export const GOOGLE_STATIC_STYLES: Record<MapDetail, string[]> = {
  standard: [],
  clean: ['feature:poi|element:labels|visibility:off', 'feature:transit|element:labels|visibility:off'],
  minimal: ['element:labels|visibility:off', 'feature:road|element:geometry|saturation:-60|lightness:20'],
}
