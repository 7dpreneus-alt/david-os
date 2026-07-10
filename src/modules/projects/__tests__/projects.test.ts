import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { newId } from '@/lib/id'
import { activityFor, startActivityRecorder } from '@/core/activity'
import {
  allCommands,
  queryCommands,
  resetCommandRegistry,
} from '@/core/commands'
import {
  baseEntitySchema,
  getEntityType,
  links,
  registerEntityType,
  resetEntityTypeRegistry,
  type BaseEntity,
} from '@/core/entities'
import { events } from '@/core/events'
import {
  LocalStorageAdapter,
  createRepository,
  setStorageAdapter,
} from '@/core/storage'
import {
  moduleRoutes,
  registerModules,
  resetModuleRegistry,
} from '@/core/modules'
import { allWidgets, resetWidgetRegistry } from '@/core/widgets'
import { createMemoryStorage } from '@/core/__tests__/memory-storage'
import { resetTasksStore, useTasksStore } from '@/modules/tasks/store'
import { tasksModule } from '@/modules/tasks/manifest'
import { projectsModule } from '../manifest'
import { deriveHealth, deriveProgress, projectChildren, projectInsights } from '../derive'
import { projectsRepository, resetProjectsStore, useProjectsStore } from '../store'

/**
 * A stand-in for a FUTURE module's entity (e.g. Fitness workout): projects
 * must derive progress from it without knowing its type.
 */
interface Workout extends BaseEntity {
  type: 'workout'
  status: 'planned' | 'done' | 'blocked'
  projectId?: string
}
const workoutSchema = baseEntitySchema.extend({
  type: z.literal('workout'),
  status: z.enum(['planned', 'done', 'blocked']),
  projectId: z.string().optional(),
}) as z.ZodType<Workout>

function makeWorkout(overrides: Partial<Workout>): Workout {
  const now = new Date().toISOString()
  return {
    id: newId(),
    type: 'workout',
    title: 'Workout',
    createdAt: now,
    updatedAt: now,
    tags: [],
    status: 'planned',
    ...overrides,
  }
}

let storage: Storage

beforeEach(() => {
  storage = createMemoryStorage()
  setStorageAdapter(new LocalStorageAdapter(storage))
  events.clear()
  resetCommandRegistry()
  resetModuleRegistry()
  resetWidgetRegistry()
  resetEntityTypeRegistry()
  resetProjectsStore()
  resetTasksStore()
})

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const PAST = '2000-01-01'
const FUTURE = '2999-12-31'

describe('project persistence', () => {
  it('creates through the kernel repository and survives rehydration with future-ready fields', async () => {
    const project = await useProjectsStore.getState().create({
      title: 'DavidOS v1',
      owner: 'David',
      priority: 'high',
      startDate: '2026-07-01',
      targetDate: FUTURE,
      tags: ['flagship'],
      milestones: [{ id: 'm1', title: 'Kernel', done: true }],
      linkedIds: ['note-123'],
      meta: { budget: 0 },
    })

    const persisted = await projectsRepository.get(project.id)
    expect(persisted?.owner).toBe('David')
    expect(persisted?.priority).toBe('high')
    expect(persisted?.milestones[0]).toEqual({ id: 'm1', title: 'Kernel', done: true })
    expect(persisted?.linkedIds).toEqual(['note-123'])
    expect(persisted?.meta).toEqual({ budget: 0 })

    resetProjectsStore()
    await useProjectsStore.getState().hydrate()
    expect(useProjectsStore.getState().projects.map((p) => p.id)).toContain(project.id)
  })

  it('complete and archive stamp state and emit domain events', async () => {
    const completed = vi.fn()
    const archived = vi.fn()
    events.on('project.completed', completed)
    events.on('project.archived', archived)

    const project = await useProjectsStore.getState().create({ title: 'Wrap up' })
    await useProjectsStore.getState().complete(project.id)
    const done = useProjectsStore.getState().projects.find((p) => p.id === project.id)
    expect(done?.status).toBe('completed')
    expect(done?.completedAt).toBeTruthy()
    expect(completed).toHaveBeenCalledTimes(1)

    await useProjectsStore.getState().archive(project.id)
    expect(archived).toHaveBeenCalledTimes(1)
    expect(
      useProjectsStore.getState().projects.find((p) => p.id === project.id)?.archived
    ).toBe(true)
  })
})

