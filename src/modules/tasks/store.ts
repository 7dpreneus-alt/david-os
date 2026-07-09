import { create } from 'zustand'

import { newId } from '@/lib/id'
import { events } from '@/core/events'
import { createRepository } from '@/core/storage'
import { taskSchema, type TaskInput } from './schema'
import type { Task, TaskStatus } from './types'

/**
 * All persistence flows through the kernel repository (ADR-005): every
 * mutation is validated, stamped, emitted on the event bus, and therefore
 * recorded on the Activity Timeline — nothing in this module touches
 * localStorage.
 */
export const tasksRepository = createRepository<Task>('tasks', taskSchema)

interface TasksState {
  tasks: Task[]
  hydrated: boolean
  hydrate: () => Promise<void>
  create: (input: TaskInput) => Promise<Task>
  update: (id: string, patch: Partial<Task>) => Promise<Task | undefined>
  setStatus: (id: string, status: TaskStatus) => Promise<Task | undefined>
  remove: (id: string) => Promise<void>
}

let hydration: Promise<void> | undefined

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  hydrated: false,

  async hydrate() {
    hydration ??= tasksRepository.list().then((tasks) => {
      set({ tasks: sort(tasks), hydrated: true })
    })
    return hydration
  },

  async create(input) {
    const now = new Date().toISOString()
    const task: Task = {
      id: newId(),
      type: 'task',
      title: input.title,
      createdAt: now,
      updatedAt: now,
      tags: input.tags ?? [],
      status: input.status ?? 'todo',
      priority: input.priority ?? 'medium',
      description: input.description,
      dueDate: input.dueDate,
      projectId: input.projectId,
      goalId: input.goalId,
      parentTaskId: input.parentTaskId,
      linkedIds: input.linkedIds ?? [],
    }
    const saved = await tasksRepository.put(task)
    set({ tasks: sort([...get().tasks, saved]) })
    return saved
  },

  async update(id, patch) {
    const current = get().tasks.find((t) => t.id === id)
    if (!current) return undefined
    const saved = await tasksRepository.put({ ...current, ...patch, id })
    set({ tasks: sort(get().tasks.map((t) => (t.id === id ? saved : t))) })
    return saved
  },

  async setStatus(id, status) {
    const current = get().tasks.find((t) => t.id === id)
    if (!current || current.status === status) return current
    const patch: Partial<Task> =
      status === 'done'
        ? { status, completedAt: new Date().toISOString() }
        : { status, completedAt: undefined }
    const saved = await get().update(id, patch)
    if (saved && status === 'done') {
      events.emit('task.completed', { taskId: id, task: saved })
    }
    return saved
  },

  async remove(id) {
    await tasksRepository.remove(id)
    set({ tasks: get().tasks.filter((t) => t.id !== id) })
  },
}))

function sort(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Fire-and-forget hydration for non-React consumers (command provider, widgets). */
export function ensureTasksHydrated(): void {
  void useTasksStore.getState().hydrate()
}

/** Test helper — clears in-memory state so hydrate() re-reads storage. */
export function resetTasksStore(): void {
  hydration = undefined
  useTasksStore.setState({ tasks: [], hydrated: false })
}
