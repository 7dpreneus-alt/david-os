export { notesModule } from './manifest'
export { noteSchema, type NoteInput } from './schema'
export {
  ensureNotesHydrated,
  notesRepository,
  resetNotesStore,
  useNotesStore,
} from './store'
export type { Note } from './types'
