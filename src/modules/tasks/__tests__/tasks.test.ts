import { beforeEach, describe, expect, it, vi } from 'vitest'

import { activityFor, startActivityRecorder } from '@/core/activity'
import {
  allCommands,
  queryCommands,
  resetCommandRegistry,
} from '@/core/commands'
import { getEntityType, resetEntityTypeRegistry } from '@/core/entities'
import { events } from '@/core/events'
import { LocalStorageAdapter, setStorageAdapter } from '@/core/storage'
import {
  moduleRoutes,
  registerModules,
  resetModuleRegistry,
} from '@/core/modules'
import { allWidgets, resetWidgetRegistry } from '@/core/widgets'
import { createMemoryStorage } from '@/core/__tests__/memory-storage'
import { tasksModule } from '../manifest'
import { resetTasksStore, tasksRepository, useTasksStore } from '../store'
import type { Task } from '../types'

let storage: Storage

beforeEach(() => {
  storage = createMemoryStorage()
  setStorageAdapter(new LocalStorageAdapter(storage))
  events.clear()
  resetCommandRegistry()
  resetModuleRegistry()
  resetWidgetRegistry()
  resetEntityTypeRegistry()
  resetTasksStore()
})

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('task persistence', () => {
  it('creates through the kernel repository and survives a reload (rehydrate)', async () => {
    const store = useTasksStore.getState()
    const task = await store.create({
      title: 'Ship tasks module',
      priority: 'high',
      dueDate: '2026-07-10',
      tags: ['phase-2'],
      projectId: 'proj-1',
      goalId: 'goal-1',
      parentTaskId: 'task-0',
      linkedIds: ['note-1'],
    })

    // Persisted via the storage layer, not page state:
    const persisted = await tasksRepository.get(task.id)
    expect(persisted?.title).toBe('Ship tasks module')
    expect(persisted?.projectId).toBe('proj-1')
    expect(persisted?.goalId).toBe('goal-1')
    expect(persisted?.parentTaskId).toBe('task-0')
    expect(persisted?.linkedIds).toEqual(['note-1'])

    // Simulated reload: fresh in-memory state hydrates from storage.
    resetTasksStore()
    await useTasksStore.getState().hydrate()
    expect(useTasksStore.getState().tasks.map((t) => t.id)).toContain(task.id)
  })

  it('completing a task stamps completedAt and emits task.completed', async () => {
    const completed = vi.fn()
    events.on('task.completed', completed)
    const store = useTasksStore.getState()
    const task = await store.create({ title: 'Emit events' })

    await useTasksStore.getState().setStatus(task.id, 'done')
    const done = useTasksStore.getState().tasks.find((t) => t.id === task.id)
    expect(done?.status).toBe('done')
    expect(done?.completedAt).toBeTruthy()
    expect(completed).toHaveBeenCalledTimes(1)

    // Reopening clears the completion stamp.
    await useTasksStore.getState().setStatus(task.id, 'todo')
    const reopened = useTasksStore.getState().tasks.find((t) => t.id === task.id)
    expect(reopened?.completedAt).toBeUndefined()
  })
})

describe('task activity events', () => {
  it('create, update, status change, and delete all land on the Activity Timeline', async () => {
    const stop = startActivityRecorder()
    const store = useTasksStore.getState()

    const task = await store.create({ title: 'Audited task' })
    await useTasksStore.getState().update(task.id, { priority: 'urgent' })
    await useTasksStore.getState().setStatus(task.id, 'done')
    await useTasksStore.getState().remove(task.id)
    await flush()

    const history = await activityFor(task.id)
    const verbs = history.map((a) => a.verb)
    expect(verbs.filter((v) => v === 'created').length).toBe(1)
    expect(verbs.filter((v) => v === 'updated').length).toBe(2) // priority + status
    expect(verbs.filter((v) => v === 'deleted').length).toBe(1)

    const statusChange = history.find((a) => a.changes?.status)
    expect(statusChange?.changes?.status).toEqual({ from: 'todo', to: 'done' })
    stop()
  })
})

describe('task commands', () => {
  it('registers static commands and a working create command', async () => {
    registerModules([tasksModule])
    const ids = allCommands().map((c) => c.id)
    expect(ids).toContain('tasks.create')
    expect(ids).toContain('nav:/tasks')

    const visited: string[] = []
    const create = allCommands().find((c) => c.id === 'tasks.create')
    await create?.run({ navigate: (p) => visited.push(p) })
    expect(visited).toEqual(['/tasks?new=1'])
  })

  it('command provider surfaces open + complete for matching tasks, and complete works', async () => {
    registerModules([tasksModule])
    const store = useTasksStore.getState()
    const task = await store.create({ title: 'Review pull request' })
    await store.create({ title: 'Unrelated errand' })

    const results = await queryCommands('review')
    const ids = results.map((c) => c.id)
    expect(ids).toContain(`tasks.open:${task.id}`)
    expect(ids).toContain(`tasks.complete:${task.id}`)
    expect(ids.some((id) => id.includes('Unrelated'))).toBe(false)

    const complete = results.find((c) => c.id === `tasks.complete:${task.id}`)
    await complete?.run({ navigate: () => {} })
    await flush()
    expect(
      useTasksStore.getState().tasks.find((t) => t.id === task.id)?.status
    ).toBe('done')

    // Completed tasks no longer offer a complete command.
    const after = await queryCommands('review')
    expect(after.map((c) => c.id)).not.toContain(`tasks.complete:${task.id}`)
  })
})

describe('task search', () => {
  it('registers a search extractor covering title, description, and tags', async () => {
    registerModules([tasksModule])
    const def = getEntityType('task')
    expect(def).toBeTruthy()
    expect(def?.collection).toBe('tasks')

    const now = new Date().toISOString()
    const task: Task = {
      id: 't1',
      type: 'task',
      title: 'Renew insurance',
      createdAt: now,
      updatedAt: now,
      tags: ['finance'],
      status: 'todo',
      priority: 'medium',
      description: 'car and house policies',
      linkedIds: [],
    }
    const text = def!.searchText!(task)
    expect(text).toContain('Renew insurance')
    expect(text).toContain('car and house policies')
    expect(text).toContain('finance')
  })
})

describe('module registration', () => {
  it('the manifest wires routes, nav, commands, entity type, and widget with zero core edits', () => {
    registerModules([tasksModule])

    expect(moduleRoutes().map((r) => r.path)).toContain('/tasks')
    expect(getEntityType('task')?.module).toBe('tasks')
    expect(allWidgets().map((w) => w.id)).toContain('tasks.today')
    expect(allCommands().map((c) => c.id)).toContain('tasks.create')
  })
})
