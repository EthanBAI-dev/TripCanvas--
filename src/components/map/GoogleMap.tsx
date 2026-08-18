import { useEffect, useRef } from 'react'
import { loadGoogleMapsLibrary } from '../../services/google/googleMapsLoader.ts'
import type { CanvasMapController } from '../../types/map.ts'
import type { MapDetail, MapView } from '../../types/project.ts'
import { GOOGLE_MAP_STYLES } from '../../services/google/googleMapStyle.ts'

interface GoogleMapProps {
  mapView: MapView
  mapDetail: MapDetail
  onMapReady: (map: CanvasMapController | null) => void
  onMapRender: () => void
  onMapViewChange: (mapView: MapView) => void
}

const VIEW_EPSILON = 0.000001

function matchesMapView(map: google.maps.Map, mapView: MapView): boolean {
  const center = map.getCenter()
  if (!center) {
    return false
  }

  return (
    Math.abs(center.lng() - mapView.center.lng) < VIEW_EPSILON &&
    Math.abs(center.lat() - mapView.center.lat) < VIEW_EPSILON &&
    Math.abs((map.getZoom() ?? 0) - mapView.zoom) < VIEW_EPSILON &&
    Math.abs((map.getHeading() ?? 0) - (mapView.bearing ?? 0)) < VIEW_EPSILON &&
    Math.abs((map.getTilt() ?? 0) - (mapView.pitch ?? 0)) < VIEW_EPSILON
  )
}

export function GoogleMap({ mapView, mapDetail, onMapReady, onMapRender, onMapViewChange }: GoogleMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const initialMapViewRef = useRef(mapView)
  const mapRef = useRef<google.maps.Map | null>(null)
  const onMapRenderRef = useRef(onMapRender)
  const onMapViewChangeRef = useRef(onMapViewChange)

  useEffect(() => {
    onMapRenderRef.current = onMapRender
  }, [onMapRender])

  useEffect(() => {
    onMapViewChangeRef.current = onMapViewChange
  }, [onMapViewChange])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return undefined
    }

    let disposed = false
    let overlay: google.maps.OverlayView | null = null
    let controller: CanvasMapController | null = null
    let listeners: google.maps.MapsEventListener[] = []

    void loadGoogleMapsLibrary().then(({ Map }) => {
      if (disposed) {
        return
      }

      const initial = initialMapViewRef.current
      const map = new Map(container, {
        center: { lat: initial.center.lat, lng: initial.center.lng },
        clickableIcons: false,
        fullscreenControl: false,
        gestureHandling: 'greedy',
        heading: initial.bearing ?? 0,
        mapTypeControl: false,
        styles: GOOGLE_MAP_STYLES[mapDetail],
        streetViewControl: false,
        tilt: initial.pitch ?? 0,
        zoom: initial.zoom,
      })
      mapRef.current = map

      overlay = new google.maps.OverlayView()
      overlay.onAdd = () => undefined
      overlay.onRemove = () => undefined
      overlay.draw = () => {
        const projection = overlay?.getProjection()
        if (!projection) {
          return
        }

        if (!controller) {
          controller = {
            project: (lngLat) => {
              const point = projection.fromLatLngToContainerPixel(
                new google.maps.LatLng(lngLat.lat, lngLat.lng),
              )
              return { x: point?.x ?? 0, y: point?.y ?? 0 }
            },
            unproject: (point) => {
              const lngLat = projection.fromContainerPixelToLatLng(
                new google.maps.Point(point.x, point.y),
              )
              return {
                lng: lngLat?.lng() ?? initial.center.lng,
                lat: lngLat?.lat() ?? initial.center.lat,
              }
            },
            flyTo: (lngLat, zoom) => {
              map.panTo({ lat: lngLat.lat, lng: lngLat.lng })
              map.setZoom(zoom)
            },
            fitBounds: (locations) => {
              const bounds = new google.maps.LatLngBounds()
              locations.forEach((location) => bounds.extend({ lat: location.lat, lng: location.lng }))
              map.fitBounds(bounds, { top: 130, right: 80, bottom: 130, left: 80 })
            },
          }
          onMapReady(controller)
        }

        onMapRenderRef.current()
      }
      overlay.setMap(map)

      listeners = [
        map.addListener('bounds_changed', () => onMapRenderRef.current()),
        map.addListener('idle', () => {
          const center = map.getCenter()
          if (!center) {
            return
          }

          onMapViewChangeRef.current({
            center: { lng: center.lng(), lat: center.lat() },
            zoom: map.getZoom() ?? initial.zoom,
            bearing: map.getHeading() ?? 0,
            pitch: map.getTilt() ?? 0,
          })
        }),
      ]
    })

    return () => {
      disposed = true
      listeners.forEach((listener) => listener.remove())
      overlay?.setMap(null)
      mapRef.current = null
      onMapReady(null)
    }
  }, [onMapReady])

  useEffect(() => {
    mapRef.current?.setOptions({ styles: GOOGLE_MAP_STYLES[mapDetail] })
  }, [mapDetail])

  useEffect(() => {
    const map = mapRef.current
    if (!map || matchesMapView(map, mapView)) {
      return
    }

    map.moveCamera({
      center: { lat: mapView.center.lat, lng: mapView.center.lng },
      heading: mapView.bearing ?? 0,
      tilt: mapView.pitch ?? 0,
      zoom: mapView.zoom,
    })
  }, [mapView])

  return <div aria-label="Google 旅行地图" className="tripcanvas-map" ref={containerRef} role="application" />
}
