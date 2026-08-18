import { googleMapsApiKey } from '../../services/google/googleMapsLoader.ts'
import type { ElementSize } from '../../hooks/useElementSize.ts'
import { GOOGLE_STATIC_STYLES } from '../../services/google/googleMapStyle.ts'
import type { MapDetail, MapView } from '../../types/project.ts'

function createStaticMapUrl(mapView: MapView, mapDetail: MapDetail, size: ElementSize): string {
  const longestSide = Math.max(size.width, size.height, 1)
  const scale = Math.min(1, 640 / longestSide)
  const width = Math.max(1, Math.round(size.width * scale))
  const height = Math.max(1, Math.round(size.height * scale))
  const url = new URL('https://maps.googleapis.com/maps/api/staticmap')

  url.searchParams.set('center', `${mapView.center.lat},${mapView.center.lng}`)
  url.searchParams.set('zoom', String(Math.round(mapView.zoom)))
  url.searchParams.set('size', `${width}x${height}`)
  url.searchParams.set('scale', '2')
  url.searchParams.set('format', 'png')
  url.searchParams.set('language', 'zh-CN')
  url.searchParams.set('key', googleMapsApiKey)
  GOOGLE_STATIC_STYLES[mapDetail].forEach((style) => url.searchParams.append('style', style))
  return url.toString()
}

export function GoogleStaticMap({ mapView, mapDetail, size }: { mapView: MapView; mapDetail: MapDetail; size: ElementSize }) {
  if (size.width === 0 || size.height === 0) {
    return null
  }

  return (
    <img
      alt="Google 地图导出底图"
      className="absolute inset-0 size-full object-cover"
      crossOrigin="anonymous"
      data-google-static-map
      src={createStaticMapUrl(mapView, mapDetail, size)}
    />
  )
}
