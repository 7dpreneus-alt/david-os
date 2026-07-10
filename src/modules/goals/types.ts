import {
  ListChecks,
  PauseCircle,
  Target,
  Trophy,
  type LucideIcon,
} from 'lucide-react'

import type { BaseEntity } from '@/core/entities'

/**
 * Two goal shapes: metric goals track a number toward a target
 * (current/target/unit); milestone goals complete a checklist.
 */
export type GoalKind = 'metric' | 'milestone'

export type GoalStatus = 'active' | 'paused' | 'achieved'

export interface GoalMilestone {
  id: string
  title: string
  done: boolean
  dueDate?: string
}

export interface Goal extends BaseEntity {
  type: 'goal'
  kind: GoalKind
  status: GoalStatus
  description?: string
  /** Metric goals. */
  target?: number
  current?: number
  unit?: string
  /** Milestone goals. */
  milestones: GoalMilestone[]
  startDate?: string
  targetDate?: string
  /**
   * Universal completion stamp (duck-typed by the Projects derivation
   * engine and any future consumer) — set when the goal is achieved.
   */
  completedAt?: string
  projectId?: string
  linkedIds: string[]
  meta?: Record<string, unknown>
}

export const GOAL_KINDS: Array<{ value: GoalKind; label: string; icon: LucideIcon }> = [
  { value: 'metric', label: 'Metric', icon: Target },
  { value: 'milestone', label: 'Milestones', icon: ListChecks },
]

export const GOAL_STATUSES: Array<{ value: GoalStatus; label: string; icon: LucideIcon }> = [
  { value: 'active', label: 'Active', icon: Target },
  { value: 'paused', label: 'Paused', icon: PauseCircle },
  { value: 'achieved', label: 'Achieved', icon: Trophy },
]
