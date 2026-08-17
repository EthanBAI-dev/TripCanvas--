import type { CanvasRatio, ExportSize, TripCanvasProject } from '../types/project.ts'
import type { CarouselSettings, WatermarkSettings } from '../types/carousel.ts'
import { createId } from './id.ts'

export const EXPORT_SIZES: Record<CanvasRatio, ExportSize> = {
  '3:4': { width: 1080, height: 1440 },
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
}

export const DEFAULT_WATERMARK: WatermarkSettings = {
  enabled: true,
  text: '旅图 TripCanvas',
  position: 'bottom-right',
  opacity: 0.58,
}

export function createDefaultCarouselSettings(): CarouselSettings {
  return {
    pageOrder: [],
    hiddenPageIds: [],
    watermark: { ...DEFAULT_WATERMARK },
  }
}

export function normalizeCarouselSettings(
  settings?: Partial<CarouselSettings>,
): CarouselSettings {
  return {
    pageOrder: settings?.pageOrder ?? [],
    hiddenPageIds: settings?.hiddenPageIds ?? [],
    watermark: {
      ...DEFAULT_WATERMARK,
      ...settings?.watermark,
    },
  }
}

export function createDefaultProject(): TripCanvasProject {
  const now = new Date().toISOString()

  return {
    id: createId('project'),
    title: '我的旅行路线图',
    subtitle: '跟着路线，慢慢认识一座城',
    city: 'Tokyo',
    theme: [],
    templateId: 'city-walk',
    canvasRatio: '3:4',
    exportSize: EXPORT_SIZES['3:4'],
    mapView: {
      center: { lng: 139.7671, lat: 35.6812 },
      zoom: 11,
      bearing: 0,
      pitch: 0,
    },
    places: [],
    routes: [],
    annotations: [],
    carousel: createDefaultCarouselSettings(),
    createdAt: now,
    updatedAt: now,
  }
}
