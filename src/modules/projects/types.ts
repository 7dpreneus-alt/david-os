import {
  CheckCircle2,
  CircleDashed,
  PauseCircle,
  PlayCircle,
  type LucideIcon,
} from 'lucide-react'

import type { BaseEntity } from '@/core/entities'

/** Stored lifecycle. Archival uses BaseEntity.archived. */
export type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed'

export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Milestone {
  id: string
  title: string
  done: boolean
  dueDate?: string
}

/**
 * Orchestration entity: a project coordinates work that lives in other
 * modules. Children are discovered, never contained — via projectId
 * back-references, the central link store, and linkedIds. Progress and
 * health are DERIVED from those children (see derive.ts), not stored.
 */
export interface Project extends BaseEntity {
  type: 'project'
  status: ProjectStatus
  description?: string
  /** BaseEntity.tags doubles as labels — no parallel label field. */
  owner?: string
  priority?: ProjectPriority
  startDate?: string
  targetDate?: string
  completedAt?: string
  milestones: Milestone[]
  /** Arbitrary related entity ids across any module. */
  linkedIds: string[]
  /** Open extension point for module-specific metadata. */
  meta?: Record<string, unknown>
}

/** Derived, never persisted. */
export type ProjectHealth = 'on-track' | 'at-risk' | 'blocked' | 'completed'

export interface ProjectStatusOption {
  value: ProjectStatus
  label: string
  icon: LucideIcon
}

export const PROJECT_STATUSES: ProjectStatusOption[] = [
  { value: 'planning', label: 'Planning', icon: CircleDashed },
  { value: 'active', label: 'Active', icon: PlayCircle },
  { value: 'paused', label: 'Paused', icon: PauseCircle },
  { value: 'completed', label: 'Completed', icon: CheckCircle2 },
]

export const PROJECT_PRIORITIES: Array<{ value: ProjectPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export const PROJECT_HEALTH_META: Record<
  ProjectHealth,
  { label: string; colorVar: string }
> = {
  'on-track': { label: 'On track', colorVar: '--chart-3' },
  'at-risk': { label: 'At risk', colorVar: '--chart-4' },
  blocked: { label: 'Blocked', colorVar: '--destructive' },
  completed: { label: 'Completed', colorVar: '--chart-1' },
}
