import { z } from 'zod'

import { baseEntitySchema } from '@/core/entities'
import type { Project } from './types'

const milestoneSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  done: z.boolean(),
  dueDate: z.string().optional(),
})

export const projectSchema = baseEntitySchema.extend({
  type: z.literal('project'),
  status: z.enum(['planning', 'active', 'paused', 'completed']),
  description: z.string().optional(),
  owner: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
  completedAt: z.string().optional(),
  milestones: z.array(milestoneSchema),
  linkedIds: z.array(z.string()),
  meta: z.record(z.string(), z.unknown()).optional(),
}) as z.ZodType<Project>

/** Fields a user supplies when creating a project; the rest is stamped. */
export interface ProjectInput {
  title: string
  status?: Project['status']
  description?: string
  owner?: string
  priority?: Project['priority']
  startDate?: string
  targetDate?: string
  tags?: string[]
  milestones?: Project['milestones']
  linkedIds?: string[]
  meta?: Record<string, unknown>
}
