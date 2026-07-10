"use client"

import { CalendarClock, MoreHorizontal, User2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { PROJECT_STATUSES, type Project } from '../types'
import { ProjectHealthBadge } from './project-health-badge'
import { useProjectInsights } from './use-project-insights'

interface ProjectCardProps {
  project: Project
  onEdit: (project: Project) => void
  onComplete: (project: Project) => void
  onArchive: (project: Project) => void
  onDelete: (project: Project) => void
}

export function ProjectCard({
  project,
  onEdit,
  onComplete,
  onArchive,
  onDelete,
}: ProjectCardProps) {
  const insights = useProjectInsights(project)
  const status = PROJECT_STATUSES.find((s) => s.value === project.status)
  const countable =
    insights && insights.progress.items + insights.progress.milestones > 0

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{project.title}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {status && (
              <Badge variant="secondary" className="gap-1">
                <status.icon className="h-3 w-3" />
                {status.label}
              </Badge>
            )}
            {insights && (
              <ProjectHealthBadge
                health={insights.health.health}
                reasons={insights.health.reasons}
              />
            )}
            {project.archived && <Badge variant="outline">Archived</Badge>}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal />
              <span className="sr-only">Project actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[170px]">
            <DropdownMenuItem onClick={() => onEdit(project)}>Edit</DropdownMenuItem>
            {project.status !== 'completed' && (
              <DropdownMenuItem onClick={() => onComplete(project)}>
                Complete
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onArchive(project)}>
              {project.archived ? 'Unarchive' : 'Archive'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(project)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {project.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {project.description}
          </p>
        )}
        {insights && countable ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {insights.progress.itemsDone + insights.progress.milestonesDone} of{' '}
                {insights.progress.items + insights.progress.milestones} done
              </span>
              <span>{insights.progress.percent}%</span>
            </div>
            <Progress value={insights.progress.percent ?? 0} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No linked work yet.</p>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {project.owner && (
          <span className="inline-flex items-center gap-1">
            <User2 className="h-3 w-3" /> {project.owner}
          </span>
        )}
        {project.targetDate && (
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3 w-3" /> {project.targetDate}
          </span>
        )}
        {project.tags.map((tag) => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
      </CardFooter>
    </Card>
  )
}
