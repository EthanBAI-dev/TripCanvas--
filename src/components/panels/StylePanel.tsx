import { useEditorStore } from '../../store/editorStore.ts'
import { useProjectStore } from '../../store/projectStore.ts'
import { Button } from '../ui/Button.tsx'
import { PanelSection } from './PanelSection.tsx'

const TRAVEL_MODE_LABELS = {
  walking: '步行',
  driving: '驾车',
  transit: '公共交通',
  cycling: '骑行',
} as const

function formatDistance(distanceMeters: number | undefined): string {
  if (!distanceMeters) {
    return '—'
  }

  return distanceMeters >= 1_000 ? `${(distanceMeters / 1_000).toFixed(1)} km` : `${distanceMeters} m`
}

function formatDuration(durationSeconds: number | undefined): string {
  if (!durationSeconds) {
    return '—'
  }

  return `${Math.max(1, Math.round(durationSeconds / 60))} 分钟`
}

export function StylePanel() {
  const annotations = useProjectStore((state) => state.project.annotations)
  const places = useProjectStore((state) => state.project.places)
  const routes = useProjectStore((state) => state.project.routes)
  const updateAnnotation = useProjectStore((state) => state.updateAnnotation)
  const removeAnnotation = useProjectStore((state) => state.removeAnnotation)
  const updateRouteStyle = useProjectStore((state) => state.updateRouteStyle)
  const selectedId = useEditorStore((state) => state.selectedId)
  const setSelectedId = useEditorStore((state) => state.setSelectedId)

  const selectedAnnotation = annotations.find((annotation) => annotation.id === selectedId)
  const activeRoute = routes.find((route) => route.id === selectedId) ?? routes[0]

  if (selectedAnnotation) {
    const fontSize = selectedAnnotation.style.fontSize ?? 16

    return (
      <PanelSection title="文字标注" action={<span className="text-xs text-ink-muted">已选择</span>}>
        <label className="block text-xs font-medium text-ink-muted" htmlFor="annotation-text">
          文字内容
        </label>
        <textarea
          className="mt-1.5 min-h-20 w-full resize-none rounded-xl border border-sand-200 bg-sand-50 p-2.5 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-coral/15"
          id="annotation-text"
          onChange={(event) => updateAnnotation(selectedAnnotation.id, { text: event.target.value })}
          value={selectedAnnotation.text ?? ''}
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-xs font-medium text-ink-muted" htmlFor="annotation-font-size">
            字号
            <input
              className="mt-1 block w-full accent-coral"
              id="annotation-font-size"
              max="42"
              min="10"
              onChange={(event) =>
                updateAnnotation(selectedAnnotation.id, { style: { fontSize: Number(event.target.value) } })
              }
              type="range"
              value={fontSize}
            />
            <span className="font-normal">{fontSize}px</span>
          </label>
          <label className="text-xs font-medium text-ink-muted" htmlFor="annotation-radius">
            圆角
            <input
              className="mt-1 block w-full accent-coral"
              id="annotation-radius"
              max="24"
              min="0"
              onChange={(event) =>
                updateAnnotation(selectedAnnotation.id, { style: { borderRadius: Number(event.target.value) } })
              }
              type="range"
              value={selectedAnnotation.style.borderRadius ?? 12}
            />
            <span className="font-normal">{selectedAnnotation.style.borderRadius ?? 12}px</span>
          </label>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-xs font-medium text-ink-muted" htmlFor="annotation-color">
            文字颜色
            <input
              className="mt-1 block h-9 w-full cursor-pointer rounded-lg border border-sand-200 bg-white p-1"
              id="annotation-color"
              onChange={(event) => updateAnnotation(selectedAnnotation.id, { style: { color: event.target.value } })}
              type="color"
              value={selectedAnnotation.style.color ?? '#17343d'}
            />
          </label>
          <label className="text-xs font-medium text-ink-muted" htmlFor="annotation-background">
            背景颜色
            <input
              className="mt-1 block h-9 w-full cursor-pointer rounded-lg border border-sand-200 bg-white p-1"
              id="annotation-background"
              onChange={(event) =>
                updateAnnotation(selectedAnnotation.id, { style: { backgroundColor: event.target.value } })
              }
              type="color"
              value={selectedAnnotation.style.backgroundColor ?? '#ffffff'}
            />
          </label>
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-ink" htmlFor="annotation-bold">
          <input
            checked={selectedAnnotation.style.fontWeight === 'bold'}
            className="size-4 accent-coral"
            id="annotation-bold"
            onChange={(event) =>
              updateAnnotation(selectedAnnotation.id, {
                style: { fontWeight: event.target.checked ? 'bold' : 'normal' },
              })
            }
            type="checkbox"
          />
          加粗文字
        </label>
        <Button
          className="mt-4 w-full text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => {
            removeAnnotation(selectedAnnotation.id)
            setSelectedId(null)
          }}
          variant="ghost"
        >
          删除文字
        </Button>
      </PanelSection>
    )
  }

  if (activeRoute) {
    const routeSourceLabel =
      activeRoute.source === 'google'
        ? 'Google 路线'
        : activeRoute.source === 'osrm'
          ? '真实路线'
          : '直线预览'
    const travelModeLabel = TRAVEL_MODE_LABELS[activeRoute.travelMode]

    return (
      <PanelSection title="路线样式" action={<span className="text-xs text-ink-muted">{routeSourceLabel}</span>}>
        <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-sand-50 p-3 text-xs text-ink-muted">
          <span>距离：{formatDistance(activeRoute.distanceMeters)}</span>
          <span>{travelModeLabel}：{formatDuration(activeRoute.durationSeconds)}</span>
        </div>
        {activeRoute.legs?.length ? (
          <div className="mb-3 space-y-2 rounded-xl border border-sand-200 bg-white p-3">
            <p className="text-[10px] font-bold tracking-wider text-ink-muted">逐段时间</p>
            {activeRoute.legs.map((leg, index) => {
              const fromPlace = places.find((place) => place.id === leg.fromPlaceId)
              const toPlace = places.find((place) => place.id === leg.toPlaceId)
              return (
                <div className="flex items-start justify-between gap-3 text-xs" key={leg.id}>
                  <span className="min-w-0 truncate text-ink">
                    {index + 1}. {fromPlace?.name ?? '起点'} → {toPlace?.name ?? '终点'}
                  </span>
                  <span className="shrink-0 font-semibold text-coral-dark">
                    {formatDuration(leg.durationSeconds)}
                  </span>
                </div>
              )
            })}
          </div>
        ) : null}
        <label className="block text-xs font-medium text-ink-muted" htmlFor="route-color">
          路线颜色
          <input
            className="mt-1.5 block h-9 w-full cursor-pointer rounded-lg border border-sand-200 bg-white p-1"
            id="route-color"
            onChange={(event) => updateRouteStyle(activeRoute.id, { color: event.target.value })}
            type="color"
            value={activeRoute.style.color}
          />
        </label>
        <label className="mt-3 block text-xs font-medium text-ink-muted" htmlFor="route-width">
          线宽：{activeRoute.style.width}px
          <input
            className="mt-1.5 block w-full accent-coral"
            id="route-width"
            max="14"
            min="2"
            onChange={(event) => updateRouteStyle(activeRoute.id, { width: Number(event.target.value) })}
            type="range"
            value={activeRoute.style.width}
          />
        </label>
        <div className="mt-3 space-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink" htmlFor="route-dashed">
            <input
              checked={activeRoute.style.dashed}
              className="size-4 accent-coral"
              id="route-dashed"
              onChange={(event) => updateRouteStyle(activeRoute.id, { dashed: event.target.checked })}
              type="checkbox"
            />
            使用虚线
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink" htmlFor="route-arrow">
            <input
              checked={activeRoute.style.showArrow}
              className="size-4 accent-coral"
              id="route-arrow"
              onChange={(event) => updateRouteStyle(activeRoute.id, { showArrow: event.target.checked })}
              type="checkbox"
            />
            显示方向箭头
          </label>
        </div>
        <Button className="mt-4 w-full" onClick={() => setSelectedId(activeRoute.id)} variant="secondary">
          选择路线
        </Button>
      </PanelSection>
    )
  }

  return (
    <PanelSection title="样式">
      <p className="text-sm leading-6 text-ink-muted">生成地点后，可在此编辑路线；选择文字工具并点击地图，可添加文字标注。</p>
    </PanelSection>
  )
}
