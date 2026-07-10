import { allEntityTypes, links, type BaseEntity } from '@/core/entities'
import { getStorageAdapter } from '@/core/storage'
import type { Project, ProjectHealth } from './types'

/**
 * Derivation engine for project progress and health (requirement: derived,
 * never duplicated state).
 *
 * Children are discovered through the kernel only — never by importing
 * another module: (1) any registered entity carrying a `projectId`
 * back-reference, (2) the central link store, (3) the project's own
 * `linkedIds`. Completion semantics are duck-typed from common fields
 * (status / completedAt / done / current+target), so Tasks, Goals, future
 * Fitness workouts, or CRM deals all participate without Projects knowing
 * their types.
 */

type ChildEntity = BaseEntity & Record<string, unknown>

/** System types that never count as project work items. */
const SYSTEM_TYPES = new Set([
  'project',
  'activity',
  'notification',
  'workspace',
  'widget-instance',
  'memory',
  'workflow',
  'workflow-run',
])

export interface CompletionSignal {
  done: boolean
  blocked: boolean
  overdue: boolean
}

/**
 * Duck-typed completion semantics. Returns undefined when the entity
 * exposes no recognizable completion state (it then doesn't count toward
 * progress).
 */
export function completionSignal(
  entity: ChildEntity,
  today: string
): CompletionSignal | undefined {
  const status = typeof entity.status === 'string' ? entity.status : undefined
  const completedAt =
    typeof entity.completedAt === 'string' && entity.completedAt.length > 0
  const doneFlag = entity.done === true
  const target = typeof entity.target === 'number' ? entity.target : undefined
  const current = typeof entity.current === 'number' ? entity.current : 0

  if (status === undefined && !completedAt && !doneFlag && target === undefined) {
    return undefined
  }

  const done =
    completedAt ||
    doneFlag ||
    status === 'done' ||
    status === 'completed' ||
    (target !== undefined && current >= target)
  const blocked = !done && status === 'blocked'
  const dueDate = typeof entity.dueDate === 'string' ? entity.dueDate : undefined
  const overdue = !done && dueDate !== undefined && dueDate < today

  return { done, blocked, overdue }
}

/** All entities related to a project, discovered via the kernel. */
export async function projectChildren(project: Project): Promise<ChildEntity[]> {
  const adapter = getStorageAdapter()
  const linkRecords = await links.for(project.id)
  const relatedIds = new Set([
    ...project.linkedIds,
    ...linkRecords.map((l) => (l.fromId === project.id ? l.toId : l.fromId)),
  ])

  const children: ChildEntity[] = []
  const seen = new Set<string>()
  for (const def of allEntityTypes()) {
    if (SYSTEM_TYPES.has(def.type)) continue
    const records = await adapter.list<ChildEntity>(def.collection)
    for (const record of records) {
      if (!record || typeof record !== 'object') continue
      const id = record.id
      if (typeof id !== 'string' || seen.has(id)) continue
      if (record.projectId === project.id || relatedIds.has(id)) {
        children.push(record)
        seen.add(id)
      }
    }
  }
  return children
}

export interface ProjectProgress {
  /** Linked entities with completion semantics. */
  items: number
  itemsDone: number
  milestones: number
  milestonesDone: number
  /** 0–100, undefined when there is nothing countable yet. */
  percent?: number
}

export interface ProjectHealthReport {
  health: ProjectHealth
  /** Human-readable justification derived from the underlying data. */
  reasons: string[]
}

export interface ProjectInsights {
  progress: ProjectProgress
  health: ProjectHealthReport
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function deriveProgress(
  project: Project,
  children: ChildEntity[],
  todayDate = today()
): ProjectProgress {
  let items = 0
  let itemsDone = 0
  for (const child of children) {
    const signal = completionSignal(child, todayDate)
    if (!signal) continue
    items++
    if (signal.done) itemsDone++
  }
  const milestones = project.milestones.length
  const milestonesDone = project.milestones.filter((m) => m.done).length
  const total = items + milestones
  const done = itemsDone + milestonesDone

  return {
    items,
    itemsDone,
    milestones,
    milestonesDone,
    percent:
      project.status === 'completed'
        ? 100
        : total > 0
          ? Math.round((100 * done) / total)
          : undefined,
  }
}

export function deriveHealth(
  project: Project,
  children: ChildEntity[],
  todayDate = today()
): ProjectHealthReport {
  if (project.status === 'completed') {
    return { health: 'completed', reasons: ['Project is marked completed'] }
  }

  const signals = children
    .map((c) => completionSignal(c, todayDate))
    .filter((s): s is CompletionSignal => s !== undefined)

  const blocked = signals.filter((s) => s.blocked).length
  if (blocked > 0) {
    return {
      health: 'blocked',
      reasons: [`${blocked} linked item${blocked === 1 ? ' is' : 's are'} blocked`],
    }
  }

  const reasons: string[] = []
  if (project.targetDate && project.targetDate < todayDate) {
    reasons.push(`Target date ${project.targetDate} has passed`)
  }
  const overdue = signals.filter((s) => s.overdue).length
  if (overdue > 0) {
    reasons.push(`${overdue} linked item${overdue === 1 ? ' is' : 's are'} overdue`)
  }
  const lateMilestones = project.milestones.filter(
    (m) => !m.done && m.dueDate && m.dueDate < todayDate
  ).length
  if (lateMilestones > 0) {
    reasons.push(
      `${lateMilestones} milestone${lateMilestones === 1 ? ' is' : 's are'} past due`
    )
  }
  if (project.status === 'paused') {
    reasons.push('Project is paused')
  }

  if (reasons.length > 0) {
    return { health: 'at-risk', reasons }
  }
  return { health: 'on-track', reasons: ['No blockers or overdue work'] }
}

/** One child sweep feeding both derivations. */
export async function projectInsights(project: Project): Promise<ProjectInsights> {
  const children = await projectChildren(project)
  const todayDate = today()
  return {
    progress: deriveProgress(project, children, todayDate),
    health: deriveHealth(project, children, todayDate),
  }
}
