import { lazy } from 'react'
import { Target } from 'lucide-react'

import type { ModuleManifest } from '@/core/modules'
import { goalCommands, goalsCommandProvider } from './commands'
import { goalSchema } from './schema'
import { GoalProgressWidget } from './components/goal-progress-widget'
import type { Goal } from './types'

const GoalsPage = lazy(() => import('./components/goals-page'))

export const goalsModule: ModuleManifest = {
  id: 'goals',
  name: 'Goals',
  icon: Target,
  navGroup: 'Work',
  order: 9,
  routes: [{ path: '/goals', element: <GoalsPage /> }],
  navItems: [{ title: 'Goals', url: '/goals', icon: Target }],
  commands: goalCommands,
  commandProviders: [goalsCommandProvider],
  entityTypes: [
    {
      type: 'goal',
      module: 'goals',
      collection: 'goals',
      schema: goalSchema,
      icon: Target,
      labels: { singular: 'Goal', plural: 'Goals' },
      searchText: (entity) => {
        const goal = entity as Goal
        return [
          goal.title,
          goal.description ?? '',
          goal.unit ?? '',
          ...goal.tags,
          ...goal.milestones.map((m) => m.title),
        ].join(' ')
      },
    },
  ],
  widgets: [
    {
      id: 'goals.progress',
      title: 'Goal Progress',
      module: 'goals',
      description: 'Active goals with live derived progress.',
      icon: Target,
      component: GoalProgressWidget,
      defaultSize: { w: 1, h: 1 },
      capabilities: ['entities:read:goal'],
    },
  ],
}