describe('project relationships (not tasks-only)', () => {
  it('discovers children via projectId, the link store, and linkedIds across entity types', async () => {
    registerModules([projectsModule, tasksModule])
    registerEntityType({
      type: 'workout',
      module: 'fitness',
      collection: 'workouts',
      schema: workoutSchema,
      labels: { singular: 'Workout', plural: 'Workouts' },
    })
    const workouts = createRepository<Workout>('workouts', workoutSchema)

    const project = await useProjectsStore.getState().create({ title: 'Get strong' })

    // 1. projectId back-reference from a Task
    const task = await useTasksStore.getState().create({
      title: 'Buy rack',
      projectId: project.id,
    })
    // 2. central link store to a future-module entity
    const linkedWorkout = await workouts.put(makeWorkout({ title: 'Squat day' }))
    await links.create(project.id, linkedWorkout.id, 'references')
    // 3. linkedIds field
    const listedWorkout = await workouts.put(makeWorkout({ title: 'Bench day' }))
    await useProjectsStore.getState().update(project.id, {
      linkedIds: [listedWorkout.id],
    })

    const updated = useProjectsStore.getState().projects.find((p) => p.id === project.id)!
    const children = await projectChildren(updated)
    const ids = children.map((c) => c.id).sort()
    expect(ids).toEqual([task.id, linkedWorkout.id, listedWorkout.id].sort())
  })
})

describe('derived progress', () => {
  it('computes percent from mixed children and milestones without stored progress', async () => {
    registerModules([projectsModule, tasksModule])
    registerEntityType({
      type: 'workout',
      module: 'fitness',
      collection: 'workouts',
      schema: workoutSchema,
      labels: { singular: 'Workout', plural: 'Workouts' },
    })
    const workouts = createRepository<Workout>('workouts', workoutSchema)

    const project = await useProjectsStore.getState().create({
      title: 'Mixed progress',
      milestones: [
        { id: 'm1', title: 'Design', done: true },
        { id: 'm2', title: 'Ship', done: false },
      ],
    })
    const doneTask = await useTasksStore.getState().create({
      title: 'Done task',
      projectId: project.id,
    })
    await useTasksStore.getState().setStatus(doneTask.id, 'done')
    await useTasksStore.getState().create({ title: 'Open task', projectId: project.id })
    await workouts.put(makeWorkout({ title: 'Done workout', status: 'done', projectId: project.id }))
    await workouts.put(makeWorkout({ title: 'Open workout', projectId: project.id }))

    const current = useProjectsStore.getState().projects.find((p) => p.id === project.id)!
    const children = await projectChildren(current)
    const progress = deriveProgress(current, children)

    // 4 items (2 done) + 2 milestones (1 done) = 3/6 = 50%
    expect(progress.items).toBe(4)
    expect(progress.itemsDone).toBe(2)
    expect(progress.milestones).toBe(2)
    expect(progress.milestonesDone).toBe(1)
    expect(progress.percent).toBe(50)
  })

  it('has no percent with nothing countable, and 100 when completed', async () => {
    registerModules([projectsModule])
    const project = await useProjectsStore.getState().create({ title: 'Empty' })
    expect(deriveProgress(project, []).percent).toBeUndefined()

    await useProjectsStore.getState().complete(project.id)
    const done = useProjectsStore.getState().projects.find((p) => p.id === project.id)!
    expect(deriveProgress(done, []).percent).toBe(100)
  })
})

describe('derived health (explainable)', () => {
  it('blocked children make the project blocked, with a reason', async () => {
    registerModules([projectsModule, tasksModule])
    const project = await useProjectsStore.getState().create({ title: 'Stuck' })
    const task = await useTasksStore.getState().create({
      title: 'Waiting on vendor',
      projectId: project.id,
    })
    await useTasksStore.getState().setStatus(task.id, 'blocked')

    const insights = await projectInsights(
      useProjectsStore.getState().projects.find((p) => p.id === project.id)!
    )
    expect(insights.health.health).toBe('blocked')
    expect(insights.health.reasons[0]).toMatch(/blocked/)
  })

  it('passed target dates, overdue children, and late milestones mean at-risk', async () => {
    registerModules([projectsModule, tasksModule])
    const project = await useProjectsStore.getState().create({
      title: 'Slipping',
      targetDate: PAST,
      milestones: [{ id: 'm1', title: 'Late milestone', done: false, dueDate: PAST }],
    })
    await useTasksStore.getState().create({
      title: 'Overdue task',
      projectId: project.id,
      dueDate: PAST,
    })

    const current = useProjectsStore.getState().projects.find((p) => p.id === project.id)!
    const health = deriveHealth(current, await projectChildren(current))
    expect(health.health).toBe('at-risk')
    expect(health.reasons.join(' ')).toMatch(/Target date/)
    expect(health.reasons.join(' ')).toMatch(/overdue/)
    expect(health.reasons.join(' ')).toMatch(/milestone/)
  })

  it('completed wins, on-track is the healthy default with a reason', async () => {
    registerModules([projectsModule])
    const project = await useProjectsStore.getState().create({ title: 'Healthy' })
    const onTrack = deriveHealth(project, [])
    expect(onTrack.health).toBe('on-track')
    expect(onTrack.reasons.length).toBeGreaterThan(0)

    await useProjectsStore.getState().complete(project.id)
    const done = useProjectsStore.getState().projects.find((p) => p.id === project.id)!
    expect(deriveHealth(done, []).health).toBe('completed')
  })
})

