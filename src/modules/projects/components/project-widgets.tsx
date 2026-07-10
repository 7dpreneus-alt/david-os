import * as React from 'react'
import { Link } from 'react-router-dom'

import type { WidgetComponentProps } from '@/core/widgets'
import { Progress } from '@/components/ui/progress'
import { useProjectsStore } from '../store'
import { PROJECT_HEALTH_META, type Project, type ProjectHealth } from '../types'
import { projectInsights } from '../derive'
import { useProjectInsights } from './use-project-insights'

function useHydratedProjects(): { projects: Project[]; hydrated: boolean } {
  const { projects, hydrated, hydrate } = useProjectsStore()
  React.useEffect(() => {
    void hydrate()
  }, [hydrate])
  return { projects: projects.filter((p) => !p.archived), hydrated }
}

function ProjectRow({ project }: { project: Project }) {
  const insights = useProjectInsights(project)
  return (
    <div className="flex items-center gap-3">
      <Link
        to={`/projects?project=${project.id}`}
        className="w-40 truncate text-sm hover:underline"
      >
        {project.title}
      </Link>
      <Progress value={insights?.progress.percent ?? 0} className="flex-1" />
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
        {insights?.progress.percent ?? 0}%
      </span>
    </div>
  )
}

/** Active projects with live derived progress. */
export function ActiveProjectsWidget(_props: WidgetComponentProps) {
  const { projects, hydrated } = useHydratedProjects()
  if (!hydrated) return null
  const active = projects.filter((p) => p.status === 'active').slice(0, 5)
  if (active.length === 0) {
    return <p className="text-sm text-muted-foreground">No active projects.</p>
  }
  return (
    <div className="flex flex-col gap-2">
      {active.map((project) => (
        <ProjectRow key={project.id} project={project} />
      ))}
    </div>
  )
}

/** Health distribution across live projects. */
export function ProjectHealthWidget(_props: WidgetComponentProps) {
  const { projects, hydrated } = useHydratedProjects()
  const [counts, setCounts] = React.useState<Record<ProjectHealth, number>>()

  React.useEffect(() => {
    if (!hydrated) return
    let cancelled = false
    void Promise.all(projects.map((p) => projectInsights(p))).then((all) => {
      if (cancelled) return
      const next: Record<ProjectHealth, number> = {
        'on-track': 0,
        'at-risk': 0,
        blocked: 0,
        completed: 0,
      }
      for (const insight of all) next[insight.health.health]++
      setCounts(next)
    })
    return () => {
      cancelled = true
    }
  }, [projects, hydrated])

  if (!hydrated || !counts) return null
  return (
    <div className="flex flex-col gap-2">
      {(Object.keys(PROJECT_HEALTH_META) as ProjectHealth[]).map((health) => (
        <div key={health} className="flex items-center gap-2 text-sm">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: `var(${PROJECT_HEALTH_META[health].colorVar})` }}
          />
          <span className="flex-1">{PROJECT_HEALTH_META[health].label}</span>
          <span className="tabular-nums text-muted-foreground">{counts[health]}</span>
        </div>
      ))}
    </div>
  )
}

/** Most recently touched projects. */
export function RecentProjectsWidget(_props: WidgetComponentProps) {
  const { projects, hydrated } = useHydratedProjects()
  if (!hydrated) return null
  const recent = projects.slice(0, 5) // store sorts by updatedAt desc
  if (recent.length === 0) {
    return <p className="text-sm text-muted-foreground">No projects yet.</p>
  }
  return (
    <div className="flex flex-col gap-1.5">
      {recent.map((project) => (
        <Link
          key={project.id}
          to={`/projects?project=${project.id}`}
          className="truncate text-sm hover:underline"
        >
          {project.title}
        </Link>
      ))}
    </div>
  )
}
