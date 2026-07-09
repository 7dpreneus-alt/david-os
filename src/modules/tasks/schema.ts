import { z } from 'zod'

import { baseEntitySchema } from '@/core/entities'
import type { Task } from './types'

export const taskSchema = baseEntitySchema.extend({
  type: z.literal('task'),
  status: z.enum(['todo', 'in-progress', 'blocked', 'done']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  completedAt: z.string().optional(),
  projectId: z.string().optional(),
  goalId: z.string().optional(),
  parentTaskId: z.string().optional(),
  linkedIds: z.array(z.string()),
}) as z.ZodType<Task>

/** Fields a user supplies when creating a task; the rest is stamped. */
export interface TaskInput {
  title: string
  status?: Task['status']
  priority?: Task['priority']
  description?: string
  dueDate?: string
  tags?: string[]
  projectId?: string
  goalId?: string
  parentTaskId?: string
  linkedIds?: string[]
}
