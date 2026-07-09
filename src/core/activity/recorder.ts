import { newId } from '@/lib/id'
import type { BaseEntity } from '@/core/entities'
import { events, type Unsubscribe } from '@/core/events'
import { createRepository } from '@/core/storage'
import { activitySchema, type Activity, type ActivityVerb } from './types'

export const activityRepository = createRepository<Activity>(
  'activities',
  activitySchema
)

/**
 * Types whose mutations are not recorded, preventing recursion (an activity
 * about an activity) and noise (notification churn) — ADR-016.
 */
const EXCLUDED_TYPES = new Set(['activity', 'notification'])

/** Fields whose changes are bookkeeping, not user-meaningful edits. */
const IGNORED_FIELDS = new Set(['updatedAt'])

function shallowDiff(
  previous: BaseEntity,
  next: BaseEntity
): Record<string, { from: unknown; to: unknown }> | undefined {
  const changes: Record<string, { from: unknown; to: unknown }> = {}
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)])
  for (const key of keys) {
    if (IGNORED_FIELDS.has(key)) continue
    const from = (previous as unknown as Record<string, unknown>)[key]
    const to = (next as unknown as Record<string, unknown>)[key]
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes[key] = { from, to }
    }
  }
  return Object.keys(changes).length ? changes : undefined
}

async function record(
  verb: ActivityVerb,
  entity: BaseEntity,
  changes?: Activity['changes']
): Promise<void> {
  if (EXCLUDED_TYPES.has(entity.type)) return
  const now = new Date().toISOString()
  const activity: Activity = {
    id: newId(),
    type: 'activity',
    title: `${verb} ${entity.type} "${entity.title}"`,
    createdAt: now,
    updatedAt: now,
    tags: [],
    verb,
    entityRef: { id: entity.id, type: entity.type, title: entity.title },
    actor: 'user',
    ...(changes ? { changes } : {}),
  }
  await activityRepository.put(activity)
}

/**
 * Attach the Activity Timeline to the event bus. Every repository mutation
 * of a non-excluded entity type produces an activity record.
 */
export function startActivityRecorder(): Unsubscribe {
  const subscriptions = [
    events.on('entity.created', ({ entity }) => {
      void record('created', entity)
    }),
    events.on('entity.updated', ({ entity, previous }) => {
      void record('updated', entity, shallowDiff(previous, entity))
    }),
    events.on('entity.deleted', ({ entity }) => {
      void record('deleted', entity)
    }),
  ]
  return () => subscriptions.forEach((unsubscribe) => unsubscribe())
}
