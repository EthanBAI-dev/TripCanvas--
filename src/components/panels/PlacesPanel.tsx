import { useState } from 'react'
import { geocodePlaces } from '../../services/geocoding/geocodePlaces.ts'
import {
  geocodingProvider,
  geocodingProviderLabel,
} from '../../services/geocoding/geocodingProvider.ts'
import {
  getPendingSelectionIndexes,
  getResolvedPlaces,
  type GeocodingSelections,
} from '../../services/geocoding/resolveGeocodingResults.ts'
import { createPlaceAnnotations } from '../../services/project/createPlaceAnnotations.ts'
import { calculateRoute } from '../../services/routing/calculateRoute.ts'
import { routingProviderLabel } from '../../services/routing/routingProvider.ts'
import { mapProviderLabel } from '../../services/map/mapProvider.ts'
import { useEditorStore } from '../../store/editorStore.ts'
import { useProjectStore } from '../../store/projectStore.ts'
import type { GeocodingResult } from '../../types/geocoding.ts'
import type { Place, PlaceCategory } from '../../types/place.ts'
import type { RoutableTravelMode } from '../../types/routing.ts'
import { Button } from '../ui/Button.tsx'
import { GeocodingCandidates } from './GeocodingCandidates.tsx'
import { PanelSection } from './PanelSection.tsx'

type SearchStatus = 'idle' | 'searching' | 'routing' | 'needs-selection' | 'success' | 'error'

function categoryForIndex(index: number, total: number): PlaceCategory {
  if (index === 0) {
    return 'start'
  }

  if (index === total - 1 && total > 1) {
    return 'end'
  }

  return 'custom'
}

export function PlacesPanel() {
  const [placesText, setPlacesText] = useState('东京站\n银座\n筑地市场\n东京塔')
  const [status, setStatus] = useState<SearchStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [pendingResults, setPendingResults] = useState<GeocodingResult[]>([])
  const [selections, setSelections] = useState<GeocodingSelections>({})
  const [travelMode, setTravelMode] = useState<RoutableTravelMode>('walking')
  const setGeneratedMapContent = useProjectStore((state) => state.setGeneratedMapContent)
  const requestFitBounds = useEditorStore((state) => state.requestFitBounds)
  const setSelectedId = useEditorStore((state) => state.setSelectedId)
  const placeCount = placesText.split('\n').filter((name) => name.trim()).length

  const generatePlaces = async (
    results: GeocodingResult[],
    selectedCandidates: GeocodingSelections,
  ) => {
    const places = getResolvedPlaces(results, selectedCandidates)
    const unresolvedNames = results
      .filter((result) => result.status === 'unresolved')
      .map((result) => result.query.name)

    if (places.length === 0) {
      throw new Error(`没有找到可用的演示地点：${unresolvedNames.join('、')}`)
    }

    setStatus('routing')
    const routeResult = await calculateRoute(places, travelMode)

    setGeneratedMapContent({
      places,
      route: routeResult.route,
      annotations: createPlaceAnnotations(places),
    })
    setSelectedId(null)
    requestFitBounds()
    setPendingResults([])
    setSelections({})
    setStatus('success')
    const generatedMessage =
      unresolvedNames.length > 0
        ? `已解析 ${places.length} 个；未解析：${unresolvedNames.join('、')}`
        : `已解析并生成 ${places.length} 个地点。`
    setMessage(
      routeResult.warning ? `${generatedMessage} ${routeResult.warning}` : generatedMessage,
    )
  }

  const handleGenerate = async () => {
    const names = placesText
      .split('\n')
      .map((name) => name.trim())
      .filter(Boolean)

    setStatus('searching')
    setMessage(null)
    setPendingResults([])
    setSelections({})

    try {
      const results = await geocodePlaces(
        names.map((name, index) => ({
          city: 'Tokyo',
          name,
          category: categoryForIndex(index, names.length),
          source: 'manual',
        })),
      )
      const pendingCount = getPendingSelectionIndexes(results, {}).length

      if (pendingCount > 0) {
        setPendingResults(results)
        setStatus('needs-selection')
        setMessage(`有 ${pendingCount} 个地点名称需要确认具体位置。`)
        return
      }

      await generatePlaces(results, {})
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '地点解析失败，请重试。')
    }
  }

  const handleCandidateSelect = (resultIndex: number, place: Place) => {
    setSelections((current) => ({ ...current, [resultIndex]: place }))
  }

  const handleApplyCandidates = async () => {
    if (status === 'routing' || getPendingSelectionIndexes(pendingResults, selections).length > 0) {
      return
    }

    try {
      await generatePlaces(pendingResults, selections)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '地点解析失败，请重试。')
    }
  }

  return (
    <PanelSection title="路线地点" action={<span className="text-xs text-ink-muted">{geocodingProviderLabel}</span>}>
      <p className="mb-2 text-xs leading-5 text-ink-muted">每行一个地点。未知名称会标记为未解析，不再分配错误坐标。</p>
      {geocodingProvider === 'nominatim' ? (
        <p className="mb-2 text-[11px] text-ink-muted">地点数据 © OpenStreetMap contributors</p>
      ) : null}
      <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-sand-50 px-3 py-2">
        <label className="text-xs font-medium text-ink-muted" htmlFor="travel-mode">
          出行方式
        </label>
        <select
          className="rounded-lg border border-sand-200 bg-white px-2.5 py-1.5 text-xs font-medium text-ink outline-none focus:border-coral focus:ring-2 focus:ring-coral/15"
          id="travel-mode"
          onChange={(event) => setTravelMode(event.target.value as RoutableTravelMode)}
          value={travelMode}
        >
          <option value="walking">步行</option>
          <option value="driving">驾车</option>
        </select>
      </div>
      <label className="sr-only" htmlFor="places-list">
        地点列表
      </label>
      <textarea
        className="min-h-36 w-full resize-none rounded-xl border border-sand-200 bg-sand-50 p-3 text-sm leading-6 outline-none transition focus:border-coral focus:ring-2 focus:ring-coral/15"
        id="places-list"
        onChange={(event) => setPlacesText(event.target.value)}
        value={placesText}
      />
      <Button
        className="mt-3 w-full"
        disabled={placeCount === 0 || status === 'searching' || status === 'routing'}
        onClick={handleGenerate}
        variant="primary"
      >
        {status === 'searching'
          ? '正在解析地点…'
          : status === 'routing'
            ? '正在规划路线…'
            : `生成 ${placeCount} 个地点`}
      </Button>
      <p className="mt-2 text-[11px] text-ink-muted">当前地图：{mapProviderLabel} · 路线：{routingProviderLabel}</p>
      {message ? (
        <p
          className={`mt-2 text-xs leading-5 ${
            status === 'error'
              ? 'text-red-600'
              : status === 'needs-selection'
                ? 'text-amber-700'
                : 'text-emerald-700'
          }`}
          role={status === 'error' ? 'alert' : 'status'}
        >
          {message}
        </p>
      ) : null}
      <GeocodingCandidates
        onSelect={handleCandidateSelect}
        results={pendingResults}
        selections={selections}
      />
      {pendingResults.length > 0 ? (
        <Button
          className="mt-3 w-full"
          disabled={
            status === 'routing' || getPendingSelectionIndexes(pendingResults, selections).length > 0
          }
          onClick={handleApplyCandidates}
          variant="primary"
        >
          应用选中的地点
        </Button>
      ) : null}
    </PanelSection>
  )
}
