import { beforeEach, describe, expect, it } from 'vitest'

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
import { notesModule } from '../manifest'
import { notesRepository, resetNotesStore, useNotesStore } from '../store'

beforeEach(() => {
  setStorageAdapter(new LocalStorageAdapter(createMemoryStorage()))
  events.clear()
  resetCommandRegistry()
  resetModuleRegistry()
  resetWidgetRegistry()
  resetEntityTypeRegistry()
  resetNotesStore()
})

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('note persistence', () => {
  it('creates through the kernel repository and survives rehydration', async () => {
    const note = await useNotesStore.getState().create({
      title: 'Client call notes',
      body: '## Meridian\n- wants launch by fall',
      projectId: 'proj-1',
      tags: ['client'],
    })

    const persisted = await notesRepository.get(note.id)
    expect(persisted?.body).toContain('wants launch by fall')
    expect(persisted?.projectId).toBe('proj-1')
    expect(persisted?.pinned).toBe(false)

    resetNotesStore()
    await useNotesStore.getState().hydrate()
    expect(useNotesStore.getState().notes.map((n) => n.id)).toContain(note.id)
  })

  it('pinned notes sort first, then by recency', async () => {
    const store = useNotesStore.getState()
    const older = await store.create({ title: 'Older' })
    await store.create({ title: 'Newer' })
    await useNotesStore.getState().togglePin(older.id)

    const titles = useNotesStore.getState().notes.map((n) => n.title)
    expect(titles[0]).toBe('Older') // pinned wins over recency
  })
})

describe('note commands', () => {
  it('registers create/nav; provider matches body text and pin toggles', async () => {
    registerModules([notesModule])
    const ids = allCommands().map((c) => c.id)
    expect(ids).toContain('notes.create')
    expect(ids).toContain('nav:/notes')

    const note = await useNotesStore.getState().create({
      title: 'Ideas',
      body: 'try a drone photography offer',
    })

    // Matches on body content, not just title
    const results = await queryCommands('drone')
    const resultIds = results.map((c) => c.id)
    expect(resultIds).toContain(`notes.open:${note.id}`)
    expect(resultIds).toContain(`notes.pin:${note.id}`)

    const pin = results.find((c) => c.id === `notes.pin:${note.id}`)
    await pin?.run({ navigate: () => {} })
    await flush()
    expect(
      useNotesStore.getState().notes.find((n) => n.id === note.id)?.pinned
    ).toBe(true)

    // Command title flips to Unpin after pinning
    const after = await queryCommands('drone')
    expect(
      after.find((c) => c.id === `notes.pin:${note.id}`)?.title
    ).toMatch(/^Unpin/)
  })
})

describe('note search & registration', () => {
  it('search extractor covers title, body, and tags', () => {
    registerModules([notesModule])
    const def = getEntityType('note')!
    const now = new Date().toISOString()
    const text = def.searchText!({
      id: 'n1',
      type: 'note',
      title: 'Inventory shelving plan',
      createdAt: now,
      updatedAt: now,
      tags: ['warehouse'],
      body: 'order 4 heavy racks',
      pinned: false,
      linkedIds: [],
    } as never)
    for (const term of ['Inventory shelving plan', 'heavy racks', 'warehouse']) {
      expect(text).toContain(term)
    }
  })

  it('manifest wires route, nav, entity type, commands, widget — zero kernel edits', () => {
    registerModules([notesModule])
    expect(moduleRoutes().map((r) => r.path)).toContain('/notes')
    expect(getEntityType('note')?.module).toBe('notes')
    expect(allWidgets().map((w) => w.id)).toContain('notes.recent')
  })
})

describe('note activity events', () => {
  it('every mutation lands on the Activity Timeline', async () => {
    const stop = startActivityRecorder()
    const note = await useNotesStore.getState().create({ title: 'Audited note' })
    await useNotesStore.getState().update(note.id, { body: 'edited' })
    await useNotesStore.getState().remove(note.id)
    await flush()

    const verbs = (await activityFor(note.id)).map((a) => a.verb)
    expect(verbs).toContain('created')
    expect(verbs).toContain('updated')
    expect(verbs).toContain('deleted')
    stop()
  })
})
