import * as React from 'react'
import { Link } from 'react-router-dom'

import type { WidgetComponentProps } from '@/core/widgets'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { useTasksStore } from '../store'
import type { Task } from '../types'

function isDueTodayOrOverdue(task: Task, today: string): boolean {
  return !!task.dueDate && task.dueDate <= today
}

/**
 * "Today" widget contributed to the widget registry. Mission Control hosts
 * it via the registry (Phase 3) — it owns its data through the module store
 * and never receives task internals through props.
 */
export function TodayTasksWidget(_props: WidgetComponentProps) {
  const { tasks, hydrated, hydrate, setStatus } = useTasksStore()

  React.useEffect(() => {
    void hydrate()
  }, [hydrate])

  const today = new Date().toISOString().slice(0, 10)
  const open = tasks.filter((t) => t.status !== 'done' && !t.archived)
  const due = open.filter((t) => isDueTodayOrOverdue(t, today))
  const shown = (due.length ? due : open).slice(0, 6)

  if (!hydrated) return null

  return (
    <div className="flex flex-col gap-2">
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing due — you're clear for today.
        </p>
      ) : (
        shown.map((task) => (
          <div key={task.id} className="flex items-center gap-2">
            <Checkbox
              aria-label={`Complete ${task.title}`}
              checked={false}
              onCheckedChange={() => void setStatus(task.id, 'done')}
            />
            <Link
              to={`/tasks?task=${task.id}`}
              className="flex-1 truncate text-sm hover:underline"
            >
              {task.title}
            </Link>
            {task.dueDate && (
              <Badge
                variant="outline"
                className={cn(
                  task.dueDate < today && 'border-destructive text-destructive'
                )}
              >
                {task.dueDate}
              </Badge>
            )}
          </div>
        ))
      )}
    </div>
  )
}
