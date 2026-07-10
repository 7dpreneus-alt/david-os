import * as React from 'react'
import { Link } from 'react-router-dom'

import type { WidgetComponentProps } from '@/core/widgets'
import { Progress } from '@/components/ui/progress'
import { goalProgress } from '../progress'
import { useGoalsStore } from '../store'

/** Active goals with derived progress, for Mission Control. */
export function GoalProgressWidget(_props: WidgetComponentProps) {
  const { goals, hydrated, hydrate } = useGoalsStore()

  React.useEffect(() => {
    void hydrate()
  }, [hydrate])

  if (!hydrated) return null
  const active = goals
    .filter((g) => !g.archived && g.status === 'active')
    .slice(0, 5)

  if (active.length === 0) {
    return <p className="text-sm text-muted-foreground">No active goals.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {active.map((goal) => {
        const progress = goalProgress(goal)
        return (
          <div key={goal.id} className="flex items-center gap-3">
            <Link
              to={`/goals?goal=${goal.id}`}
              className="w-40 truncate text-sm hover:underline"
            >
              {goal.title}
            </Link>
            <Progress value={progress.percent} className="flex-1" />
            <span className="w-24 truncate text-right text-xs tabular-nums text-muted-foreground">
              {progress.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
