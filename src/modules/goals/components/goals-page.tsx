"use client"

import * as React from "react"
import { useSearchParams } from "react-router-dom"
import { Plus, Target, Trophy } from "lucide-react"
import { toast } from "sonner"

import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useGoalsStore } from "../store"
import type { Goal } from "../types"
import { GoalCard } from "./goal-card"
import { GoalFormDialog } from "./goal-form-dialog"

export default function GoalsPage() {
  const { goals, hydrated, hydrate, remove } = useGoalsStore()
  const [searchParams, setSearchParams] = useSearchParams()

  const [filter, setFilter] = React.useState("")
  const [showAchieved, setShowAchieved] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingGoal, setEditingGoal] = React.useState<Goal | undefined>()

  React.useEffect(() => {
    void hydrate()
  }, [hydrate])

  React.useEffect(() => {
    if (searchParams.get("new")) {
      setEditingGoal(undefined)
      setDialogOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  React.useEffect(() => {
    const goalId = searchParams.get("goal")
    if (goalId && hydrated) {
      const goal = goals.find((g) => g.id === goalId)
      if (goal) {
        setEditingGoal(goal)
        setDialogOpen(true)
      }
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, hydrated, goals])

  const visible = goals.filter((goal) => {
    if (goal.archived) return false
    if (!showAchieved && goal.status === "achieved") return false
    if (!filter) return true
    const q = filter.toLowerCase()
    return (
      goal.title.toLowerCase().includes(q) ||
      goal.tags.some((tag) => tag.toLowerCase().includes(q))
    )
  })

  const live = goals.filter((g) => !g.archived && g.status !== "achieved")
  const showEmptyState = hydrated && live.length === 0 && !showAchieved

  const openCreate = () => {
    setEditingGoal(undefined)
    setDialogOpen(true)
  }

  return (
    <BaseLayout title="Goals" description="Targets and milestones that steer the work.">
      <div className="px-4 lg:px-6">
        {showEmptyState ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20 text-center">
            <Target className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No goals yet</p>
              <p className="text-sm text-muted-foreground">
                Set your first target — or press ⌘K and type "new goal".
              </p>
            </div>
            <Button onClick={openCreate}>
              <Plus /> New goal
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Filter goals…"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="h-8 w-[200px] lg:w-[280px]"
              />
              <Button
                variant={showAchieved ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setShowAchieved((v) => !v)}
              >
                <Trophy /> {showAchieved ? "Hide achieved" : "Show achieved"}
              </Button>
              <div className="ml-auto">
                <Button size="sm" onClick={openCreate}>
                  <Plus /> New goal
                </Button>
              </div>
            </div>

            {visible.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No goals match the current filters.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visible.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={(g) => {
                      setEditingGoal(g)
                      setDialogOpen(true)
                    }}
                    onDelete={(g) => {
                      void remove(g.id).then(() => toast(`Deleted "${g.title}"`))
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <GoalFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingGoal(undefined)
        }}
        goal={editingGoal}
      />
    </BaseLayout>
  )
}
