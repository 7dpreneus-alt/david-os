export { projectsModule } from './manifest'
export { projectSchema, type ProjectInput } from './schema'
export {
  ensureProjectsHydrated,
  projectsRepository,
  resetProjectsStore,
  useProjectsStore,
} from './store'
export {
  completionSignal,
  deriveHealth,
  deriveProgress,
  projectChildren,
  projectInsights,
  type ProjectHealthReport,
  type ProjectInsights,
  type ProjectProgress,
} from './derive'
export {
  PROJECT_HEALTH_META,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  type Milestone,
  type Project,
  type ProjectHealth,
  type ProjectPriority,
  type ProjectStatus,
} from './types'
