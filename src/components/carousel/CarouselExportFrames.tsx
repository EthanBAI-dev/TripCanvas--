import { buildCarouselPages, getCarouselFrameId } from '../../services/carousel/buildCarouselPages.ts'
import { getTripTemplate } from '../../services/templates/tripTemplates.ts'
import { useProjectStore } from '../../store/projectStore.ts'
import type { CarouselPage } from '../../types/carousel.ts'
import type { CanvasRatio, TripCanvasProject } from '../../types/project.ts'
import { WatermarkOverlay } from './WatermarkOverlay.tsx'
import { getSafeExternalUrl } from '../../utils/url.ts'

const FRAME_WIDTH = 360
const FRAME_HEIGHTS: Record<CanvasRatio, number> = {
  '3:4': 480,
  '4:5': 450,
  '9:16': 640,
  '1:1': 360,
}

const CATEGORY_LABELS = {
  start: '路线起点',
  end: '路线终点',
  food: '美食',
  coffee: '咖啡',
  shopping: '购物',
  photo: '拍照',
  hotel: '住宿',
  sight: '景点',
  transport: '交通',
  custom: '行程站点',
} as const

function CoverPage({ project }: { project: TripCanvasProject }) {
  const template = getTripTemplate(project.templateId)
  const route = project.routes[0]
  const hasTopWatermark = project.carousel.watermark.enabled && project.carousel.watermark.position.startsWith('top-')

  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden px-9 pb-9 ${hasTopWatermark ? 'pt-16' : 'pt-9'}`}
      style={{ color: template.visuals.titleColor }}
    >
      <div
        className="absolute -right-16 -top-12 size-56 rounded-full opacity-25 blur-2xl"
        style={{ backgroundColor: template.visuals.accentColor }}
      />
      <div
        className="absolute -bottom-16 -left-20 size-64 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: template.visuals.accentColor }}
      />
      <div className="relative flex items-start justify-between gap-4">
        <span className="shrink-0 whitespace-nowrap rounded-full bg-white/70 px-3 py-1 text-[10px] font-semibold tracking-wider">
          {project.city ?? '旅行目的地'} · {template.name}
        </span>
        <span
          className="shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[9px] font-bold tracking-[0.1em]"
          style={{ backgroundColor: template.visuals.badgeBackground, color: template.visuals.badgeColor }}
        >
          {template.badge}
        </span>
      </div>
      <div className="relative my-auto">
        <p className="text-xs font-semibold tracking-[0.22em] opacity-55">TRIP ROUTE GUIDE</p>
        <h2 className="mt-5 max-w-[10ch] text-4xl font-bold leading-[1.08] tracking-tight">{project.title}</h2>
        {project.subtitle ? <p className="mt-5 max-w-[24ch] text-sm leading-6 opacity-70">{project.subtitle}</p> : null}
      </div>
      <div className="relative grid grid-cols-3 gap-2 rounded-2xl border border-white/60 bg-white/55 p-4 backdrop-blur">
        <div>
          <p className="text-[9px] opacity-55">地点</p>
          <p className="mt-1 text-lg font-bold">{project.places.length}</p>
        </div>
        <div>
          <p className="text-[9px] opacity-55">距离</p>
          <p className="mt-1 text-sm font-bold">
            {route?.distanceMeters ? `${(route.distanceMeters / 1_000).toFixed(1)} km` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[9px] opacity-55">时间</p>
          <p className="mt-1 text-sm font-bold">
            {route?.durationSeconds ? `${Math.max(1, Math.round(route.durationSeconds / 60))} min` : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

function PlacePage({ page, project }: { page: CarouselPage; project: TripCanvasProject }) {
  const template = getTripTemplate(project.templateId)
  const place = project.places.find((candidate) => candidate.id === page.placeId)
  if (!place) {
    return null
  }

  const placeNumber = (page.placeIndex ?? 0) + 1
  const safeImageUrl = getSafeExternalUrl(place.imageUrl)
  const hasTopWatermark = project.carousel.watermark.enabled && project.carousel.watermark.position.startsWith('top-')

  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden px-9 pb-9 ${hasTopWatermark ? 'pt-16' : 'pt-9'}`}
      style={{ color: template.visuals.titleColor }}
    >
      <div
        className="absolute -right-20 top-20 size-60 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: template.visuals.accentColor }}
      />
      <div className="relative flex items-center justify-between">
        <span className="shrink-0 whitespace-nowrap text-[10px] font-bold tracking-[0.16em] opacity-55">STOP {padNumber(placeNumber)}</span>
        <span
          className="shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[9px] font-bold"
          style={{ backgroundColor: template.visuals.badgeBackground, color: template.visuals.badgeColor }}
        >
          {CATEGORY_LABELS[place.category]}
        </span>
      </div>
      <div className="relative mt-10">
        <span
          className="grid size-14 place-items-center rounded-2xl text-2xl font-bold text-white shadow-lg"
          style={{ backgroundColor: template.visuals.accentColor }}
        >
          {placeNumber}
        </span>
        <h2 className="mt-6 max-w-[12ch] text-4xl font-bold leading-tight tracking-tight">{place.name}</h2>
        {place.address ? <p className="mt-3 text-xs leading-5 opacity-60">{place.address}</p> : null}
      </div>
      {safeImageUrl ? (
        <div className="relative mt-5 h-40 overflow-hidden rounded-2xl border border-white/70 bg-white/55 shadow-sm">
          <img
            alt={place.name}
            className="size-full object-cover"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            src={safeImageUrl}
          />
        </div>
      ) : null}
      <div className="relative mt-auto rounded-2xl border border-white/70 bg-white/62 p-5 backdrop-blur">
        <p className="text-[9px] font-bold tracking-[0.18em] opacity-45">TRIP NOTE</p>
        <p className="mt-3 text-sm font-medium leading-6">
          {place.note ?? '把这里加入你的路线，留一点时间慢慢探索。'}
        </p>
      </div>
      <div className="relative mt-5 flex items-center justify-between text-[9px] font-semibold opacity-45">
        <span className="truncate pr-4">{project.title}</span>
        <span className="shrink-0 whitespace-nowrap">{placeNumber} / {project.places.length}</span>
      </div>
    </div>
  )
}

function padNumber(value: number): string {
  return String(value).padStart(2, '0')
}

export function CarouselExportFrames() {
  const project = useProjectStore((state) => state.project)
  const template = getTripTemplate(project.templateId)
  const pages = buildCarouselPages(project).filter((page) => page.type !== 'route')

  return (
    <div aria-hidden="true" className="pointer-events-none fixed left-[-10000px] top-0">
      {pages.map((page) => (
        <div
          data-carousel-export-frame
          id={getCarouselFrameId(page)}
          key={page.id}
          style={{
            background: `linear-gradient(145deg, ${template.visuals.gradientTop}, ${template.visuals.canvasBackground})`,
            height: FRAME_HEIGHTS[project.canvasRatio],
            width: FRAME_WIDTH,
          }}
        >
          {page.type === 'cover' ? <CoverPage project={project} /> : <PlacePage page={page} project={project} />}
          <WatermarkOverlay watermark={project.carousel.watermark} />
        </div>
      ))}
    </div>
  )
}
