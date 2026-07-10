import type { BaseEntity } from '@/core/entities'

export interface Note extends BaseEntity {
  type: 'note'
  /** Markdown source. */
  body: string
  pinned: boolean
  projectId?: string
  linkedIds: string[]
  meta?: Record<string, unknown>
}
