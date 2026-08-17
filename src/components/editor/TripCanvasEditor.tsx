import { useProjectStore } from '../../store/projectStore.ts'
import { getTripTemplate } from '../../services/templates/tripTemplates.ts'
import type { CanvasRatio } from '../../types/project.ts'
import { MapStage } from './MapStage.tsx'
import { WatermarkOverlay } from '../carousel/WatermarkOverlay.tsx'

const ratioClasses: Record<CanvasRatio, string> = {
  '3:4': 'aspect-[3/4]',
  '4:5': 'aspect-[4/5]',
  '9:16': 'aspect-[9/16]',
  '1:1': 'aspect-square',
}

export function TripCanvasEditor() {
  const project = useProjectStore((state) => state.project)
  const template = getTripTemplate(project.templateId)
  const hasTopWatermark = project.carousel.watermark.enabled && project.carousel.watermark.position.startsWith('top-')

  return (
    <section className="relative min-h-0 overflow-auto bg-[#e8f0f3]">
      <div className="flex min-h-full min-w-full items-start justify-center p-6 md:p-10">
        <div
          id="tripcanvas-export-frame"
          className={`relative w-full max-w-[640px] shrink-0 overflow-hidden rounded-[24px] shadow-canvas ${ratioClasses[project.canvasRatio]}`}
          style={{ backgroundColor: template.visuals.canvasBackground }}
        >
          <MapStage />
          <WatermarkOverlay watermark={project.carousel.watermark} />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${template.visuals.gradientTop} 0%, transparent 27%, transparent 68%, ${template.visuals.gradientBottom} 100%)`,
            }}
          />
          <div
            className={`pointer-events-none relative flex h-full flex-col justify-between px-7 pb-7 sm:px-10 sm:pb-10 ${
              hasTopWatermark ? 'pt-16 sm:pt-20' : 'pt-7 sm:pt-10'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex whitespace-nowrap rounded-full bg-white/75 px-3 py-1 text-xs font-medium tracking-wide text-ink-muted backdrop-blur">
                  {project.city ?? '旅行目的地'} · {template.name}
                </span>
                <h1
                  className="mt-4 max-w-[12ch] font-display text-3xl font-semibold leading-tight tracking-tight sm:text-5xl"
                  style={{ color: template.visuals.titleColor }}
                >
                  {project.title}
                </h1>
                {project.subtitle ? (
                  <p
                    className="mt-3 max-w-[28ch] text-sm font-medium leading-6 opacity-75"
                    style={{ color: template.visuals.titleColor }}
                  >
                    {project.subtitle}
                  </p>
                ) : null}
              </div>
              <span
                className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-bold tracking-[0.1em] backdrop-blur"
                style={{
                  backgroundColor: template.visuals.badgeBackground,
                  color: template.visuals.badgeColor,
                }}
              >
                {template.badge}
              </span>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/65 p-4 backdrop-blur-sm" data-export-ui>
              <p className="text-sm font-medium text-ink">地图画布已接入</p>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                拖拽或缩放地图，视图状态会保存到本地 Project JSON。
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
