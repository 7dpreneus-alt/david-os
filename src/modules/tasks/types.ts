import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Circle,
  Minus,
  OctagonPause,
  PlayCircle,
  type LucideIcon,
} from 'lucide-react'

import type { BaseEntity } from '@/core/entities'

export type TaskStatus = 'todo' | 'in-progress' | 'blocked' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task extends BaseEntity {
  type: 'task'
  status: TaskStatus
  priority: TaskPriority
  description?: string
  /** ISO date (yyyy-mm-dd) the task is due. */
  dueDate?: string
  /** Set when status transitions to "done". */
  completedAt?: string
  // Relationships (ADR-004). Ids reference entities that may live in
  // modules this one knows nothing about.
  projectId?: string
  goalId?: string
  parentTaskId?: string
  /** Arbitrary related entity ids beyond the typed relations above. */
  linkedIds: string[]
}

export interface TaskStatusOption {
  value: TaskStatus
  label: string
  icon: LucideIcon
}

export interface TaskPriorityOption {
  value: TaskPriority
  label: string
  icon: LucideIcon
}

export const TASK_STATUSES: TaskStatusOption[] = [
  { value: 'todo', label: 'To do', icon: Circle },
  { value: 'in-progress', label: 'In progress', icon: PlayCircle },
  { value: 'blocked', label: 'Blocked', icon: OctagonPause },
  { value: 'done', label: 'Done', icon: CheckCircle2 },
]

export const TASK_PRIORITIES: TaskPriorityOption[] = [
  { value: 'low', label: 'Low', icon: ArrowDown },
  { value: 'medium', label: 'Medium', icon: Minus },
  { value: 'high', label: 'High', icon: ArrowUp },
  { value: 'urgent', label: 'Urgent', icon: AlertTriangle },
]
