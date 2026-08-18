import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Arrow, Circle, Group, Layer, Line, Rect, Stage, Text } from 'react-konva'
import type { ElementSize } from '../../hooks/useElementSize.ts'
import type { Annotation } from '../../types/annotation.ts'
import type { LngLat } from '../../types/geo.ts'
import type { CanvasMapController } from '../../types/map.ts'
import type { Place } from '../../types/place.ts'
import type { Route } from '../../types/route.ts'
import { lngLatToScreen, screenToLngLat } from '../../utils/coordinates.ts'
import { getSafeExternalUrl } from '../../utils/url.ts'

interface AnnotationLayerProps {
  annotations: Annotation[]
  isExporting: boolean
  map: CanvasMapController | null
  onAnnotationMove: (id: string, lngLat: LngLat) => void
  onAnnotationSelect: (id: string) => void
  places: Place[]
  renderVersion: number
  routes: Route[]
  selectedId: string | null
  size: ElementSize
}

function LegTimeOverlay({ map, route }: { map: CanvasMapController; route: Route }) {
  return route.legs?.map((leg) => {
    if (leg.geometry.length === 0) {
      return null
    }

    const middleIndex = Math.floor(leg.geometry.length / 2)
    const middle =
      leg.geometry.length === 2
        ? {
            lng: (leg.geometry[0].lng + leg.geometry[1].lng) / 2,
            lat: (leg.geometry[0].lat + leg.geometry[1].lat) / 2,
          }
        : leg.geometry[middleIndex]
    const point = lngLatToScreen(map, middle)
    const modeText = leg.travelMode === 'driving' ? '驾车' : leg.travelMode === 'walking' ? '步行' : ''
    const text = `${modeText ? `${modeText} · ` : ''}${Math.max(1, Math.round(leg.durationSeconds / 60))} 分钟`
    const width = Math.max(58, text.length * 12 + 18)

    return (
      <Group key={leg.id} x={point.x - width / 2} y={point.y - 13}>
        <Rect
          cornerRadius={11}
          fill="rgba(255, 255, 255, 0.94)"
          height={24}
          shadowBlur={6}
          shadowColor="rgba(23, 52, 61, 0.18)"
          shadowOpacity={0.25}
          stroke={route.style.color}
          strokeWidth={1}
          width={width}
        />
        <Text
          align="center"
          fill="#17343d"
          fontFamily="DM Sans, Noto Sans SC, sans-serif"
          fontSize={11}
          fontStyle="bold"
          height={24}
          text={text}
          verticalAlign="middle"
          width={width}
        />
      </Group>
    )
  })
}

function RouteOverlay({ map, route }: { map: CanvasMapController; route: Route }) {
  const toPoints = (geometry: Route['geometry']) => geometry.flatMap((coordinate) => {
    const screenPoint = lngLatToScreen(map, coordinate)
    return [screenPoint.x, screenPoint.y]
  })
  const legModes = new Set(route.legs.map((leg) => leg.travelMode).filter(Boolean))

  if (legModes.size > 1) {
    return (
      <Group>
        {route.legs.map((leg) => {
          const color = leg.travelMode === 'driving' ? '#0f766e' : '#0284c7'
          const segmentProps = {
            dash: leg.travelMode === 'walking' ? [10, 6] : undefined,
            lineCap: 'round' as const,
            lineJoin: 'round' as const,
            points: toPoints(leg.geometry),
            stroke: color,
            strokeWidth: route.style.width,
          }
          return route.style.showArrow ? (
            <Arrow {...segmentProps} fill={color} key={leg.id} pointerLength={10} pointerWidth={10} />
          ) : (
            <Line {...segmentProps} key={leg.id} />
          )
        })}
      </Group>
    )
  }

  const points = toPoints(route.geometry)

  const commonProps = {
    dash: route.style.dashed ? [10, 8] : undefined,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
    points,
    stroke: route.style.color,
    strokeWidth: route.style.width,
  }

  return route.style.showArrow ? (
    <Arrow {...commonProps} fill={route.style.color} pointerLength={10} pointerWidth={10} />
  ) : (
    <Line {...commonProps} />
  )
}

