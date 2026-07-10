import { lazy } from 'react'
import { FolderKanban } from 'lucide-react'

import type { ModuleManifest } from '@/core/modules'
import { projectCommands, projectsCommandProvider } from './commands'
import { projectSchema } from './schema'
import {
  ActiveProjectsWidget,
  ProjectHealthWidget,
  RecentProjectsWidget,
} from './components/project-widgets'
import type { Project } from './types'

const ProjectsPage = lazy(() => import('./components/projects-page'))

export const projectsModule: ModuleManifest = {
  id: 'projects',
  name: 'Projects',
  icon: FolderKanban,
  navGroup: 'Work',
  order: 8,
  routes: [{ path: '/projects', element: <ProjectsPage /> }],
  navItems: [{ title: 'Projects', url: '/projects', icon: FolderKanban }],
  commands: projectCommands,
  commandProviders: [projectsCommandProvider],
  entityTypes: [
    {
      type: 'project',
      module: 'projects',
      collection: 'projects',
      schema: projectSchema,
      icon: FolderKanban,
      labels: { singular: 'Project', plural: 'Projects' },
      searchText: (entity) => {
        const project = entity as Project
        return [
          project.title,
          project.description ?? '',
          project.owner ?? '',
          ...project.tags,
          ...project.milestones.map((m) => m.title),
        ].join(' ')
      },
    },
  ],
  widgets: [
    {
      id: 'projects.active',
      title: 'Active Projects',
      module: 'projects',
      description: 'Active projects with live derived progress.',
      icon: FolderKanban,
      component: ActiveProjectsWidget,
      defaultSize: { w: 2, h: 1 },
      capabilities: ['entities:read:*'],
    },
    {
      id: 'projects.health',
      title: 'Project Health',
      module: 'projects',
      description: 'On track / at risk / blocked distribution.',
      icon: FolderKanban,
      component: ProjectHealthWidget,
      defaultSize: { w: 1, h: 1 },
      capabilities: ['entities:read:*'],
    },
    {
      id: 'projects.recent',
      title: 'Recent Projects',
      module: 'projects',
      description: 'Most recently touched projects.',
      icon: FolderKanban,
      component: RecentProjectsWidget,
      defaultSize: { w: 1, h: 1 },
      capabilities: ['entities:read:project'],
    },
  ],
}
