import { z } from 'zod'
import type { AiRoutePlan } from '../../types/aiRoutePlan.ts'

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

export const aiRoutePlanSchema: z.ZodType<AiRoutePlan> = z.object({
  title: z.string().trim().min(1).max(80),
  subtitle: z.string().trim().min(1).max(120).optional(),
  city: z.string().trim().min(1).max(80),
  canvasRatio: z.enum(['3:4', '4:5', '9:16']).optional(),
  places: z
    .array(z.object({
      name: z.string().trim().min(1).max(100),
      searchQuery: z.string().trim().min(1).max(180).optional(),
      category: categorySchema,
      note: z.string().trim().min(1).max(120),
      arrivalMode: z.enum(['walking', 'driving']).optional(),
    }))
    .min(2)
    .max(12),
})

