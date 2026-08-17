import { TRIP_TEMPLATES, getTripTemplate } from '../../services/templates/tripTemplates.ts'
import { useProjectStore } from '../../store/projectStore.ts'
import { PanelSection } from './PanelSection.tsx'

export function TemplatePanel() {
  const project = useProjectStore((state) => state.project)
  const applyTemplate = useProjectStore((state) => state.applyTemplate)
  const updateProject = useProjectStore((state) => state.updateProject)
  const selectedTemplate = getTripTemplate(project.templateId)

  return (
    <PanelSection title="路线模板" action={<span className="text-xs text-ink-muted">4 款</span>}>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="路线图模板">
        {TRIP_TEMPLATES.map((template) => {
          const isSelected = template.id === selectedTemplate.id

          return (
            <button
              aria-pressed={isSelected}
              className={`rounded-xl border bg-white p-3 text-left transition-all ${
                isSelected
                  ? 'border-transparent shadow-sm'
                  : 'border-sand-200 hover:-translate-y-0.5 hover:border-sand-300'
              }`}
              key={template.id}
              onClick={() => applyTemplate(template.id)}
              style={isSelected ? { boxShadow: `0 0 0 2px ${template.visuals.accentColor}` } : undefined}
              type="button"
            >
              <span className="flex items-center justify-between gap-2">
                <span
                  aria-hidden="true"
                  className="size-3 rounded-full"
                  style={{ backgroundColor: template.visuals.accentColor }}
                />
                <span className="text-[10px] font-medium text-ink-muted">{template.canvasRatio}</span>
              </span>
              <span className="mt-2 block text-xs font-semibold text-ink">{template.name}</span>
              <span className="mt-1 block text-[10px] leading-4 text-ink-muted">
                {template.description}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 space-y-3 border-t border-sand-200 pt-4">
        <label className="block text-xs font-medium text-ink-muted" htmlFor="poster-title">
          海报标题
          <input
            className="mt-1.5 block w-full rounded-xl border border-sand-200 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-coral focus:ring-2 focus:ring-coral/15"
            id="poster-title"
            onChange={(event) => updateProject({ title: event.target.value })}
            value={project.title}
          />
        </label>
        <label className="block text-xs font-medium text-ink-muted" htmlFor="poster-subtitle">
          副标题
          <textarea
            className="mt-1.5 min-h-16 w-full resize-none rounded-xl border border-sand-200 bg-sand-50 px-3 py-2 text-sm leading-5 text-ink outline-none focus:border-coral focus:ring-2 focus:ring-coral/15"
            id="poster-subtitle"
            onChange={(event) => updateProject({ subtitle: event.target.value })}
            value={project.subtitle ?? ''}
          />
        </label>
      </div>
    </PanelSection>
  )
}
