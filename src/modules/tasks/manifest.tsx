import { lazy } from 'react'
import { CheckSquare } from 'lucide-react'

import type { ModuleManifest } from '@/core/modules'

const TasksPage = lazy(() => import('@/app/tasks/page'))

/**
 * Thin wrapper over the template tasks page; Phase 2 replaces the demo data
 * with a repository-backed store and registers the task entity type.
 */
export const tasksModule: ModuleManifest = {
  id: 'tasks',
  name: 'Tasks',
  icon: CheckSquare,
  navGroup: 'Work',
  order: 10,
  routes: [{ path: '/tasks', element: <TasksPage /> }],
  navItems: [{ title: 'Tasks', url: '/tasks', icon: CheckSquare }],
}
