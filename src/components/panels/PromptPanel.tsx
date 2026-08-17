import { useState } from 'react'
import { parseTripPrompt } from '../../services/ai/parseTripPrompt.ts'
import { geocodePlaces } from '../../services/geocoding/geocodePlaces.ts'
import {
  getPendingSelectionIndexes,
  getResolvedPlaces,
  type GeocodingSelections,
} from '../../services/geocoding/resolveGeocodingResults.ts'
import { createPlaceAnnotations } from '../../services/project/createPlaceAnnotations.ts'
import { calculateRoute } from '../../services/routing/calculateRoute.ts'
import { useEditorStore } from '../../store/editorStore.ts'
import { useProjectStore } from '../../store/projectStore.ts'
import type { GeocodingResult } from '../../types/geocoding.ts'
import type { Place } from '../../types/place.ts'
import type { TripDraft } from '../../types/tripDraft.ts'
import { EXPORT_SIZES } from '../../utils/project.ts'
import { Button } from '../ui/Button.tsx'
import { GeocodingCandidates } from './GeocodingCandidates.tsx'
import { PanelSection } from './PanelSection.tsx'

const EXAMPLE_PROMPT = '帮我规划一条东京涩谷到表参道的半日 City Walk，主题是咖啡、拍照、买手店。'

type PromptStatus = 'idle' | 'planning' | 'needs-selection' | 'success' | 'error'

export function PromptPanel() {
  const [prompt, setPrompt] = useState(EXAMPLE_PROMPT)
  const [status, setStatus] = useState<PromptStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [pendingDraft, setPendingDraft] = useState<TripDraft | null>(null)
  const [pendingResults, setPendingResults] = useState<GeocodingResult[]>([])
  const [selections, setSelections] = useState<GeocodingSelections>({})
  const updateProject = useProjectStore((state) => state.updateProject)
  const setGeneratedMapContent = useProjectStore((state) => state.setGeneratedMapContent)
  const requestFitBounds = useEditorStore((state) => state.requestFitBounds)
  const setSelectedId = useEditorStore((state) => state.setSelectedId)

  const generateProject = async (
    draft: TripDraft,
    geocodingResults: GeocodingResult[],
    selectedCandidates: GeocodingSelections,
  ) => {
    const places = getResolvedPlaces(geocodingResults, selectedCandidates)
    const unresolvedNames = geocodingResults
      .filter((result) => result.status === 'unresolved')
      .map((result) => result.query.name)

    if (places.length < 2) {
      throw new Error('可解析地点少于两个，暂时无法生成路线。')
    }

    setStatus('planning')
    const routeResult = await calculateRoute(places, draft.travelMode)
    const route = routeResult.route
      ? {
          ...routeResult.route,
          style: { ...routeResult.route.style, color: draft.styleSuggestion.routeColor },
        }
      : null

    updateProject({
      title: draft.title,
      city: draft.city,
      theme: draft.theme,
      canvasRatio: draft.styleSuggestion.canvasRatio,
      exportSize: EXPORT_SIZES[draft.styleSuggestion.canvasRatio],
    })
    setGeneratedMapContent({
      places,
      route,
      annotations: createPlaceAnnotations(places),
    })
    setSelectedId(null)
    requestFitBounds()
    setPendingDraft(null)
    setPendingResults([])
    setSelections({})
    setStatus('success')
    const generatedMessage =
      unresolvedNames.length > 0
        ? `已生成 ${places.length} 个地点；未解析：${unresolvedNames.join('、')}`
        : `已生成“${draft.title}”，共 ${places.length} 个地点。`
    setMessage(
      routeResult.warning ? `${generatedMessage} ${routeResult.warning}` : generatedMessage,
    )
  }

  const handlePlanTrip = async () => {
    setStatus('planning')
    setMessage(null)
    setPendingDraft(null)
    setPendingResults([])
    setSelections({})

    try {
      const draft = await parseTripPrompt(prompt)
      const geocodingResults = await geocodePlaces(
        draft.places.map((place) => ({
          city: draft.city,
          name: place.name,
          category: place.category,
          note: place.note,
          source: 'ai',
        })),
      )
      const pendingCount = getPendingSelectionIndexes(geocodingResults, {}).length

      if (pendingCount > 0) {
        setPendingDraft(draft)
        setPendingResults(geocodingResults)
        setStatus('needs-selection')
        setMessage(`有 ${pendingCount} 个地点名称需要确认具体位置。`)
        return
      }

      await generateProject(draft, geocodingResults, {})
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '生成路线草案失败，请重试。')
    }
  }

  const handleCandidateSelect = (resultIndex: number, place: Place) => {
    setSelections((current) => ({ ...current, [resultIndex]: place }))
  }

  const handleApplyCandidates = async () => {
    if (
      status === 'planning' ||
      !pendingDraft ||
      getPendingSelectionIndexes(pendingResults, selections).length > 0
    ) {
      return
    }

    try {
      await generateProject(pendingDraft, pendingResults, selections)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '生成路线草案失败，请重试。')
    }
  }

  return (
    <PanelSection title="旅行灵感" action={<span className="text-xs text-coral-dark">mock AI</span>}>
      <label className="sr-only" htmlFor="trip-prompt">
        描述你的旅行路线
      </label>
      <textarea
        className="min-h-32 w-full resize-none rounded-xl border border-sand-200 bg-sand-50 p-3 text-sm leading-6 outline-none transition focus:border-coral focus:ring-2 focus:ring-coral/15"
        id="trip-prompt"
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="例如：涩谷到表参道的半日 City Walk，想喝咖啡和拍照"
        value={prompt}
      />
      <Button
        className="mt-3 w-full"
        disabled={!prompt.trim() || status === 'planning'}
        onClick={handlePlanTrip}
        variant="secondary"
      >
        {status === 'planning' ? '正在生成草案…' : '生成 AI 路线草案'}
      </Button>
      <p className="mt-2 text-xs leading-5 text-ink-muted">当前使用本地 mock，并通过 Zod 校验结构；不会调用外部 AI。</p>
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
            status === 'planning' || getPendingSelectionIndexes(pendingResults, selections).length > 0
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
