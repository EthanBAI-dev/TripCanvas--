import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { useElementSize } from '../../hooks/useElementSize.ts'
import { mapProvider } from '../../services/map/mapProvider.ts'
import { useEditorStore } from '../../store/editorStore.ts'
import { useProjectStore } from '../../store/projectStore.ts'
import type { CanvasMapController } from '../../types/map.ts'
import { createId } from '../../utils/id.ts'
import { screenToLngLat } from '../../utils/coordinates.ts'
import { MapLibreMap } from '../map/MapLibreMap.tsx'
import { GoogleMap } from '../map/GoogleMap.tsx'
import { GoogleStaticMap } from '../map/GoogleStaticMap.tsx'
import { AnnotationLayer } from './AnnotationLayer.tsx'

export function MapStage() {
  const mapView = useProjectStore((state) => state.project.mapView)
  const mapDetail = useProjectStore((state) => state.project.mapDetail)
  const places = useProjectStore((state) => state.project.places)
  const routes = useProjectStore((state) => state.project.routes)
  const annotations = useProjectStore((state) => state.project.annotations)
  const setMapView = useProjectStore((state) => state.setMapView)
  const addAnnotation = useProjectStore((state) => state.addAnnotation)
  const updateAnnotation = useProjectStore((state) => state.updateAnnotation)
  const fitBoundsRequest = useEditorStore((state) => state.fitBoundsRequest)
  const currentTool = useEditorStore((state) => state.currentTool)
  const isExporting = useEditorStore((state) => state.isExporting)
  const selectedId = useEditorStore((state) => state.selectedId)
  const setCurrentTool = useEditorStore((state) => state.setCurrentTool)
  const setMapReady = useEditorStore((state) => state.setMapReady)
  const setSelectedId = useEditorStore((state) => state.setSelectedId)
  const [map, setMap] = useState<CanvasMapController | null>(null)
  const [renderVersion, setRenderVersion] = useState(0)
  const [stageRef, size] = useElementSize<HTMLDivElement>()
  const requestRender = useCallback(() => setRenderVersion((version) => version + 1), [])
  const handleMapReady = useCallback(
    (instance: CanvasMapController | null) => {
      setMap(instance)
      setMapReady(instance !== null)
    },
    [setMapReady],
  )

  const handleTextToolClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (!map) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const lngLat = screenToLngLat(map, {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    })
    const annotationId = createId('annotation')

    addAnnotation({
      id: annotationId,
      type: 'note',
      lng: lngLat.lng,
      lat: lngLat.lat,
      text: '点击编辑文字',
      style: {
        backgroundColor: '#ffffff',
        color: '#17343d',
        fontSize: 16,
        fontWeight: 'bold',
        borderRadius: 12,
      },
    })
    setSelectedId(annotationId)
    setCurrentTool('select')
  }

  useEffect(() => {
    if (!map || fitBoundsRequest === 0 || places.length === 0) {
      return
    }

    if (places.length === 1) {
      map.flyTo(places[0], 14)
      return
    }

    map.fitBounds(places)
  }, [fitBoundsRequest, map, places])

  return (
    <div className="absolute inset-0 overflow-hidden" ref={stageRef}>
      {mapProvider === 'google' ? (
        <div
          className={`absolute inset-0 ${isExporting ? 'invisible' : ''}`}
          data-export-ignore={isExporting ? true : undefined}
        >
          <GoogleMap
            mapDetail={mapDetail}
            mapView={mapView}
            onMapReady={handleMapReady}
            onMapRender={requestRender}
            onMapViewChange={setMapView}
          />
        </div>
      ) : (
        <MapLibreMap
          mapView={mapView}
          onMapReady={handleMapReady}
          onMapRender={requestRender}
          onMapViewChange={setMapView}
        />
      )}
      {mapProvider === 'google' && isExporting ? <GoogleStaticMap mapDetail={mapDetail} mapView={mapView} size={size} /> : null}
      {currentTool === 'text' ? (
        <button
          aria-label="在地图上添加文字"
          className="absolute inset-0 z-10 cursor-text bg-transparent"
          onClick={handleTextToolClick}
          type="button"
        />
      ) : null}
      <AnnotationLayer
        annotations={annotations}
        isExporting={isExporting}
        map={map}
        onAnnotationMove={(id, lngLat) => updateAnnotation(id, lngLat)}
        onAnnotationSelect={setSelectedId}
        places={places}
        renderVersion={renderVersion}
        routes={routes}
        selectedId={selectedId}
        size={size}
      />
    </div>
  )
}
