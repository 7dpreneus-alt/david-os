import { Archive, CheckCircle2, FolderKanban, Plus } from 'lucide-react'

import type { CommandDef, CommandProvider } from '@/core/commands'
import { ensureProjectsHydrated, useProjectsStore } from './store'
import type { Project } from './types'

/** Static commands contributed via the manifest. */
export const projectCommands: CommandDef[] = [
  {
    id: 'projects.create',
    title: 'New Project',
    icon: Plus,
    group: 'Actions',
    keywords: ['create', 'add', 'project'],
    run: ({ navigate }) => navigate('/projects?new=1'),
  },
]

const MAX_MATCHES = 5
const MAX_RECENT = 3

function openCommand(project: Project): CommandDef {
  return {
    id: `projects.open:${project.id}`,
    title: `Open project: ${project.title}`,
    icon: FolderKanban,
    group: 'Projects',
    run: ({ navigate }) => navigate(`/projects?project=${project.id}`),
  }
}

/**
 * Query-time provider: recent projects when the palette is empty, matching
 * projects (with complete/archive actions) once the user types.
 */
export const projectsCommandProvider: CommandProvider = (query) => {
  ensureProjectsHydrated()
  const { projects } = useProjectsStore.getState()
  const live = projects.filter((p) => !p.archived)
  const trimmed = query.trim().toLowerCase()

  // Recent projects surface before any query is typed.
  if (trimmed.length < 2) {
    return live
      .slice(0, MAX_RECENT)
      .map((project) => ({
        ...openCommand(project),
        group: 'Recent projects',
      }))
  }

  const matches = live
    .filter(
      (project) =>
        project.title.toLowerCase().includes(trimmed) ||
        project.tags.some((tag) => tag.toLowerCase().includes(trimmed)) ||
        (project.owner ?? '').toLowerCase().includes(trimmed)
    )
    .slice(0, MAX_MATCHES)

  return matches.flatMap((project): CommandDef[] => {
    const commands: CommandDef[] = [
      { ...openCommand(project), keywords: [trimmed] },
    ]
    if (project.status !== 'completed') {
      commands.push({
        id: `projects.complete:${project.id}`,
        title: `Complete project: ${project.title}`,
        icon: CheckCircle2,
        group: 'Projects',
        keywords: [trimmed],
        run: () => {
          void useProjectsStore.getState().complete(project.id)
        },
      })
    }
    commands.push({
      id: `projects.archive:${project.id}`,
      title: `Archive project: ${project.title}`,
      icon: Archive,
      group: 'Projects',
      keywords: [trimmed],
      run: () => {
        void useProjectsStore.getState().archive(project.id)
      },
    })
    return commands
  })
}
