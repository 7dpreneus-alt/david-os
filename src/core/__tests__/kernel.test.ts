import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { newId } from '@/lib/id'
import {
  baseEntitySchema,
  links,
  startLinkIntegrity,
  type BaseEntity,
} from '@/core/entities'
import { events } from '@/core/events'
import {
  LocalStorageAdapter,
  createRepository,
  exportSnapshot,
  importSnapshot,
  setStorageAdapter,
} from '@/core/storage'
import {
  activityFor,
  recentActivity,
  startActivityRecorder,
} from '@/core/activity'
import {
  allCommands,
  executeCommand,
  registerCommands,
  resetCommandRegistry,
} from '@/core/commands'
import {
  allThemePresets,
  defaultThemePreset,
  getThemePreset,
} from '@/core/theme'
import {
  moduleRoutes,
  navGroups,
  registerModules,
  resetModuleRegistry,
  type ModuleManifest,
} from '@/core/modules'
import { CheckSquare } from 'lucide-react'
import { createMemoryStorage } from './memory-storage'

interface Note extends BaseEntity {
  type: 'note'
  body: string
}

const noteSchema = baseEntitySchema.extend({
  type: z.literal('note'),
  body: z.string(),
}) as z.ZodType<Note>

function makeNote(overrides: Partial<Note> = {}): Note {
  const now = new Date().toISOString()
  return {
    id: newId(),
    type: 'note',
    title: 'Test note',
    createdAt: now,
    updatedAt: now,
    tags: [],
    body: 'hello',
    ...overrides,
  }
}

let storage: Storage

beforeEach(() => {
  storage = createMemoryStorage()
  setStorageAdapter(new LocalStorageAdapter(storage))
  events.clear()
  resetCommandRegistry()
})

describe('LocalStorageAdapter', () => {
  it('round-trips records and enumerates collections', async () => {
    const adapter = new LocalStorageAdapter(storage)
    await adapter.put('things', { id: 'a', label: 'A' })
    await adapter.put('things', { id: 'b', label: 'B' })
    expect(await adapter.get('things', 'a')).toEqual({ id: 'a', label: 'A' })
    expect((await adapter.list('things')).length).toBe(2)
    await adapter.delete('things', 'a')
    expect(await adapter.get('things', 'a')).toBeUndefined()
    expect(await adapter.listCollections()).toContain('things')
  })

  it('treats corrupt collections as empty instead of throwing', async () => {
    storage.setItem('davidos:data:broken', '{not json')
    const adapter = new LocalStorageAdapter(storage)
    expect(await adapter.list('broken')).toEqual([])
  })

  it('exports and imports a full snapshot', async () => {
    const adapter = new LocalStorageAdapter(storage)
    await adapter.put('things', { id: 'a', label: 'A' })
    const snapshot = await exportSnapshot()
    expect(snapshot.app).toBe('davidos')

    const fresh = createMemoryStorage()
    setStorageAdapter(new LocalStorageAdapter(fresh))
    await importSnapshot(snapshot)
    const restored = await new LocalStorageAdapter(fresh).get('things', 'a')
    expect(restored).toEqual({ id: 'a', label: 'A' })
  })

  it('rejects snapshots from a newer schema version', async () => {
    const snapshot = await exportSnapshot()
    await expect(
      importSnapshot({ ...snapshot, version: 999 })
    ).rejects.toThrow(/newer/)
  })
})

describe('repository', () => {
  it('stamps updatedAt and emits entity.created / entity.updated / entity.deleted', async () => {
    const repo = createRepository<Note>('notes', noteSchema)
    const created = vi.fn()
    const updated = vi.fn()
    const deleted = vi.fn()
    events.on('entity.created', created)
    events.on('entity.updated', updated)
    events.on('entity.deleted', deleted)

    const note = makeNote({ updatedAt: '2000-01-01T00:00:00.000Z' })
    const saved = await repo.put(note)
    expect(saved.updatedAt).not.toBe(note.updatedAt)
    expect(created).toHaveBeenCalledTimes(1)

    await repo.put({ ...saved, body: 'edited' })
    expect(updated).toHaveBeenCalledTimes(1)
    expect(updated.mock.calls[0][0].previous.body).toBe('hello')

    await repo.remove(saved.id)
    expect(deleted).toHaveBeenCalledTimes(1)
    expect(await repo.get(saved.id)).toBeUndefined()
  })

  it('drops invalid records on list instead of crashing', async () => {
    const adapter = new LocalStorageAdapter(storage)
    await adapter.put('notes', { id: 'bad', nope: true })
    const repo = createRepository<Note>('notes', noteSchema)
    await repo.put(makeNote())
    expect((await repo.list()).length).toBe(1)
  })
})

