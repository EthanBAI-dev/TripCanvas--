import { useMemo, useState } from 'react'
import {
  buildCarouselPages,
  getIncludedCarouselPages,
  getCarouselFrameId,
} from '../../services/carousel/buildCarouselPages.ts'
import { exportCarouselArchive } from '../../services/export/exportCarouselArchive.ts'
import { getTripTemplate } from '../../services/templates/tripTemplates.ts'
import { useEditorStore } from '../../store/editorStore.ts'
import { useProjectStore } from '../../store/projectStore.ts'
import type { CarouselPage } from '../../types/carousel.ts'
import { Button } from '../ui/Button.tsx'
import { PanelSection } from './PanelSection.tsx'

function pageTypeLabel(page: CarouselPage): string {
  if (page.type === 'cover') {
    return '封面'
  }

  if (page.type === 'route') {
    return '路线'
  }

  return `站点 ${(page.placeIndex ?? 0) + 1}`
}

export function CarouselPanel() {
  const [selectedPageId, setSelectedPageId] = useState('cover')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const project = useProjectStore((state) => state.project)
  const setCarouselPageIncluded = useProjectStore((state) => state.setCarouselPageIncluded)
  const setCarouselPageOrder = useProjectStore((state) => state.setCarouselPageOrder)
  const updateWatermark = useProjectStore((state) => state.updateWatermark)
  const isMapReady = useEditorStore((state) => state.isMapReady)
  const isExporting = useEditorStore((state) => state.isExporting)
  const setIsExporting = useEditorStore((state) => state.setIsExporting)
  const pages = useMemo(() => buildCarouselPages(project), [project])
  const includedPages = useMemo(() => getIncludedCarouselPages(project), [project])
  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? pages[0]
  const template = getTripTemplate(project.templateId)

  const moveSelectedPage = (offset: -1 | 1) => {
    const currentIndex = pages.findIndex((page) => page.id === selectedPage.id)
    const nextIndex = currentIndex + offset
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= pages.length) {
      return
    }

    const nextOrder = pages.map((page) => page.id)
    ;[nextOrder[currentIndex], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[currentIndex]]
    setCarouselPageOrder(nextOrder)
  }

  const handleBatchExport = async () => {
    if (!isMapReady) {
      setError('地图仍在加载，请稍候再导出。')
      return
    }

    if (includedPages.length === 0) {
      setError('请至少保留一张需要导出的页面。')
      return
    }

    const targets = includedPages.flatMap((page) => {
      const node = document.getElementById(getCarouselFrameId(page))
      return node ? [{ node, page }] : []
    })

    if (targets.length !== includedPages.length) {
      setError('多图画布尚未准备完成，请刷新后重试。')
      return
    }

    const routeFrame = document.getElementById('tripcanvas-export-frame')
    setError(null)
    setSuccess(null)
    setProgress(`正在生成 0 / ${includedPages.length}`)
    setIsExporting(true)
    if (routeFrame) {
      routeFrame.dataset.exporting = 'true'
    }

    try {
      const filename = await exportCarouselArchive(targets, project.exportSize, (completed, total) => {
        setProgress(`正在生成 ${completed} / ${total}`)
      })
      setSuccess(`已打包 ${includedPages.length} 张图片：${filename}`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? `批量导出失败：${caughtError.message}` : '批量导出失败，请重试。')
    } finally {
      if (routeFrame) {
        delete routeFrame.dataset.exporting
      }
      setProgress(null)
      setIsExporting(false)
    }
  }

  return (
    <PanelSection
      title="多图素材"
      action={<span className="text-xs text-ink-muted">{includedPages.length} / {pages.length} 张</span>}
    >
      <div className="flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Carousel 页面">
        {pages.map((page) => (
          <button
            aria-pressed={page.id === selectedPage.id}
            className={`w-16 shrink-0 rounded-xl border p-2 text-left transition ${
              page.id === selectedPage.id
                ? 'border-coral bg-coral/5'
                : 'border-sand-200 bg-white hover:border-sand-300'
            } ${page.included ? '' : 'opacity-45'}`}
            key={page.id}
            onClick={() => setSelectedPageId(page.id)}
            type="button"
          >
            <span
              className="grid aspect-[3/4] w-full place-items-center rounded-md text-xs font-bold text-white"
              style={{ backgroundColor: template.visuals.accentColor }}
            >
              {String(page.index + 1).padStart(2, '0')}
            </span>
            <span className="mt-1.5 block truncate text-[10px] font-medium text-ink">
              {pageTypeLabel(page)}
            </span>
            {!page.included ? <span className="mt-0.5 block text-[9px] text-ink-muted">不导出</span> : null}
          </button>
        ))}
      </div>

      <div
        className="mt-2 overflow-hidden rounded-xl border border-sand-200 p-4"
        style={{
          background: `linear-gradient(145deg, ${template.visuals.gradientTop}, ${template.visuals.canvasBackground})`,
          color: template.visuals.titleColor,
        }}
      >
        <div className="flex items-center justify-between text-[9px] font-bold tracking-wider opacity-55">
          <span>{pageTypeLabel(selectedPage)}</span>
          <span>{selectedPage.index + 1} / {pages.length}</span>
        </div>
        <p className="mt-5 line-clamp-2 text-lg font-bold leading-tight">{selectedPage.title}</p>
        <p className="mt-2 line-clamp-2 min-h-8 text-[10px] leading-4 opacity-65">
          {selectedPage.subtitle ?? 'TripCanvas 路线素材'}
        </p>
      </div>

      <div className="mt-3 rounded-xl border border-sand-200 bg-sand-50 p-3">
        <label className="flex items-center justify-between gap-3 text-xs font-medium text-ink">
          包含在导出
          <input
            checked={selectedPage.included}
            className="size-4 accent-coral"
            onChange={(event) => setCarouselPageIncluded(selectedPage.id, event.target.checked)}
            type="checkbox"
          />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            disabled={selectedPage.index === 0}
            onClick={() => moveSelectedPage(-1)}
            variant="secondary"
          >
            前移
          </Button>
          <Button
            disabled={selectedPage.index === pages.length - 1}
            onClick={() => moveSelectedPage(1)}
            variant="secondary"
          >
            后移
          </Button>
        </div>
      </div>

      <div className="mt-4 border-t border-sand-200 pt-4">
        <label className="flex items-center justify-between gap-3 text-xs font-medium text-ink">
          显示品牌水印
          <input
            checked={project.carousel.watermark.enabled}
            className="size-4 accent-coral"
            onChange={(event) => updateWatermark({ enabled: event.target.checked })}
            type="checkbox"
          />
        </label>
        <label className="mt-3 block text-xs font-medium text-ink-muted" htmlFor="watermark-text">
          水印文字
          <input
            className="mt-1.5 block w-full rounded-xl border border-sand-200 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-coral focus:ring-2 focus:ring-coral/15"
            id="watermark-text"
            onChange={(event) => updateWatermark({ text: event.target.value })}
            value={project.carousel.watermark.text}
          />
        </label>
        <label className="mt-3 block text-xs font-medium text-ink-muted" htmlFor="watermark-position">
          水印位置
          <select
            className="mt-1.5 block w-full rounded-xl border border-sand-200 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-coral focus:ring-2 focus:ring-coral/15"
            id="watermark-position"
            onChange={(event) => updateWatermark({ position: event.target.value as typeof project.carousel.watermark.position })}
            value={project.carousel.watermark.position}
          >
            <option value="top-left">左上</option>
            <option value="top-right">右上</option>
            <option value="bottom-left">左下</option>
            <option value="bottom-right">右下</option>
          </select>
        </label>
        <label className="mt-3 block text-xs font-medium text-ink-muted" htmlFor="watermark-opacity">
          水印透明度 · {Math.round(project.carousel.watermark.opacity * 100)}%
          <input
            className="mt-2 block w-full accent-coral"
            id="watermark-opacity"
            max="1"
            min="0.2"
            onChange={(event) => updateWatermark({ opacity: Number(event.target.value) })}
            step="0.05"
            type="range"
            value={project.carousel.watermark.opacity}
          />
        </label>
      </div>

      <Button
        className="mt-3 w-full"
        disabled={!isMapReady || isExporting || includedPages.length === 0}
        onClick={handleBatchExport}
        variant="secondary"
      >
        {isExporting ? progress ?? '正在打包…' : `打包导出 ${includedPages.length} 张 PNG`}
      </Button>
      <p className="mt-2 text-[11px] leading-4 text-ink-muted">下载为 ZIP；可调整页面顺序，或排除不需要的页面。</p>
      {error ? (
        <p className="mt-2 text-xs leading-5 text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-2 text-xs leading-5 text-emerald-700" role="status">
          {success}
        </p>
      ) : null}
    </PanelSection>
  )
}
