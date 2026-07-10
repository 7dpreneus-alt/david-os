"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, X } from "lucide-react"
import { z } from "zod"

import { newId } from "@/lib/id"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { EntityPicker } from "@/components/shared/entity-picker"
import { useGoalsStore } from "../store"
import { GOAL_KINDS, GOAL_STATUSES, type Goal, type GoalMilestone } from "../types"

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  kind: z.enum(["metric", "milestone"]),
  status: z.enum(["active", "paused", "achieved"]),
  description: z.string().optional(),
  target: z.string().optional(),
  current: z.string().optional(),
  unit: z.string().optional(),
  targetDate: z.string().optional(),
  projectId: z.string().optional(),
  tags: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

const PROJECT_TYPES = ["project"]

interface GoalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal?: Goal
}

function toFormValues(goal?: Goal): FormValues {
  return {
    title: goal?.title ?? "",
    kind: goal?.kind ?? "metric",
    status: goal?.status ?? "active",
    description: goal?.description ?? "",
    target: goal?.target !== undefined ? String(goal.target) : "",
    current: goal?.current !== undefined ? String(goal.current) : "",
    unit: goal?.unit ?? "",
    targetDate: goal?.targetDate ?? "",
    projectId: goal?.projectId ?? "",
    tags: goal?.tags.join(", ") ?? "",
  }
}

export function GoalFormDialog({ open, onOpenChange, goal }: GoalFormDialogProps) {
  const { create, update, achieve } = useGoalsStore()
  const [milestones, setMilestones] = React.useState<GoalMilestone[]>([])
  const [newMilestone, setNewMilestone] = React.useState("")

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(goal),
  })
  const kind = form.watch("kind")

  React.useEffect(() => {
    if (open) {
      form.reset(toFormValues(goal))
      setMilestones(goal?.milestones ?? [])
      setNewMilestone("")
    }
  }, [open, goal, form])

  const addMilestone = () => {
    const title = newMilestone.trim()
    if (!title) return
    setMilestones((list) => [...list, { id: newId(), title, done: false }])
    setNewMilestone("")
  }

  const num = (value?: string): number | undefined => {
    if (!value?.trim()) return undefined
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  const onSubmit = async (values: FormValues) => {
    const tags = (values.tags ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    const fields = {
      title: values.title,
      kind: values.kind,
      description: values.description || undefined,
      target: values.kind === "metric" ? num(values.target) : undefined,
      current: values.kind === "metric" ? num(values.current) : undefined,
      unit: values.kind === "metric" ? values.unit || undefined : undefined,
      milestones: values.kind === "milestone" ? milestones : [],
      targetDate: values.targetDate || undefined,
      projectId: values.projectId || undefined,
      tags,
    }
    if (goal) {
      await update(goal.id, fields)
      if (values.status !== goal.status) {
        if (values.status === "achieved") {
          await achieve(goal.id)
        } else {
          await update(goal.id, { status: values.status, completedAt: undefined })
        }
      }
    } else {
      await create({ ...fields, status: values.status })
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{goal ? "Edit goal" : "New goal"}</DialogTitle>
          <DialogDescription>
            {goal
              ? "Update the goal."
              : "Track a number toward a target, or complete a set of milestones."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="What are you aiming for?" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GOAL_KINDS.map((k) => (
                          <SelectItem key={k.value} value={k.value}>
                            {k.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GOAL_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {kind === "metric" ? (
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="current"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current</FormLabel>
                      <FormControl>
                        <Input type="number" inputMode="decimal" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="target"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target</FormLabel>
                      <FormControl>
                        <Input type="number" inputMode="decimal" placeholder="100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <FormControl>
                        <Input placeholder="clients, kg…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <FormLabel>Milestones</FormLabel>
                <div className="flex flex-col gap-1.5">
                  {milestones.map((milestone) => (
                    <div key={milestone.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={milestone.done}
                        onCheckedChange={() =>
                          setMilestones((list) =>
                            list.map((m) =>
                              m.id === milestone.id ? { ...m, done: !m.done } : m
                            )
                          )
                        }
                      />
                      <span className="flex-1 truncate text-sm">{milestone.title}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={`Remove ${milestone.title}`}
                        onClick={() =>
                          setMilestones((list) => list.filter((m) => m.id !== milestone.id))
                        }
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add a milestone…"
                    value={newMilestone}
                    onChange={(e) => setNewMilestone(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addMilestone()
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={addMilestone}>
                    <Plus /> Add
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input placeholder="comma, separated" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <FormControl>
                    <EntityPicker
                      types={PROJECT_TYPES}
                      value={field.value || undefined}
                      onChange={(id) => field.onChange(id ?? "")}
                      placeholder="Link to a project…"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Optional context" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">{goal ? "Save changes" : "Create goal"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
