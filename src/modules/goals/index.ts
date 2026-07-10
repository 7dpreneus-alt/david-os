export { goalsModule } from './manifest'
export { goalSchema, type GoalInput } from './schema'
export { goalProgress, type GoalProgress } from './progress'
export {
  ensureGoalsHydrated,
  goalsRepository,
  resetGoalsStore,
  useGoalsStore,
} from './store'
export {
  GOAL_KINDS,
  GOAL_STATUSES,
  type Goal,
  type GoalKind,
  type GoalMilestone,
  type GoalStatus,
} from './types'
