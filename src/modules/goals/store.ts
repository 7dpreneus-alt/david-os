import { create } from 'zustand'

import { newId } from '@/lib/id'
import { events } from '@/core/events'
import { createRepository } from '@/core/storage'
import { goalSchema, type GoalInput } from './schema'
import { goalProgress } from './progress'
import type { Goal } from './types'

/** All persistence flows through the kernel repository (ADR-005). */
export const goalsRepository = createRepository<Goal>('goals', goalSchema)

interface GoalsState {
  goals: Goal[]
  hydrated: boolean
  hydrate: () => Promise<void>
  create: (input: GoalInput) => Promise<Goal>
  update: (id: string, patch: Partial<Goal>) => Promise<Goal | undefined>
  /** Record a new current value on a metric goal (auto-achieves at target). */
  logProgress: (id: string, current: number) => Promise<Goal | undefined>
  /** Toggle one milestone (auto-achieves when all are done). */
  toggleMilestone: (id: string, milestoneId: string) => Promise<Goal | undefined>
  achieve: (id: string) => Promise<Goal | undefined>
  remove: (id: string) => Promise<void>
}

let hydration: Promise<void> | undefined

export const useGoalsStore = create<GoalsState>((set, get) => ({
  goals: [],
  hydrated: false,

  async hydrate() {
    hydration ??= goalsRepository.list().then((goals) => {
      set({ goals: sort(goals), hydrated: true })
    })
    return hydration
  },

  async create(input) {
    const now = new Date().toISOString()
    const goal: Goal = {
      id: newId(),
      type: 'goal',
      title: input.title,
      createdAt: now,
      updatedAt: now,
      tags: input.tags ?? [],
      kind: input.kind ?? (input.milestones?.length ? 'milestone' : 'metric'),
      status: input.status ?? 'active',
      description: input.description,
      target: input.target,
      current: input.current ?? (input.target !== undefined ? 0 : undefined),
      unit: input.unit,
      milestones: input.milestones ?? [],
      startDate: input.startDate,
      targetDate: input.targetDate,
      projectId: input.projectId,
      linkedIds: input.linkedIds ?? [],
      meta: input.meta,
    }
    const saved = await goalsRepository.put(goal)
    set({ goals: sort([...get().goals, saved]) })
    return saved
  },

  async update(id, patch) {
    const current = get().goals.find((g) => g.id === id)
    if (!current) return undefined
    const saved = await goalsRepository.put({ ...current, ...patch, id })
    set({ goals: sort(get().goals.map((g) => (g.id === id ? saved : g))) })
    return saved
  },

  async logProgress(id, current) {
    const saved = await get().update(id, { current })
    if (!saved) return undefined
    events.emit('goal.progress', { goalId: id, current, goal: saved })
    return maybeAutoAchieve(saved, get().achieve)
  },

  async toggleMilestone(id, milestoneId) {
    const goal = get().goals.find((g) => g.id === id)
    if (!goal) return undefined
    const milestones = goal.milestones.map((m) =>
      m.id === milestoneId ? { ...m, done: !m.done } : m
    )
    const saved = await get().update(id, { milestones })
    if (!saved) return undefined
    return maybeAutoAchieve(saved, get().achieve)
  },

  async achieve(id) {
    const goal = get().goals.find((g) => g.id === id)
    if (!goal || goal.status === 'achieved') return goal
    const saved = await get().update(id, {
      status: 'achieved',
      completedAt: new Date().toISOString(),
    })
    if (saved) {
      events.emit('goal.achieved', { goalId: id, goal: saved })
    }
    return saved
  },

  async remove(id) {
    await goalsRepository.remove(id)
    set({ goals: get().goals.filter((g) => g.id !== id) })
  },
}))

async function maybeAutoAchieve(
  goal: Goal,
  achieve: GoalsState['achieve']
): Promise<Goal | undefined> {
  if (goal.status !== 'achieved' && goalProgress(goal).reached) {
    return achieve(goal.id)
  }
  return goal
}

function sort(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/** Fire-and-forget hydration for non-React consumers. */
export function ensureGoalsHydrated(): void {
  void useGoalsStore.getState().hydrate()
}

/** Test helper. */
export function resetGoalsStore(): void {
  hydration = undefined
  useGoalsStore.setState({ goals: [], hydrated: false })
}