describe('activity timeline', () => {
  it('records every repository mutation with a diff, excluding activities themselves', async () => {
    const stop = startActivityRecorder()
    const repo = createRepository<Note>('notes', noteSchema)

    const note = await repo.put(makeNote({ title: 'Alpha' }))
    await repo.put({ ...note, title: 'Beta' })
    await repo.remove(note.id)
    // recorder writes are fire-and-forget; flush microtasks
    await new Promise((resolve) => setTimeout(resolve, 0))

    const history = await activityFor(note.id)
    const verbs = history.map((a) => a.verb).sort()
    expect(verbs).toEqual(['created', 'deleted', 'updated'])

    const update = history.find((a) => a.verb === 'updated')
    expect(update?.changes?.title).toEqual({ from: 'Alpha', to: 'Beta' })

    // No activity-about-activity recursion:
    const recent = await recentActivity()
    expect(recent.every((a) => a.entityRef.type !== 'activity')).toBe(true)
    stop()
  })
})

describe('links', () => {
  it('creates, queries, and cleans up links when an entity is deleted', async () => {
    const stopIntegrity = startLinkIntegrity()
    const repo = createRepository<Note>('notes', noteSchema)
    const a = await repo.put(makeNote({ title: 'A' }))
    const b = await repo.put(makeNote({ title: 'B' }))

    await links.create(a.id, b.id, 'references')
    expect((await links.for(a.id)).length).toBe(1)
    expect((await links.between(a.id, b.id)).length).toBe(1)

    await repo.remove(a.id)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect((await links.for(b.id)).length).toBe(0)
    stopIntegrity()
  })
})

describe('command engine', () => {
  it('registers, filters by availability, and executes commands', async () => {
    const ran: string[] = []
    registerCommands([
      {
        id: 'test.visible',
        title: 'Visible',
        group: 'Test',
        run: () => {
          ran.push('visible')
        },
      },
      {
        id: 'test.hidden',
        title: 'Hidden',
        group: 'Test',
        when: () => false,
        run: () => {
          ran.push('hidden')
        },
      },
    ])

    const ids = allCommands().map((c) => c.id)
    expect(ids).toContain('test.visible')
    expect(ids).not.toContain('test.hidden')

    const ctx = { navigate: () => {} }
    await executeCommand('test.visible', ctx)
    await executeCommand('test.hidden', ctx)
    expect(ran).toEqual(['visible'])
  })
})

describe('module registry', () => {
  it('a stub module contributes routes, nav, and palette commands with zero core edits', async () => {
    resetModuleRegistry()
    const stub: ModuleManifest = {
      id: 'fitness',
      name: 'Fitness',
      icon: CheckSquare,
      navGroup: 'Life',
      order: 50,
      routes: [{ path: '/fitness', element: null }],
      navItems: [{ title: 'Fitness', url: '/fitness', icon: CheckSquare }],
      commands: [
        {
          id: 'fitness.log-workout',
          title: 'Log workout',
          group: 'Actions',
          run: () => {},
        },
      ],
    }
    registerModules([stub])

    expect(moduleRoutes().map((r) => r.path)).toContain('/fitness')
    const group = navGroups().find((g) => g.label === 'Life')
    expect(group?.items[0]?.url).toBe('/fitness')

    const ids = allCommands().map((c) => c.id)
    expect(ids).toContain('fitness.log-workout')
    expect(ids).toContain('nav:/fitness')

    const visited: string[] = []
    await executeCommand('nav:/fitness', { navigate: (p) => visited.push(p) })
    expect(visited).toEqual(['/fitness'])
    resetModuleRegistry()
  })
})

describe('theme registry', () => {
  it('registers davidos-dark as the default preset alongside template presets', () => {
    expect(defaultThemePreset().id).toBe('davidos-dark')
    expect(getThemePreset('davidos-dark')?.styles.dark.background).toBeTruthy()
    expect(allThemePresets('shadcn').length).toBeGreaterThan(0)
    expect(allThemePresets('tweakcn').length).toBeGreaterThan(0)
  })
})
