import { Plus, Target, Trophy } from 'lucide-react'

import type { CommandDef, CommandProvider } from '@/core/commands'
import { ensureGoalsHydrated, useGoalsStore } from './store'

export const goalCommands: CommandDef[] = [
  {
    id: 'goals.create',
    title: 'New Goal',
    icon: Plus,
    group: 'Actions',
    keywords: ['create', 'add', 'goal', 'target'],
    run: ({ navigate }) => navigate('/goals?new=1'),
  },
]

const MAX_MATCHES = 5

/** Query-time provider: open/achieve commands for matching goals. */
export const goalsCommandProvider: CommandProvider = (query) => {
  const trimmed = query.trim().toLowerCase()
  if (trimmed.length < 2) return []

  ensureGoalsHydrated()
  const { goals } = useGoalsStore.getState()
  const matches = goals
    .filter(
      (goal) =>
        !goal.archived &&
        (goal.title.toLowerCase().includes(trimmed) ||
          goal.tags.some((tag) => tag.toLowerCase().includes(trimmed)))
    )
    .slice(0, MAX_MATCHES)

  return matches.flatMap((goal): CommandDef[] => {
    const commands: CommandDef[] = [
      {
        id: `goals.open:${goal.id}`,
        title: `Open goal: ${goal.title}`,
        icon: Target,
        group: 'Goals',
        run: ({ navigate }) => navigate(`/goals?goal=${goal.id}`),
      },
    ]
    if (goal.status !== 'achieved') {
      commands.push({
        id: `goals.achieve:${goal.id}`,
        title: `Mark achieved: ${goal.title}`,
        icon: Trophy,
        group: 'Goals',
        run: () => {
          void useGoalsStore.getState().achieve(goal.id)
        },
      })
    }
    return commands
  })
}
