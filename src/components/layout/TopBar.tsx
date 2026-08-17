import { useEditorStore } from '../../store/editorStore.ts'
import { useProjectStore } from '../../store/projectStore.ts'
import { Button } from '../ui/Button.tsx'

export function TopBar() {
  const currentTool = useEditorStore((state) => state.currentTool)
  const setCurrentTool = useEditorStore((state) => state.setCurrentTool)
  const canvasRatio = useProjectStore((state) => state.project.canvasRatio)

  return (
    <header className="flex min-h-16 items-center justify-between border-b border-sand-200/80 bg-white/90 px-4 shadow-[0_1px_0_rgba(23,52,61,.03)] backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-xl bg-[linear-gradient(135deg,#0f9d94,#2f80ed)] text-sm font-bold text-white shadow-sm">旅</div>
        <div>
          <p className="font-display text-lg font-semibold tracking-tight text-ink">旅图 TripCanvas</p>
          <p className="text-xs text-ink-muted">路线图创作工作台</p>
        </div>
      </div>

      <nav aria-label="编辑工具" className="hidden items-center gap-1 rounded-xl border border-sand-200/80 bg-sand-50 p-1 sm:flex">
        {(['select', 'text', 'pin', 'route'] as const).map((tool) => (
          <Button
            aria-pressed={currentTool === tool}
            className={currentTool === tool ? 'bg-white text-ink shadow-sm' : ''}
            key={tool}
            onClick={() => setCurrentTool(tool)}
            variant="ghost"
          >
            {tool === 'select' ? '选择' : tool === 'text' ? '文字' : tool === 'pin' ? '点位' : '路线'}
          </Button>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <span className="hidden rounded-lg bg-sand-100 px-2.5 py-1 text-xs font-medium text-ink-muted sm:inline">
          {canvasRatio}
        </span>
        <Button onClick={() => document.getElementById('export-png-button')?.click()} variant="primary">
          导出 PNG
        </Button>
      </div>
    </header>
  )
}
