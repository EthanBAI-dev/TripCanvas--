import { useState } from 'react'
import { createExportFilename, downloadPng, exportToPng, waitForNextPaint } from '../../services/export/exportToPng.ts'
import { useEditorStore } from '../../store/editorStore.ts'
import { useProjectStore } from '../../store/projectStore.ts'
import type { CanvasRatio } from '../../types/project.ts'
import { Button } from '../ui/Button.tsx'
import { PanelSection } from './PanelSection.tsx'

const ratios: CanvasRatio[] = ['3:4', '4:5', '9:16']

export function ExportPanel() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const canvasRatio = useProjectStore((state) => state.project.canvasRatio)
  const exportSize = useProjectStore((state) => state.project.exportSize)
  const setCanvasRatio = useProjectStore((state) => state.setCanvasRatio)
  const isMapReady = useEditorStore((state) => state.isMapReady)
  const isExporting = useEditorStore((state) => state.isExporting)
  const setIsExporting = useEditorStore((state) => state.setIsExporting)

  const handleExport = async () => {
    if (!isMapReady) {
      setError('地图仍在加载，请稍候再导出。')
      return
    }

    const frame = document.getElementById('tripcanvas-export-frame')
    if (!frame) {
      setError('未找到可导出的地图画布。')
      return
    }

    setError(null)
    setSuccess(null)
    setIsExporting(true)
    frame.dataset.exporting = 'true'

    try {
      await waitForNextPaint()
      const dataUrl = await exportToPng(frame, exportSize)
      const filename = createExportFilename()
      downloadPng(dataUrl, filename)
      setSuccess(`已生成 ${filename}`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? `导出失败：${caughtError.message}` : '导出失败，请重试。')
    } finally {
      delete frame.dataset.exporting
      setIsExporting(false)
    }
  }

  return (
    <PanelSection title="导出设置">
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="导出比例">
        {ratios.map((ratio) => (
          <button
            aria-pressed={ratio === canvasRatio}
            className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
              ratio === canvasRatio
                ? 'border-coral bg-coral/10 text-coral-dark'
                : 'border-sand-200 text-ink-muted hover:border-sand-300'
            }`}
            key={ratio}
            onClick={() => setCanvasRatio(ratio)}
            type="button"
          >
            {ratio}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-muted">
        目标尺寸：{exportSize.width} × {exportSize.height}px
      </p>
      <Button
        className="mt-4 w-full"
        disabled={!isMapReady || isExporting}
        id="export-png-button"
        onClick={handleExport}
        variant="primary"
      >
        {isExporting ? '正在导出…' : '导出 PNG'}
      </Button>
      {!isMapReady ? <p className="mt-2 text-xs text-ink-muted">正在等待地图底图完成加载。</p> : null}
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
