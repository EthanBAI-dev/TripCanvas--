import { z } from 'zod'
import type { TripDraft } from '../../types/tripDraft.ts'

export const tripDraftSchema: z.ZodType<TripDraft> = z.object({
  title: z.string().trim().min(1),
  city: z.string().trim().min(1),
  theme: z.array(z.string().trim().min(1)),
  travelMode: z.enum(['walking', 'driving', 'transit', 'cycling']),
  places: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        category: z.enum([
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
        ]),
        note: z.string().trim().min(1).optional(),
      }),
    )
    .min(2),
  styleSuggestion: z.object({
    routeColor: z.string().regex(/^#[0-9a-f]{6}$/i),
    labelStyle: z.enum(['xiaohongshu', 'minimal']),
    canvasRatio: z.enum(['3:4', '4:5', '9:16', '1:1']),
  }),
})
