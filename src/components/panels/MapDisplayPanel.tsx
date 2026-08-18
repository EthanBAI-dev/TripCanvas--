import type { MapDetail } from '../../types/project.ts'
import { useProjectStore } from '../../store/projectStore.ts'
import { PanelSection } from './PanelSection.tsx'

const OPTIONS: Array<{ value: MapDetail; label: string; description: string }> = [
  { value: 'standard', label: '标准', description: '完整底图文字' },
  { value: 'clean', label: '清爽', description: '隐藏地点文字' },
  { value: 'minimal', label: '极简', description: '隐藏全部文字' },
]

export function MapDisplayPanel() {
  const mapDetail = useProjectStore((state) => state.project.mapDetail)
  const setMapDetail = useProjectStore((state) => state.setMapDetail)

  return (
    <PanelSection title="底图信息">
      <p className="mb-3 text-xs leading-5 text-ink-muted">控制 Google 底图自身的文字密度；不影响你的地点标签，导出 PNG 时也会生效。</p>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="底图信息密度">
        {OPTIONS.map((option) => (
          <button
            aria-pressed={mapDetail === option.value}
            className={`rounded-xl border px-2 py-2 text-left transition ${mapDetail === option.value ? 'border-coral bg-coral/10 text-ink' : 'border-sand-200 bg-white text-ink-muted hover:border-coral/50'}`}
            key={option.value}
            onClick={() => setMapDetail(option.value)}
            title={option.description}
            type="button"
          >
            <span className="block text-xs font-bold">{option.label}</span>
            <span className="mt-1 block text-[10px] leading-4">{option.description}</span>
          </button>
        ))}
      </div>
    </PanelSection>
  )
}
