import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Annotation } from '../types/annotation.ts'
import type { WatermarkSettings } from '../types/carousel.ts'
import type { Place } from '../types/place.ts'
import type { Route, RouteStyle } from '../types/route.ts'
import type { CanvasRatio, ExportSize, MapView, TripCanvasProject } from '../types/project.ts'
import type { TripTemplateId } from '../types/template.ts'
import { migrateProjectTheme } from '../services/storage/migrateProjectTheme.ts'
import { PROJECT_STORAGE_KEY } from '../services/storage/projectStorage.ts'
import { applyTripTemplate, styleRoutesAndAnnotations } from '../services/templates/tripTemplates.ts'
import {
  EXPORT_SIZES,
  createDefaultProject,
  normalizeCarouselSettings,
} from '../utils/project.ts'

interface ProjectState {
  project: TripCanvasProject
  setProject: (project: TripCanvasProject) => void
  updateProject: (patch: Partial<TripCanvasProject>) => void
  setMapView: (mapView: MapView) => void
  setCanvasRatio: (canvasRatio: CanvasRatio) => void
  setExportSize: (exportSize: ExportSize) => void
  setGeneratedMapContent: (content: {
    places: Place[]
    route: Route | null
    annotations: Annotation[]
  }) => void
  addAnnotation: (annotation: Annotation) => void
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void
  removeAnnotation: (id: string) => void
  updateRouteStyle: (id: string, style: Partial<RouteStyle>) => void
  updatePlace: (id: string, patch: Partial<Omit<Place, 'id' | 'lng' | 'lat'>>) => void
  setCarouselPageIncluded: (pageId: string, included: boolean) => void
  setCarouselPageOrder: (pageIds: string[]) => void
  updateWatermark: (patch: Partial<WatermarkSettings>) => void
  applyTemplate: (templateId: TripTemplateId) => void
}

function migrateRouteLegs(project: TripCanvasProject): TripCanvasProject {
  return {
    ...project,
    routes: project.routes.map((route) => {
      if (Array.isArray(route.legs)) {
        return route
      }

      const segmentCount = Math.max(1, route.placeIds.length - 1)
      const distancePerLeg = Math.round((route.distanceMeters ?? 0) / segmentCount)
      const durationPerLeg = Math.round((route.durationSeconds ?? 0) / segmentCount)
      const legs = route.placeIds.slice(1).flatMap((toPlaceId, index) => {
        const fromPlaceId = route.placeIds[index]
        const fromPlace = project.places.find((place) => place.id === fromPlaceId)
        const toPlace = project.places.find((place) => place.id === toPlaceId)
        if (!fromPlace || !toPlace) {
          return []
        }

        return [{
          id: `leg-${route.id}-${index + 1}`,
          fromPlaceId,
          toPlaceId,
          geometry: [
            { lng: fromPlace.lng, lat: fromPlace.lat },
            { lng: toPlace.lng, lat: toPlace.lat },
          ],
          distanceMeters: distancePerLeg,
          durationSeconds: durationPerLeg,
        }]
      })

      return { ...route, legs }
    }),
  }
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      project: createDefaultProject(),
      setProject: (project) => set({ project: migrateRouteLegs(project) }),
      updateProject: (patch) =>
        set((state) => ({
          project: {
            ...state.project,
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        })),
      setMapView: (mapView) =>
        set((state) => ({
          project: { ...state.project, mapView, updatedAt: new Date().toISOString() },
        })),
      setCanvasRatio: (canvasRatio) =>
        set((state) => ({
          project: {
            ...state.project,
            canvasRatio,
            exportSize: EXPORT_SIZES[canvasRatio],
            updatedAt: new Date().toISOString(),
          },
        })),
      setExportSize: (exportSize) =>
        set((state) => ({
          project: { ...state.project, exportSize, updatedAt: new Date().toISOString() },
        })),
      setGeneratedMapContent: ({ places, route, annotations }) =>
        set((state) => {
          const styledContent = styleRoutesAndAnnotations(
            state.project.templateId,
            route ? [route] : [],
            annotations,
          )

          return {
            project: {
              ...state.project,
              places,
              routes: styledContent.routes,
              annotations: styledContent.annotations,
              updatedAt: new Date().toISOString(),
            },
          }
        }),
      addAnnotation: (annotation) =>
        set((state) => ({
          project: {
            ...state.project,
            annotations: [...state.project.annotations, annotation],
            updatedAt: new Date().toISOString(),
          },
        })),
      updateAnnotation: (id, patch) =>
        set((state) => ({
          project: {
            ...state.project,
            annotations: state.project.annotations.map((annotation) =>
              annotation.id === id
                ? {
                    ...annotation,
                    ...patch,
                    style: patch.style ? { ...annotation.style, ...patch.style } : annotation.style,
                  }
                : annotation,
            ),
            updatedAt: new Date().toISOString(),
          },
        })),
      removeAnnotation: (id) =>
        set((state) => ({
          project: {
            ...state.project,
            annotations: state.project.annotations.filter((annotation) => annotation.id !== id),
            updatedAt: new Date().toISOString(),
          },
        })),
      updateRouteStyle: (id, style) =>
        set((state) => ({
          project: {
            ...state.project,
            routes: state.project.routes.map((route) =>
              route.id === id ? { ...route, style: { ...route.style, ...style } } : route,
            ),
            updatedAt: new Date().toISOString(),
          },
        })),
      updatePlace: (id, patch) =>
        set((state) => ({
          project: {
            ...state.project,
            places: state.project.places.map((place) =>
              place.id === id ? { ...place, ...patch } : place,
            ),
            annotations: state.project.annotations.map((annotation) =>
              annotation.placeId === id && annotation.type === 'label' && patch.name !== undefined
                ? { ...annotation, text: patch.name }
                : annotation,
            ),
            updatedAt: new Date().toISOString(),
          },
        })),
      setCarouselPageIncluded: (pageId, included) =>
        set((state) => {
          const carousel = normalizeCarouselSettings(state.project.carousel)
          const hiddenPageIds = included
            ? carousel.hiddenPageIds.filter((id) => id !== pageId)
            : [...new Set([...carousel.hiddenPageIds, pageId])]

          return {
            project: {
              ...state.project,
              carousel: { ...carousel, hiddenPageIds },
              updatedAt: new Date().toISOString(),
            },
          }
        }),
      setCarouselPageOrder: (pageIds) =>
        set((state) => ({
          project: {
            ...state.project,
            carousel: {
              ...normalizeCarouselSettings(state.project.carousel),
              pageOrder: [...pageIds],
            },
            updatedAt: new Date().toISOString(),
          },
        })),
      updateWatermark: (patch) =>
        set((state) => {
          const carousel = normalizeCarouselSettings(state.project.carousel)
          return {
            project: {
              ...state.project,
              carousel: {
                ...carousel,
                watermark: { ...carousel.watermark, ...patch },
              },
              updatedAt: new Date().toISOString(),
            },
          }
        }),
      applyTemplate: (templateId) =>
        set((state) => ({ project: applyTripTemplate(state.project, templateId) })),
    }),
    {
      name: PROJECT_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 5,
      migrate: (persistedState, version) => {
        const state = persistedState as ProjectState
        const themedProject = version < 2 ? migrateProjectTheme(state.project) : state.project
        const templateProject =
          version < 3
            ? { ...themedProject, templateId: themedProject.templateId ?? ('city-walk' as const) }
            : themedProject
        const project = migrateRouteLegs({
          ...templateProject,
          carousel: normalizeCarouselSettings(templateProject.carousel),
        })
        return { ...state, project }
      },
    },
  ),
)