function PinAnnotation({ annotation, map }: { annotation: Annotation; map: CanvasMapController }) {
  if (annotation.lng === undefined || annotation.lat === undefined) {
    return null
  }

  const point = lngLatToScreen(map, { lng: annotation.lng, lat: annotation.lat })
  const fill = annotation.style.backgroundColor ?? '#0f9d94'

  return (
    <Group x={point.x} y={point.y}>
      <Circle fill="rgba(23, 52, 61, 0.16)" radius={14} shadowBlur={6} shadowOpacity={0.12} y={3} />
      <Circle fill={fill} radius={13} stroke="#ffffff" strokeWidth={2} />
      <Text
        align="center"
        fill={annotation.style.color ?? '#ffffff'}
        fontFamily="DM Sans, Noto Sans SC, sans-serif"
        fontSize={annotation.style.fontSize ?? 12}
        fontStyle={annotation.style.fontWeight === 'bold' ? 'bold' : 'normal'}
        height={26}
        text={annotation.text ?? ''}
        verticalAlign="middle"
        width={26}
        x={-13}
        y={-13}
      />
    </Group>
  )
}

function LabelAnnotation({ annotation, map }: { annotation: Annotation; map: CanvasMapController }) {
  if (annotation.lng === undefined || annotation.lat === undefined || !annotation.text) {
    return null
  }

  const point = lngLatToScreen(map, { lng: annotation.lng, lat: annotation.lat })
  const fontSize = annotation.style.fontSize ?? 13
  const width = Math.max(58, annotation.text.length * fontSize + 20)

  return (
    <Group x={point.x + 15} y={point.y - 30}>
      <Rect
        fill={annotation.style.backgroundColor ?? '#ffffff'}
        height={28}
        cornerRadius={annotation.style.borderRadius ?? 10}
        shadowBlur={8}
        shadowColor="rgba(23, 52, 61, 0.16)"
        shadowOpacity={0.24}
        width={width}
      />
      <Text
        fill={annotation.style.color ?? '#17343d'}
        fontFamily="DM Sans, Noto Sans SC, sans-serif"
        fontSize={fontSize}
        fontStyle={annotation.style.fontWeight === 'bold' ? 'bold' : 'normal'}
        height={28}
        padding={10}
        text={annotation.text}
        verticalAlign="middle"
        width={width}
      />
    </Group>
  )
}

function NoteAnnotation({ annotation, map, selected }: { annotation: Annotation; map: CanvasMapController; selected: boolean }) {
  if (annotation.lng === undefined || annotation.lat === undefined || !annotation.text) {
    return null
  }

  const point = lngLatToScreen(map, { lng: annotation.lng, lat: annotation.lat })
  const fontSize = annotation.style.fontSize ?? 16
  const width = Math.max(110, annotation.text.length * fontSize + 28)
  const height = Math.max(38, fontSize + 22)

  return (
    <Group x={point.x} y={point.y}>
      <Rect
        fill={annotation.style.backgroundColor ?? '#ffffff'}
        height={height}
        cornerRadius={annotation.style.borderRadius ?? 12}
        shadowBlur={10}
        shadowColor="rgba(23, 52, 61, 0.16)"
        shadowOpacity={0.25}
        stroke={selected ? '#0f9d94' : undefined}
        strokeWidth={selected ? 2 : 0}
        width={width}
      />
      <Text
        fill={annotation.style.color ?? '#17343d'}
        fontFamily="DM Sans, Noto Sans SC, sans-serif"
        fontSize={fontSize}
        fontStyle={annotation.style.fontWeight === 'bold' ? 'bold' : 'normal'}
        height={height}
        padding={12}
        text={annotation.text}
        verticalAlign="middle"
        width={width}
      />
    </Group>
  )
}

interface DragState {
  anchorX: number
  anchorY: number
  clientX: number
  clientY: number
}

