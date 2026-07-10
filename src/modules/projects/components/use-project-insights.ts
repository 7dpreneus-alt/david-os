import * as React from 'react'

import { events } from '@/core/events'
import { projectInsights, type ProjectInsights } from '../derive'
import type { Project } from '../types'

/** Collections whose churn should not trigger recomputation. */
const IGNORED_COLLECTIONS = new Set(['activities', 'links', 'projects'])

/**
 * Live derived progress + health for one project. Recomputes when the
 * project changes or when any potential child entity mutates (signalled by
 * the event bus — no module coupling).
 */
export function useProjectInsights(project: Project): ProjectInsights | undefined {
  const [insights, setInsights] = React.useState<ProjectInsights>()
  const [version, setVersion] = React.useState(0)

  React.useEffect(() => {
    const bump = (payload: { collection: string }) => {
      if (!IGNORED_COLLECTIONS.has(payload.collection)) {
        setVersion((v) => v + 1)
      }
    }
    const subs = [
      events.on('entity.created', bump),
      events.on('entity.updated', bump),
      events.on('entity.deleted', bump),
    ]
    return () => subs.forEach((unsubscribe) => unsubscribe())
  }, [])

  React.useEffect(() => {
    let cancelled = false
    void projectInsights(project).then((result) => {
      if (!cancelled) setInsights(result)
    })
    return () => {
      cancelled = true
    }
  }, [project, version])

  return insights
}
