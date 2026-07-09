import type { BaseEntity } from '@/core/entities/types'

/** Payloads for events emitted automatically by repositories. */
export interface EntityCreatedPayload {
  collection: string
  entity: BaseEntity
}

export interface EntityUpdatedPayload {
  collection: string
  entity: BaseEntity
  previous: BaseEntity
}

export interface EntityDeletedPayload {
  collection: string
  entity: BaseEntity
}

/**
 * Events with kernel-guaranteed payload shapes. Modules may emit additional
 * domain events (e.g. "task.completed") as plain string events — those are
 * typed at the subscription site.
 */
export interface CoreEventMap {
  'entity.created': EntityCreatedPayload
  'entity.updated': EntityUpdatedPayload
  'entity.deleted': EntityDeletedPayload
}

export type CoreEventName = keyof CoreEventMap

export type EventHandler<P = unknown> = (payload: P) => void

export type Unsubscribe = () => void