function EditableTextHandle({
  annotation,
  map,
  onAnnotationMove,
  onAnnotationSelect,
}: {
  annotation: Annotation
  map: CanvasMapController
  onAnnotationMove: (id: string, lngLat: LngLat) => void
  onAnnotationSelect: (id: string) => void
}) {
  const pointerRef = useRef<DragState | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  if (annotation.lng === undefined || annotation.lat === undefined || !annotation.text) {
    return null
  }

  const point = lngLatToScreen(map, { lng: annotation.lng, lat: annotation.lat })
  const fontSize = annotation.style.fontSize ?? 16
  const width = Math.max(110, annotation.text.length * fontSize + 28)
  const height = Math.max(38, fontSize + 22)

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    pointerRef.current = {
      anchorX: point.x,
      anchorY: point.y,
      clientX: event.clientX,
      clientY: event.clientY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    onAnnotationSelect(annotation.id)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const pointer = pointerRef.current
    if (!pointer) {
      return
    }

    setDragOffset({ x: event.clientX - pointer.clientX, y: event.clientY - pointer.clientY })
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const pointer = pointerRef.current
    if (!pointer) {
      return
    }

    const destination = {
      x: pointer.anchorX + event.clientX - pointer.clientX,
      y: pointer.anchorY + event.clientY - pointer.clientY,
    }
    onAnnotationMove(annotation.id, screenToLngLat(map, destination))
    pointerRef.current = null
    setDragOffset({ x: 0, y: 0 })
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <button
      aria-label={`编辑文字：${annotation.text}`}
      className="pointer-events-auto absolute cursor-grab rounded-xl focus:outline-none focus:ring-2 focus:ring-coral active:cursor-grabbing"
      onClick={() => onAnnotationSelect(annotation.id)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        height,
        left: point.x + dragOffset.x,
        top: point.y + dragOffset.y,
        width,
      }}
      type="button"
    />
  )
}

function PlaceLabelLink({
  annotation,
  map,
  place,
}: {
  annotation: Annotation
  map: CanvasMapController
  place: Place
}) {
  const externalUrl = getSafeExternalUrl(place.externalUrl)
  if (annotation.lng === undefined || annotation.lat === undefined || !annotation.text || !externalUrl) {
    return null
  }

  const point = lngLatToScreen(map, { lng: annotation.lng, lat: annotation.lat })
  const fontSize = annotation.style.fontSize ?? 13
  const width = Math.max(68, annotation.text.length * fontSize + 34)

  return (
    <a
      aria-label={`在 Google Maps 中打开 ${place.name}`}
      className="pointer-events-auto absolute flex h-7 items-center truncate rounded-[10px] bg-white px-2.5 text-xs font-bold text-ink shadow-sm outline-none hover:ring-2 hover:ring-coral focus:ring-2 focus:ring-coral"
      href={externalUrl}
      rel="noreferrer"
      style={{ left: point.x + 15, top: point.y - 30, width }}
      target="_blank"
    >
      <span className="truncate">{annotation.text}</span>
      <span aria-hidden="true" className="ml-1 shrink-0 text-coral-dark">↗</span>
    </a>
  )
}

export function AnnotationLayer({
  annotations,
  isExporting,
  map,
  onAnnotationMove,
  onAnnotationSelect,
  places,
  renderVersion,
  routes,
  selectedId,
  size,
}: AnnotationLayerProps) {
  if (size.width === 0 || size.height === 0) {
    return null
  }

  return (
    <div className="pointer-events-none absolute inset-0" data-testid="annotation-layer">
      <Stage height={size.height} listening={false} width={size.width}>
        <Layer key={renderVersion} listening={false}>
          {map ? routes.map((route) => <RouteOverlay key={route.id} map={map} route={route} />) : null}
          {map ? routes.map((route) => <LegTimeOverlay key={`legs-${route.id}`} map={map} route={route} />) : null}
          {map
            ? annotations
                .filter((annotation) => annotation.type === 'pin')
                .map((annotation) => <PinAnnotation annotation={annotation} key={annotation.id} map={map} />)
            : null}
          {map
            ? annotations
                .filter((annotation) => annotation.type === 'label')
                .map((annotation) => <LabelAnnotation annotation={annotation} key={annotation.id} map={map} />)
            : null}
          {map
            ? annotations
                .filter((annotation) => annotation.type === 'note')
                .map((annotation) => (
                  <NoteAnnotation
                    annotation={annotation}
                    key={annotation.id}
                    map={map}
                    selected={!isExporting && annotation.id === selectedId}
                  />
                ))
            : null}
        </Layer>
      </Stage>
      {!isExporting && map
        ? annotations
            .filter((annotation) => annotation.type === 'label')
            .flatMap((annotation) => {
              const place = places.find((candidate) => candidate.id === annotation.placeId)
              return place && getSafeExternalUrl(place.externalUrl)
                ? [<PlaceLabelLink annotation={annotation} key={annotation.id} map={map} place={place} />]
                : []
            })
        : null}
      {map
        ? annotations
            .filter((annotation) => annotation.type === 'note')
            .map((annotation) => (
              <EditableTextHandle
                annotation={annotation}
                key={annotation.id}
                map={map}
                onAnnotationMove={onAnnotationMove}
                onAnnotationSelect={onAnnotationSelect}
              />
            ))
        : null}
    </div>
  )
}