describe('project commands', () => {
  it('registers create/nav commands; provider surfaces recent, matching, complete, archive', async () => {
    registerModules([projectsModule])
    const ids = allCommands().map((c) => c.id)
    expect(ids).toContain('projects.create')
    expect(ids).toContain('nav:/projects')

    const alpha = await useProjectsStore.getState().create({ title: 'Alpha launch' })
    await useProjectsStore.getState().create({ title: 'Beta cleanup' })

    // Empty query → recent projects
    const recent = await queryCommands('')
    expect(recent.some((c) => c.group === 'Recent projects')).toBe(true)

    // Matching query → open + complete + archive for the match only
    const results = await queryCommands('alpha')
    const resultIds = results.map((c) => c.id)
    expect(resultIds).toContain(`projects.open:${alpha.id}`)
    expect(resultIds).toContain(`projects.complete:${alpha.id}`)
    expect(resultIds).toContain(`projects.archive:${alpha.id}`)
    expect(resultIds.join(' ')).not.toMatch(/Beta/)

    // Complete via command
    const complete = results.find((c) => c.id === `projects.complete:${alpha.id}`)
    await complete?.run({ navigate: () => {} })
    await flush()
    expect(
      useProjectsStore.getState().projects.find((p) => p.id === alpha.id)?.status
    ).toBe('completed')

    // Archive via command; archived projects leave the provider results
    const archive = (await queryCommands('alpha')).find(
      (c) => c.id === `projects.archive:${alpha.id}`
    )
    await archive?.run({ navigate: () => {} })
    await flush()
    expect(
      useProjectsStore.getState().projects.find((p) => p.id === alpha.id)?.archived
    ).toBe(true)
    expect((await queryCommands('alpha')).map((c) => c.id)).not.toContain(
      `projects.open:${alpha.id}`
    )
  })
})

describe('project search', () => {
  it('search extractor covers title, description, owner, tags, milestones', () => {
    registerModules([projectsModule])
    const def = getEntityType('project')!
    const now = new Date().toISOString()
    const text = def.searchText!({
      id: 'p1',
      type: 'project',
      title: 'Website Rescue',
      createdAt: now,
      updatedAt: now,
      tags: ['client'],
      status: 'active',
      description: 'salvage the old site',
      owner: 'David',
      milestones: [{ id: 'm1', title: 'Audit pages', done: false }],
      linkedIds: [],
    } as never)
    for (const term of ['Website Rescue', 'salvage', 'David', 'client', 'Audit pages']) {
      expect(text).toContain(term)
    }
  })
})

describe('module registration (zero kernel edits)', () => {
  it('manifest wires route, nav, entity type, commands, and all three widgets', () => {
    registerModules([projectsModule])
    expect(moduleRoutes().map((r) => r.path)).toContain('/projects')
    expect(getEntityType('project')?.module).toBe('projects')
    const widgetIds = allWidgets().map((w) => w.id)
    expect(widgetIds).toContain('projects.active')
    expect(widgetIds).toContain('projects.health')
    expect(widgetIds).toContain('projects.recent')
  })
})

describe('project activity events', () => {
  it('every mutation lands on the Activity Timeline', async () => {
    const stop = startActivityRecorder()
    const project = await useProjectsStore.getState().create({ title: 'Audited' })
    await useProjectsStore.getState().update(project.id, { owner: 'David' })
    await useProjectsStore.getState().complete(project.id)
    await useProjectsStore.getState().remove(project.id)
    await flush()

    const verbs = (await activityFor(project.id)).map((a) => a.verb)
    expect(verbs.filter((v) => v === 'created').length).toBe(1)
    expect(verbs.filter((v) => v === 'updated').length).toBe(2)
    expect(verbs.filter((v) => v === 'deleted').length).toBe(1)
    stop()
  })
})
