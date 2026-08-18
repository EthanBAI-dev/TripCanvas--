import { z } from 'zod'
import type { Place } from '../../types/place.ts'
import {
  PLUGIN_ROUTE_IMPORT_TYPE,
  type PluginRouteImportMessage,
  type PluginRouteImportPayload,
} from '../../types/pluginImport.ts'
import { createId } from '../../utils/id.ts'

const categorySchema = z.enum([
  'start',
  'end',
  'food',
  'coffee',
  'shopping',
  'photo',
  'hotel',
  'sight',
  'transport',
  'custom',
])

const placeSchema = z.object({
  name: z.string().trim().min(1),
  address: z.string().trim().optional(),
  category: categorySchema.optional(),
  note: z.string().trim().optional(),
  imageUrl: z
    .url()
    .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), '图片仅支持 http/https 链接')
    .optional(),
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  externalUrl: z
    .url()
    .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), '仅支持 http/https 链接')
    .optional(),
  googlePlaceId: z.string().trim().min(1).optional(),
})

const payloadSchema = z.object({
  title: z.string().trim().min(1).optional(),
  subtitle: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  canvasRatio: z.enum(['3:4', '4:5', '9:16']).optional(),
  travelMode: z.enum(['walking', 'driving']).default('walking'),
  places: z.array(placeSchema).min(2).max(27),
})

const messageSchema = z.object({
  type: z.literal(PLUGIN_ROUTE_IMPORT_TYPE),
  payload: payloadSchema,
})

export function parsePluginRouteImport(value: unknown): PluginRouteImportMessage {
  const parsed = messageSchema.safeParse(value)
  if (!parsed.success) {
    throw new Error('插件数据格式不正确，请检查地点名称、坐标和链接。')
  }

  return parsed.data
}

function categoryForIndex(index: number, total: number): Place['category'] {
  if (index === 0) {
    return 'start'
  }
  if (index === total - 1) {
    return 'end'
  }
  return 'custom'
}

export function createPlacesFromPluginPayload(payload: PluginRouteImportPayload): Place[] {
  return payload.places.map((place, index) => ({
    ...place,
    id: createId('place'),
    category: place.category ?? categoryForIndex(index, payload.places.length),
    externalUrl:
      place.externalUrl ??
      (place.googlePlaceId
        ? `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(place.googlePlaceId)}`
        : undefined),
    source: 'google',
  }))
}
