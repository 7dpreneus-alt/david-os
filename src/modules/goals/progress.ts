import type { Goal } from './types'

/** Derived, never stored. */
export interface GoalProgress {
  /** 0–100. */
  percent: number
  /** Human-readable, e.g. "12 / 20 clients" or "2 of 3 milestones". */
  label: string
  /** True when the underlying data says the goal is reached. */
  reached: boolean
}

export function goalProgress(goal: Goal): GoalProgress {
  if (goal.status === 'achieved') {
    return { percent: 100, label: 'Achieved', reached: true }
  }
  if (goal.kind === 'metric' && goal.target !== undefined && goal.target > 0) {
    const current = goal.current ?? 0
    return {
      percent: Math.min(100, Math.round((100 * current) / goal.target)),
      label: `${current} / ${goal.target}${goal.unit ? ` ${goal.unit}` : ''}`,
      reached: current >= goal.target,
    }
  }
  const total = goal.milestones.length
  const done = goal.milestones.filter((m) => m.done).length
  return {
    percent: total > 0 ? Math.round((100 * done) / total) : 0,
    label: `${done} of ${total} milestone${total === 1 ? '' : 's'}`,
    reached: total > 0 && done === total,
  }
}
