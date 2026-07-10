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
import { projectsModule } from '@/modules/projects/manifest'
import { projectInsights } from '@/modules/projects/derive'
import { resetProjectsStore, useProjectsStore } from '@/modules/projects/store'
import { goalsModule } from '../manifest'
import { goalProgress } from '../progress'
import { goalsRepository, resetGoalsStore, useGoalsStore } from '../store'

let storage: Storage

beforeEach(() => {
  storage = createMemoryStorage()
  setStorageAdapter(new LocalStorageAdapter(storage))
  events.clear()
  resetCommandRegistry()
  resetModuleRegistry()
  resetWidgetRegistry()
  resetEntityTypeRegistry()
  resetGoalsStore()
  resetProjectsStore()
})

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('goal persistence', () => {
  it('creates through the kernel repository and survives rehydration', async () => {
    const goal = await useGoalsStore.getState().create({
      title: 'Land 20 retainer clients',
      kind: 'metric',
      target: 20,
      current: 12,
      unit: 'clients',
      targetDate: '2026-12-31',
      projectId: 'proj-1',
      tags: ['business'],
    })

    const persisted = await goalsRepository.get(goal.id)
    expect(persisted?.target).toBe(20)
    expect(persisted?.current).toBe(12)
    expect(persisted?.unit).toBe('clients')
    expect(persisted?.projectId).toBe('proj-1')

    resetGoalsStore()
    await useGoalsStore.getState().hydrate()
    expect(useGoalsStore.getState().goals.map((g) => g.id)).toContain(goal.id)
  })
})

describe('derived goal progress', () => {
  it('metric goals derive percent from current/target', async () => {
    const goal = await useGoalsStore.getState().create({
      title: 'Metric',
      kind: 'metric',
      target: 20,
      current: 12,
      unit: 'clients',
    })
    const progress = goalProgress(goal)
    expect(progress.percent).toBe(60)
    expect(progress.label).toBe('12 / 20 clients')
    expect(progress.reached).toBe(false)
  })

  it('milestone goals derive percent from done milestones', async () => {
    const goal = await useGoalsStore.getState().create({
      title: 'Milestones',
      kind: 'milestone',
      milestones: [
        { id: 'm1', title: 'One', done: true },
        { id: 'm2', title: 'Two', done: false },
        { id: 'm3', title: 'Three', done: false },
      ],
    })
    const progress = goalProgress(goal)
    expect(progress.percent).toBe(33)
    expect(progress.label).toBe('1 of 3 milestones')
  })

  it('logging progress to target auto-achieves, stamps completedAt, emits goal.achieved', async () => {
    const achieved = vi.fn()
    events.on('goal.achieved', achieved)
    const goal = await useGoalsStore.getState().create({
      title: 'Auto',
      kind: 'metric',
      target: 10,
      current: 9,
    })

    await useGoalsStore.getState().logProgress(goal.id, 10)
    const done = useGoalsStore.getState().goals.find((g) => g.id === goal.id)
    expect(done?.status).toBe('achieved')
    expect(done?.completedAt).toBeTruthy()
    expect(achieved).toHaveBeenCalledTimes(1)
    expect(goalProgress(done!).percent).toBe(100)
  })

  it('completing the last milestone auto-achieves', async () => {
    const goal = await useGoalsStore.getState().create({
      title: 'Checklist',
      kind: 'milestone',
      milestones: [
        { id: 'm1', title: 'One', done: true },
        { id: 'm2', title: 'Two', done: false },
      ],
    })
    await useGoalsStore.getState().toggleMilestone(goal.id, 'm2')
    expect(
      useGoalsStore.getState().goals.find((g) => g.id === goal.id)?.status
    ).toBe('achieved')
  })
})

describe('goals feed project derivation', () => {
  it('an achieved goal counts as a done child in project progress', async () => {
    registerModules([projectsModule, goalsModule])
    const project = await useProjectsStore.getState().create({ title: 'Growth' })
    const goal = await useGoalsStore.getState().create({
      title: 'Revenue goal',
      kind: 'metric',
      target: 5,
      current: 5, // already at target
      projectId: project.id,
    })
    // Achieved via auto-achieve on next progress log
    await useGoalsStore.getState().logProgress(goal.id, 5)

    const insights = await projectInsights(
      useProjectsStore.getState().projects.find((p) => p.id === project.id)!
    )
    expect(insights.progress.items).toBe(1)
    expect(insights.progress.itemsDone).toBe(1)
    expect(insights.progress.percent).toBe(100)
  })
})

describe('goal commands', () => {
  it('registers create/nav; provider surfaces open + achieve, and achieve works', async () => {
    registerModules([goalsModule])
    const ids = allCommands().map((c) => c.id)
    expect(ids).toContain('goals.create')
    expect(ids).toContain('nav:/goals')

    const goal = await useGoalsStore.getState().create({
      title: 'Publish weekly videos',
      kind: 'metric',
      target: 52,
    })
    const results = await queryCommands('videos')
    const resultIds = results.map((c) => c.id)
    expect(resultIds).toContain(`goals.open:${goal.id}`)
    expect(resultIds).toContain(`goals.achieve:${goal.id}`)

    const achieve = results.find((c) => c.id === `goals.achieve:${goal.id}`)
    await achieve?.run({ navigate: () => {} })
    await flush()
    expect(
      useGoalsStore.getState().goals.find((g) => g.id === goal.id)?.status
    ).toBe('achieved')
    expect((await queryCommands('videos')).map((c) => c.id)).not.toContain(
      `goals.achieve:${goal.id}`
    )
  })
})

describe('goal search & registration', () => {
  it('search extractor covers title, description, unit, tags, milestones', () => {
    registerModules([goalsModule])
    const def = getEntityType('goal')!
    const now = new Date().toISOString()
    const text = def.searchText!({
      id: 'g1',
      type: 'goal',
      title: 'Bench press bodyweight',
      createdAt: now,
      updatedAt: now,
      tags: ['fitness'],
      kind: 'milestone',
      status: 'active',
      description: 'strength block',
      unit: 'kg',
      milestones: [{ id: 'm1', title: 'Hit 80kg', done: false }],
      linkedIds: [],
    } as never)
    for (const term of ['Bench press', 'strength block', 'kg', 'fitness', 'Hit 80kg']) {
      expect(text).toContain(term)
    }
  })

  it('manifest wires route, nav, entity type, commands, widget — zero kernel edits', () => {
    registerModules([goalsModule])
    expect(moduleRoutes().map((r) => r.path)).toContain('/goals')
    expect(getEntityType('goal')?.module).toBe('goals')
    expect(allWidgets().map((w) => w.id)).toContain('goals.progress')
  })
})

describe('goal activity events', () => {
  it('every mutation lands on the Activity Timeline', async () => {
    const stop = startActivityRecorder()
    const goal = await useGoalsStore.getState().create({
      title: 'Audited goal',
      kind: 'metric',
      target: 3,
    })
    await useGoalsStore.getState().logProgress(goal.id, 1)
    await useGoalsStore.getState().remove(goal.id)
    await flush()

    const verbs = (await activityFor(goal.id)).map((a) => a.verb)
    expect(verbs).toContain('created')
    expect(verbs).toContain('updated')
    expect(verbs).toContain('deleted')
    stop()
  })
})
