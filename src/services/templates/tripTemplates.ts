import type { Annotation } from '../../types/annotation.ts'
import type { TripCanvasProject } from '../../types/project.ts'
import type { Route } from '../../types/route.ts'
import type { TripTemplate, TripTemplateId } from '../../types/template.ts'
import { EXPORT_SIZES } from '../../utils/project.ts'

export const TRIP_TEMPLATES: readonly TripTemplate[] = [
  {
    id: 'city-walk',
    name: '城市漫步',
    description: '清爽、轻量的 City Walk 路线',
    badge: 'CITY WALK',
    canvasRatio: '3:4',
    defaultSubtitle: '跟着路线，慢慢认识一座城',
    visuals: {
      accentColor: '#0f9d94',
      badgeBackground: 'rgba(255, 255, 255, 0.82)',
      badgeColor: '#0a756f',
      canvasBackground: '#d9ecee',
      gradientBottom: 'rgba(23, 52, 61, 0.14)',
      gradientTop: 'rgba(245, 249, 250, 0.62)',
      labelBackground: '#ffffff',
      labelColor: '#17343d',
      titleColor: '#17343d',
    },
  },
  {
    id: 'one-day',
    name: '一日精华',
    description: '适合景点密集的一日路线',
    badge: 'ONE DAY',
    canvasRatio: '4:5',
    defaultSubtitle: '一天时间，把城市精华串起来',
    visuals: {
      accentColor: '#2563eb',
      badgeBackground: 'rgba(239, 246, 255, 0.9)',
      badgeColor: '#1d4ed8',
      canvasBackground: '#dce9f8',
      gradientBottom: 'rgba(30, 58, 138, 0.16)',
      gradientTop: 'rgba(239, 246, 255, 0.68)',
      labelBackground: '#eff6ff',
      labelColor: '#172554',
      titleColor: '#172554',
    },
  },
  {
    id: 'coffee-hop',
    name: '咖啡巡游',
    description: '探店、咖啡与街角停留',
    badge: 'COFFEE HOP',
    canvasRatio: '3:4',
    defaultSubtitle: '咖啡、街角与停下来的一小时',
    visuals: {
      accentColor: '#7c3aed',
      badgeBackground: 'rgba(245, 243, 255, 0.9)',
      badgeColor: '#6d28d9',
      canvasBackground: '#e9e3f5',
      gradientBottom: 'rgba(76, 29, 149, 0.16)',
      gradientTop: 'rgba(250, 245, 255, 0.68)',
      labelBackground: '#faf5ff',
      labelColor: '#3b0764',
      titleColor: '#3b0764',
    },
  },
  {
    id: 'photo-spots',
    name: '拍照机位',
    description: '适合竖版分享的拍照路线',
    badge: 'PHOTO SPOTS',
    canvasRatio: '9:16',
    defaultSubtitle: '把值得按下快门的地点连成一条线',
    visuals: {
      accentColor: '#0284c7',
      badgeBackground: 'rgba(240, 249, 255, 0.9)',
      badgeColor: '#0369a1',
      canvasBackground: '#dceef4',
      gradientBottom: 'rgba(12, 74, 110, 0.17)',
      gradientTop: 'rgba(240, 249, 255, 0.7)',
      labelBackground: '#f0f9ff',
      labelColor: '#082f49',
      titleColor: '#082f49',
    },
  },
]

const DEFAULT_TEMPLATE = TRIP_TEMPLATES[0]

export function getTripTemplate(templateId: TripTemplateId | undefined): TripTemplate {
  return TRIP_TEMPLATES.find((template) => template.id === templateId) ?? DEFAULT_TEMPLATE
}

export function styleRoutesAndAnnotations(
  templateId: TripTemplateId | undefined,
  routes: Route[],
  annotations: Annotation[],
) {
  const template = getTripTemplate(templateId)

  return {
    routes: routes.map((route) => ({
      ...route,
      style: { ...route.style, color: template.visuals.accentColor },
    })),
    annotations: annotations.map((annotation) => {
      if (annotation.type === 'pin') {
        return {
          ...annotation,
          style: { ...annotation.style, backgroundColor: template.visuals.accentColor },
        }
      }

      if (annotation.type === 'label') {
        return {
          ...annotation,
          style: {
            ...annotation.style,
            backgroundColor: template.visuals.labelBackground,
            color: template.visuals.labelColor,
          },
        }
      }

      return annotation
    }),
  }
}

export function applyTripTemplate(
  project: TripCanvasProject,
  templateId: TripTemplateId,
): TripCanvasProject {
  const template = getTripTemplate(templateId)
  const styledContent = styleRoutesAndAnnotations(templateId, project.routes, project.annotations)

  return {
    ...project,
    templateId,
    subtitle: template.defaultSubtitle,
    canvasRatio: template.canvasRatio,
    exportSize: EXPORT_SIZES[template.canvasRatio],
    routes: styledContent.routes,
    annotations: styledContent.annotations,
    updatedAt: new Date().toISOString(),
  }
}
