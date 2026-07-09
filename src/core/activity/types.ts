import { z } from 'zod'

import { baseEntitySchema } from '@/core/entities'
import type { BaseEntity, EntityRef } from '@/core/entities'

export type ActivityVerb = 'created' | 'updated' | 'deleted' | (string & {})

export type ActivityActor = 'user' | { agentId: string }

/**
 * Activity Timeline record (ADR-016). One is written for every entity
 * mutation; activities are entities themselves, so the timeline is
 * persisted, exportable, and searchable like everything else.
 */
export interface Activity extends BaseEntity {
  type: 'activity'
  verb: ActivityVerb
  entityRef: EntityRef
  actor: ActivityActor
  /** Shallow field diff for updates: { field: { from, to } }. */
  changes?: Record<string, { from: unknown; to: unknown }>
}

export const activitySchema = baseEntitySchema.extend({
  type: z.literal('activity'),
  verb: z.string().min(1),
  entityRef: z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
  }),
  actor: z.union([z.literal('user'), z.object({ agentId: z.string() })]),
  changes: z
    .record(z.string(), z.object({ from: z.unknown(), to: z.unknown() }))
    .optional(),
}) as z.ZodType<Activity>
