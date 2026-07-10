"use client"

import * as React from "react"
import { CalendarClock, MoreHorizontal, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { EntityChip } from "@/components/shared/entity-chip"
import { cn } from "@/lib/utils"
import { goalProgress } from "../progress"
import { useGoalsStore } from "../store"
import { GOAL_KINDS, GOAL_STATUSES, type Goal } from "../types"

interface GoalCardProps {
  goal: Goal
  onEdit: (goal: Goal) => void
  onDelete: (goal: Goal) => void
}

export function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const { logProgress, toggleMilestone, achieve } = useGoalsStore()
  const [logValue, setLogValue] = React.useState("")

  const progress = goalProgress(goal)
  const kind = GOAL_KINDS.find((k) => k.value === goal.kind)
  const status = GOAL_STATUSES.find((s) => s.value === goal.status)
  const achieved = goal.status === "achieved"

  const submitProgress = () => {
    const value = Number(logValue)
    if (!Number.isFinite(value)) return
    void logProgress(goal.id, value)
    setLogValue("")
  }

  return (
    <Card className={cn("flex flex-col", achieved && "opacity-80")}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{goal.title}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {kind && (
              <Badge variant="secondary" className="gap-1">
                <kind.icon className="h-3 w-3" />
                {kind.label}
              </Badge>
            )}
            {status && goal.status !== "active" && (
              <Badge
                variant={achieved ? "default" : "outline"}
                className="gap-1"
              >
                <status.icon className="h-3 w-3" />
                {status.label}
              </Badge>
            )}
            {goal.projectId && <EntityChip id={goal.projectId} />}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal />
              <span className="sr-only">Goal actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[170px]">
            <DropdownMenuItem onClick={() => onEdit(goal)}>Edit</DropdownMenuItem>
            {!achieved && (
              <DropdownMenuItem onClick={() => void achieve(goal.id)}>
                Mark achieved
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(goal)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {goal.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {goal.description}
          </p>
        )}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progress.label}</span>
            <span>{progress.percent}%</span>
          </div>
          <Progress value={progress.percent} />
        </div>

        {goal.kind === "metric" && !achieved && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              placeholder={`Now at… (${goal.current ?? 0})`}
              value={logValue}
              onChange={(e) => setLogValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitProgress()}
              className="h-8 w-32"
            />
            <Button size="sm" variant="secondary" onClick={submitProgress}>
              <Plus /> Log
            </Button>
          </div>
        )}

        {goal.kind === "milestone" && goal.milestones.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {goal.milestones.map((milestone) => (
              <label
                key={milestone.id}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={milestone.done}
                  disabled={achieved}
                  onCheckedChange={() => void toggleMilestone(goal.id, milestone.id)}
                />
                <span className={cn(milestone.done && "text-muted-foreground line-through")}>
                  {milestone.title}
                </span>
              </label>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {goal.targetDate && (
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3 w-3" /> {goal.targetDate}
          </span>
        )}
        {goal.tags.map((tag) => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
      </CardFooter>
    </Card>
  )
}
