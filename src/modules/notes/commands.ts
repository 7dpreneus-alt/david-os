import { Pin, PinOff, Plus, StickyNote } from 'lucide-react'

import type { CommandDef, CommandProvider } from '@/core/commands'
import { ensureNotesHydrated, useNotesStore } from './store'

export const noteCommands: CommandDef[] = [
  {
    id: 'notes.create',
    title: 'New Note',
    icon: Plus,
    group: 'Actions',
    keywords: ['create', 'add', 'note', 'capture', 'write'],
    run: ({ navigate }) => navigate('/notes?new=1'),
  },
]

const MAX_MATCHES = 5

/** Query-time provider: open and pin/unpin commands for matching notes. */
export const notesCommandProvider: CommandProvider = (query) => {
  const trimmed = query.trim().toLowerCase()
  if (trimmed.length < 2) return []

  ensureNotesHydrated()
  const { notes } = useNotesStore.getState()
  const matches = notes
    .filter(
      (note) =>
        !note.archived &&
        (note.title.toLowerCase().includes(trimmed) ||
          note.body.toLowerCase().includes(trimmed) ||
          note.tags.some((tag) => tag.toLowerCase().includes(trimmed)))
    )
    .slice(0, MAX_MATCHES)

  // The matched query rides along as a keyword so the palette's display
  // filter keeps results matched on body/tags visible.
  return matches.flatMap((note): CommandDef[] => [
    {
      id: `notes.open:${note.id}`,
      title: `Open note: ${note.title}`,
      icon: StickyNote,
      group: 'Notes',
      keywords: [trimmed],
      run: ({ navigate }) => navigate(`/notes?note=${note.id}`),
    },
    {
      id: `notes.pin:${note.id}`,
      title: `${note.pinned ? 'Unpin' : 'Pin'} note: ${note.title}`,
      icon: note.pinned ? PinOff : Pin,
      group: 'Notes',
      keywords: [trimmed],
      run: () => {
        void useNotesStore.getState().togglePin(note.id)
      },
    },
  ])
}
