import { create } from 'zustand'

import { newId } from '@/lib/id'
import { createRepository } from '@/core/storage'
import { noteSchema, type NoteInput } from './schema'
import type { Note } from './types'

/** All persistence flows through the kernel repository (ADR-005). */
export const notesRepository = createRepository<Note>('notes', noteSchema)

interface NotesState {
  notes: Note[]
  hydrated: boolean
  hydrate: () => Promise<void>
  create: (input: NoteInput) => Promise<Note>
  update: (id: string, patch: Partial<Note>) => Promise<Note | undefined>
  togglePin: (id: string) => Promise<Note | undefined>
  remove: (id: string) => Promise<void>
}

let hydration: Promise<void> | undefined

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  hydrated: false,

  async hydrate() {
    hydration ??= notesRepository.list().then((notes) => {
      set({ notes: sort(notes), hydrated: true })
    })
    return hydration
  },

  async create(input) {
    const now = new Date().toISOString()
    const note: Note = {
      id: newId(),
      type: 'note',
      title: input.title,
      createdAt: now,
      updatedAt: now,
      tags: input.tags ?? [],
      body: input.body ?? '',
      pinned: input.pinned ?? false,
      projectId: input.projectId,
      linkedIds: input.linkedIds ?? [],
      meta: input.meta,
    }
    const saved = await notesRepository.put(note)
    set({ notes: sort([...get().notes, saved]) })
    return saved
  },

  async update(id, patch) {
    const current = get().notes.find((n) => n.id === id)
    if (!current) return undefined
    const saved = await notesRepository.put({ ...current, ...patch, id })
    set({ notes: sort(get().notes.map((n) => (n.id === id ? saved : n))) })
    return saved
  },

  async togglePin(id) {
    const note = get().notes.find((n) => n.id === id)
    if (!note) return undefined
    return get().update(id, { pinned: !note.pinned })
  },

  async remove(id) {
    await notesRepository.remove(id)
    set({ notes: get().notes.filter((n) => n.id !== id) })
  },
}))

/** Pinned first, then most recently updated. */
function sort(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

/** Fire-and-forget hydration for non-React consumers. */
export function ensureNotesHydrated(): void {
  void useNotesStore.getState().hydrate()
}

/** Test helper. */
export function resetNotesStore(): void {
  hydration = undefined
  useNotesStore.setState({ notes: [], hydrated: false })
}
