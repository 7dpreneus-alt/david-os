import type { z } from 'zod'
import type { LucideIcon } from 'lucide-react'

/**
 * Universal entity model (ADR-004). Every domain object in DavidOS —
 * including system records like workspaces, notifications, and activities —
 * extends BaseEntity so persistence, search, linking, and export are uniform.
 */
export interface BaseEntity {
  id: string
  /** Entity-type registry key, e.g. "task", "note", "activity". */
  type: string
  title: string
  createdAt: string
  updatedAt: string
  tags: string[]
  archived?: boolean
}

/** Lightweight pointer to an entity, safe to embed in other records. */
export interface EntityRef {
  id: string
  type: string
  title: string
}

/** Cross-module relationship stored in the central link store. */
export interface EntityLink {
  id: string
  fromId: string
  toId: string
  kind: string
  createdAt: string
}

/** Registration for one entity type, contributed by a module manifest. */
export interface EntityTypeDef<T extends BaseEntity = BaseEntity> {
  type: string
  module: string
  /** Storage collection the type persists to. */
  collection: string
  schema: z.ZodType<T>
  icon?: LucideIcon
  labels: { singular: string; plural: string }
  /** Text used by the universal search index (Phase 4). */
  searchText?: (entity: T) => string
}
