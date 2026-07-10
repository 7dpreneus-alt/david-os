import { z } from 'zod'

import { baseEntitySchema } from '@/core/entities'
import type { Goal } from './types'

const goalMilestoneSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  done: z.boolean(),
  dueDate: z.string().optional(),
})

export const goalSchema = baseEntitySchema.extend({
  type: z.literal('goal'),
  kind: z.enum(['metric', 'milestone']),
  status: z.enum(['active', 'paused', 'achieved']),
  description: z.string().optional(),
  target: z.number().optional(),
  current: z.number().optional(),
  unit: z.string().optional(),
  milestones: z.array(goalMilestoneSchema),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
  completedAt: z.string().optional(),
  projectId: z.string().optional(),
  linkedIds: z.array(z.string()),
  meta: z.record(z.string(), z.unknown()).optional(),
}) as z.ZodType<Goal>

export interface GoalInput {
  title: string
  kind?: Goal['kind']
  status?: Goal['status']
  description?: string
  target?: number
  current?: number
  unit?: string
  milestones?: Goal['milestones']
  startDate?: string
  targetDate?: string
  projectId?: string
  tags?: string[]
  linkedIds?: string[]
  meta?: Record<string, unknown>
}
