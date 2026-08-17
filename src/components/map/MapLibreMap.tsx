import { useEffect, useRef, useState } from 'react'
import maplibregl, { type Map as MapLibreMapInstance } from 'maplibre-gl'
import type { CanvasMapController } from '../../types/map.ts'
import type { MapView } from '../../types/project.ts'

const BASEMAP_STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
const VIEW_EPSILON = 0.000001

interface MapLibreMapProps {
  mapView: MapView
  onMapReady: (map: CanvasMapController | null) => void
  onMapRender: () => void
  onMapViewChange: (mapView: MapView) => void
}

function matchesMapView(map: MapLibreMapInstance, mapView: MapView): boolean {
  const center = map.getCenter()

  return (
    Math.abs(center.lng - mapView.center.lng) < VIEW_EPSILON &&
    Math.abs(center.lat - mapView.center.lat) < VIEW_EPSILON &&
    Math.abs(map.getZoom() - mapView.zoom) < VIEW_EPSILON &&
    Math.abs(map.getBearing() - (mapView.bearing ?? 0)) < VIEW_EPSILON &&
    Math.abs(map.getPitch() - (mapView.pitch ?? 0)) < VIEW_EPSILON
  )
}

export function MapLibreMap({ mapView, onMapReady, onMapRender, onMapViewChange }: MapLibreMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const initialMapViewRef = useRef(mapView)
  const mapRef = useRef<MapLibreMapInstance | null>(null)
  const onMapRenderRef = useRef(onMapRender)
  const onMapViewChangeRef = useRef(onMapViewChange)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    onMapViewChangeRef.current = onMapViewChange
  }, [onMapViewChange])

  useEffect(() => {
    onMapRenderRef.current = onMapRender
  }, [onMapRender])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return undefined
    }

    const map = new maplibregl.Map({
      bearing: initialMapViewRef.current.bearing,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      center: [initialMapViewRef.current.center.lng, initialMapViewRef.current.center.lat],
      container,
      pitch: initialMapViewRef.current.pitch,
      style: BASEMAP_STYLE_URL,
      zoom: initialMapViewRef.current.zoom,
    })
    const resizeObserver = new ResizeObserver(() => map.resize())

    mapRef.current = map
    resizeObserver.observe(container)
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')

    const handleLoad = () => {
      setIsLoaded(true)
      const controller: CanvasMapController = {
        project: (lngLat) => {
          const point = map.project([lngLat.lng, lngLat.lat])
          return { x: point.x, y: point.y }
        },
        unproject: (point) => {
          const lngLat = map.unproject([point.x, point.y])
          return { lng: lngLat.lng, lat: lngLat.lat }
        },
        flyTo: (lngLat, zoom) => {
          map.flyTo({ center: [lngLat.lng, lngLat.lat], duration: 500, zoom })
        },
        fitBounds: (locations) => {
          const bounds = new maplibregl.LngLatBounds()
          locations.forEach((location) => bounds.extend([location.lng, location.lat]))
          map.fitBounds(bounds, {
            duration: 500,
            maxZoom: 14,
            padding: { top: 130, right: 80, bottom: 130, left: 80 },
          })
        },
      }

      onMapReady(controller)
      onMapRenderRef.current()
    }
    const handleMoveEnd = () => {
      const center = map.getCenter()

      onMapViewChangeRef.current({
        center: { lng: center.lng, lat: center.lat },
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      })
    }
    const handleRender = () => onMapRenderRef.current()

    map.on('load', handleLoad)
    map.on('moveend', handleMoveEnd)
    map.on('move', handleRender)
    map.on('resize', handleRender)

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      onMapReady(null)
    }
  }, [onMapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isLoaded || matchesMapView(map, mapView)) {
      return
    }

    map.jumpTo({
      center: [mapView.center.lng, mapView.center.lat],
      zoom: mapView.zoom,
      bearing: mapView.bearing,
      pitch: mapView.pitch,
    })
  }, [isLoaded, mapView])

  return <div aria-label="旅行地图" className="tripcanvas-map" ref={containerRef} role="application" />
}
