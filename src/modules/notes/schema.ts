import { z } from 'zod'

import { baseEntitySchema } from '@/core/entities'
import type { Note } from './types'

export const noteSchema = baseEntitySchema.extend({
  type: z.literal('note'),
  body: z.string(),
  pinned: z.boolean(),
  projectId: z.string().optional(),
  linkedIds: z.array(z.string()),
  meta: z.record(z.string(), z.unknown()).optional(),
}) as z.ZodType<Note>

export interface NoteInput {
  title: string
  body?: string
  pinned?: boolean
  projectId?: string
  tags?: string[]
  linkedIds?: string[]
  meta?: Record<string, unknown>
}
