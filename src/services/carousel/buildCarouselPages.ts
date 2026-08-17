import type { CarouselPage } from '../../types/carousel.ts'
import type { TripCanvasProject } from '../../types/project.ts'

function formatRouteSummary(project: TripCanvasProject): string {
  const route = project.routes[0]
  const distance = route?.distanceMeters
    ? `${(route.distanceMeters / 1_000).toFixed(1)} km`
    : '距离待计算'
  const duration = route?.durationSeconds
    ? `${Math.max(1, Math.round(route.durationSeconds / 60))} 分钟`
    : '时间待计算'

  return `${project.places.length} 个地点 · ${distance} · ${duration}`
}

export function buildCarouselPages(project: TripCanvasProject): CarouselPage[] {
  const hiddenPageIds = new Set(project.carousel.hiddenPageIds)
  const basePages: CarouselPage[] = [
    {
      id: 'cover',
      index: 0,
      type: 'cover',
      title: project.title,
      subtitle: project.subtitle,
      included: !hiddenPageIds.has('cover'),
    },
    {
      id: 'route',
      index: 1,
      type: 'route',
      title: '完整路线',
      subtitle: formatRouteSummary(project),
      included: !hiddenPageIds.has('route'),
    },
  ]

  const placePages = project.places.map<CarouselPage>((place, index) => ({
    id: `place-${place.id}`,
    index: index + basePages.length,
    type: 'place',
    title: place.name,
    subtitle: place.note ?? place.address,
    placeId: place.id,
    placeIndex: index,
    included: !hiddenPageIds.has(`place-${place.id}`),
  }))

  const pages = [...basePages, ...placePages]
  const pagesById = new Map(pages.map((page) => [page.id, page]))
  const orderedPages = project.carousel.pageOrder.flatMap((id) => {
    const page = pagesById.get(id)
    if (!page) {
      return []
    }

    pagesById.delete(id)
    return [page]
  })

  return [...orderedPages, ...pagesById.values()].map((page, index) => ({ ...page, index }))
}

export function getIncludedCarouselPages(project: TripCanvasProject): CarouselPage[] {
  return buildCarouselPages(project).filter((page) => page.included)
}

export function getCarouselFrameId(page: CarouselPage): string {
  return page.type === 'route' ? 'tripcanvas-export-frame' : `tripcanvas-carousel-frame-${page.id}`
}
