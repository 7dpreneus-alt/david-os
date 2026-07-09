import { CheckCircle2, CheckSquare, Plus } from 'lucide-react'

import type { CommandDef, CommandProvider } from '@/core/commands'
import { ensureTasksHydrated, useTasksStore } from './store'

/** Static commands contributed to the Command Engine via the manifest. */
export const taskCommands: CommandDef[] = [
  {
    id: 'tasks.create',
    title: 'New Task',
    icon: Plus,
    group: 'Actions',
    keywords: ['create', 'add', 'todo'],
    run: ({ navigate }) => navigate('/tasks?new=1'),
  },
]

const MAX_RESULTS = 5

/**
 * Query-time provider: surfaces open/complete commands for matching tasks.
 * The palette (and later, search/automation) consumes these through the
 * Command Engine without knowing this module exists.
 */
export const tasksCommandProvider: CommandProvider = (query) => {
  const trimmed = query.trim().toLowerCase()
  if (trimmed.length < 2) return []

  ensureTasksHydrated()
  const { tasks } = useTasksStore.getState()
  const matches = tasks
    .filter(
      (task) =>
        task.title.toLowerCase().includes(trimmed) ||
        task.tags.some((tag) => tag.toLowerCase().includes(trimmed))
    )
    .slice(0, MAX_RESULTS)

  return matches.flatMap((task): CommandDef[] => {
    const commands: CommandDef[] = [
      {
        id: `tasks.open:${task.id}`,
        title: `Open task: ${task.title}`,
        icon: CheckSquare,
        group: 'Tasks',
        run: ({ navigate }) => navigate(`/tasks?task=${task.id}`),
      },
    ]
    if (task.status !== 'done') {
      commands.push({
        id: `tasks.complete:${task.id}`,
        title: `Complete task: ${task.title}`,
        icon: CheckCircle2,
        group: 'Tasks',
        run: () => {
          void useTasksStore.getState().setStatus(task.id, 'done')
        },
      })
    }
    return commands
  })
}
