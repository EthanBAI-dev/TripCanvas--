import { useCallback, useEffect, useState } from 'react'
import {
  createPlacesFromPluginPayload,
  parsePluginRouteImport,
} from '../../services/import/parsePluginRouteImport.ts'
import { createPlaceAnnotations } from '../../services/project/createPlaceAnnotations.ts'
import { calculateMixedRoute } from '../../services/routing/calculateMixedRoute.ts'
import { useEditorStore } from '../../store/editorStore.ts'
import { useProjectStore } from '../../store/projectStore.ts'
import { PLUGIN_ROUTE_IMPORT_TYPE } from '../../types/pluginImport.ts'
import { Button } from '../ui/Button.tsx'
import { PanelSection } from './PanelSection.tsx'

const EXAMPLE_IMPORT = JSON.stringify(
  {
    type: PLUGIN_ROUTE_IMPORT_TYPE,
    payload: {
      title: '涩谷到表参道 City Walk',
      city: 'Tokyo',
      travelMode: 'walking',
      places: [
        {
          name: '涩谷站',
          lat: 35.658034,
          lng: 139.701636,
          externalUrl: 'https://www.google.com/maps/search/?api=1&query=Shibuya+Station',
        },
        {
          name: '表参道',
          lat: 35.665247,
          lng: 139.712314,
          externalUrl: 'https://www.google.com/maps/search/?api=1&query=Omotesando',
        },
      ],
    },
  },
  null,
  2,
)

type ImportStatus = 'idle' | 'importing' | 'success' | 'error'

export function PluginImportPanel() {
  const [text, setText] = useState(EXAMPLE_IMPORT)
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const updateProject = useProjectStore((state) => state.updateProject)
  const setGeneratedMapContent = useProjectStore((state) => state.setGeneratedMapContent)
  const setCanvasRatio = useProjectStore((state) => state.setCanvasRatio)
  const requestFitBounds = useEditorStore((state) => state.requestFitBounds)
  const setSelectedId = useEditorStore((state) => state.setSelectedId)

  const applyImport = useCallback(
    async (value: unknown) => {
      setStatus('importing')
      setMessage(null)

      try {
        const { payload } = parsePluginRouteImport(value)
        const places = createPlacesFromPluginPayload(payload)
        const routeResult = await calculateMixedRoute(places, payload.travelMode)
        const currentCarousel = useProjectStore.getState().project.carousel

        updateProject({
          title: payload.title ?? `${places[0].name}到${places.at(-1)?.name ?? ''}路线`,
          subtitle: payload.subtitle,
          city: payload.city,
          carousel: {
            ...currentCarousel,
            hiddenPageIds: [...new Set([...currentCarousel.hiddenPageIds, 'cover'])],
            pageOrder: ['route', ...places.map((place) => `place-${place.id}`)],
          },
        })
        if (payload.canvasRatio) {
          setCanvasRatio(payload.canvasRatio)
        }
        setGeneratedMapContent({
          places,
          route: routeResult.route,
          annotations: createPlaceAnnotations(places),
        })
        setSelectedId(null)
        requestFitBounds()
        setStatus('success')
        setMessage(
          routeResult.warning
            ? `已导入 ${places.length} 个地点。${routeResult.warning}`
            : `已导入 ${places.length} 个地点和 ${routeResult.route?.legs.length ?? 0} 段路线。`,
        )
      } catch (error) {
        setStatus('error')
        setMessage(error instanceof Error ? error.message : '插件路线导入失败。')
      }
    },
    [requestFitBounds, setCanvasRatio, setGeneratedMapContent, setSelectedId, updateProject],
  )

  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== window || event.origin !== window.location.origin) {
        return
      }
      if (typeof event.data === 'object' && event.data !== null && 'type' in event.data) {
        const candidate = event.data as { type?: unknown }
        if (candidate.type === PLUGIN_ROUTE_IMPORT_TYPE) {
          void applyImport(event.data)
        }
      }
    }
    const handleCustomEvent = (event: Event) => {
      void applyImport((event as CustomEvent<unknown>).detail)
    }

    window.addEventListener('message', handleMessage)
    window.addEventListener('tripcanvas:import-route', handleCustomEvent)
    return () => {
      window.removeEventListener('message', handleMessage)
      window.removeEventListener('tripcanvas:import-route', handleCustomEvent)
    }
  }, [applyImport])

  const handlePasteImport = () => {
    try {
      void applyImport(JSON.parse(text) as unknown)
    } catch {
      setStatus('error')
      setMessage('请输入有效的 JSON。')
    }
  }

  return (
    <PanelSection title="插件导入" action={<span className="text-xs text-ink-muted">多点路线</span>}>
      <p className="mb-2 text-xs leading-5 text-ink-muted">
        浏览器插件可发送 <code className="rounded bg-sand-100 px-1">TRIPCANVAS_IMPORT_ROUTE</code>；也可先粘贴 JSON 测试。
      </p>
      <label className="sr-only" htmlFor="plugin-route-import">插件路线 JSON</label>
      <textarea
        className="min-h-32 w-full resize-y rounded-xl border border-sand-200 bg-sand-50 p-3 font-mono text-[11px] leading-5 outline-none focus:border-coral focus:ring-2 focus:ring-coral/15"
        id="plugin-route-import"
        onChange={(event) => setText(event.target.value)}
        value={text}
      />
      <Button
        className="mt-3 w-full"
        disabled={status === 'importing'}
        onClick={handlePasteImport}
        variant="secondary"
      >
        {status === 'importing' ? '正在规划多点路线…' : '导入插件路线'}
      </Button>
      {message ? (
        <p className={`mt-2 text-xs leading-5 ${status === 'error' ? 'text-red-600' : 'text-emerald-700'}`} role={status === 'error' ? 'alert' : 'status'}>
          {message}
        </p>
      ) : null}
    </PanelSection>
  )
}
