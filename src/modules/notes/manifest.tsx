import { lazy } from 'react'
import { StickyNote } from 'lucide-react'

import type { ModuleManifest } from '@/core/modules'
import { noteCommands, notesCommandProvider } from './commands'
import { noteSchema } from './schema'
import { RecentNotesWidget } from './components/recent-notes-widget'
import type { Note } from './types'

const NotesPage = lazy(() => import('./components/notes-page'))

export const notesModule: ModuleManifest = {
  id: 'notes',
  name: 'Notes',
  icon: StickyNote,
  navGroup: 'Work',
  order: 12,
  routes: [{ path: '/notes', element: <NotesPage /> }],
  navItems: [{ title: 'Notes', url: '/notes', icon: StickyNote }],
  commands: noteCommands,
  commandProviders: [notesCommandProvider],
  entityTypes: [
    {
      type: 'note',
      module: 'notes',
      collection: 'notes',
      schema: noteSchema,
      icon: StickyNote,
      labels: { singular: 'Note', plural: 'Notes' },
      searchText: (entity) => {
        const note = entity as Note
        return [note.title, note.body, ...note.tags].join(' ')
      },
    },
  ],
  widgets: [
    {
      id: 'notes.recent',
      title: 'Recent Notes',
      module: 'notes',
      description: 'Pinned and recently updated notes.',
      icon: StickyNote,
      component: RecentNotesWidget,
      defaultSize: { w: 1, h: 1 },
      capabilities: ['entities:read:note'],
    },
  ],
}
