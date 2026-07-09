import { lazy } from 'react'
import { CheckSquare } from 'lucide-react'

import type { ModuleManifest } from '@/core/modules'
import { taskCommands, tasksCommandProvider } from './commands'
import { taskSchema } from './schema'
import { TodayTasksWidget } from './components/today-tasks-widget'
import type { Task } from './types'

const TasksPage = lazy(() => import('./components/tasks-page'))

export const tasksModule: ModuleManifest = {
  id: 'tasks',
  name: 'Tasks',
  icon: CheckSquare,
  navGroup: 'Work',
  order: 10,
  routes: [{ path: '/tasks', element: <TasksPage /> }],
  navItems: [{ title: 'Tasks', url: '/tasks', icon: CheckSquare }],
  commands: taskCommands,
  commandProviders: [tasksCommandProvider],
  entityTypes: [
    {
      type: 'task',
      module: 'tasks',
      collection: 'tasks',
      schema: taskSchema,
      icon: CheckSquare,
      labels: { singular: 'Task', plural: 'Tasks' },
      // Search provider: feeds the Phase 4 universal index; the palette's
      // task results run through the command provider until then.
      searchText: (entity) => {
        const task = entity as Task
        return [task.title, task.description ?? '', ...task.tags].join(' ')
      },
    },
  ],
  widgets: [
    {
      id: 'tasks.today',
      title: 'Today',
      module: 'tasks',
      description: 'Tasks due today or overdue, with inline complete.',
      icon: CheckSquare,
      component: TodayTasksWidget,
      defaultSize: { w: 1, h: 1 },
      capabilities: ['entities:read:task', 'entities:write:task'],
    },
  ],
  // Notification hooks for due dates attach here in Phase 3, when the
  // Notification Engine lands (subscribe to a daily tick / hydrate event
  // and publish for overdue tasks).
}
