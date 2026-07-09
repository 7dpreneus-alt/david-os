/**
 * Storage abstraction (ADR-005). Feature code never touches a backend
 * directly — it goes through typed repositories, which go through the
 * configured StorageAdapter. LocalStorage today; SQLite/Supabase/Postgres
 * are future adapters behind the same interface.
 */

export const SNAPSHOT_VERSION = 1

/** Full export of every collection, used for backup/restore and migration. */
export interface Snapshot {
  app: 'davidos'
  version: number
  exportedAt: string
  collections: Record<string, Record<string, unknown>>
}

export interface StorageAdapter {
  get<T>(collection: string, id: string): Promise<T | undefined>
  list<T>(collection: string): Promise<T[]>
  put<T extends { id: string }>(collection: string, value: T): Promise<void>
  delete(collection: string, id: string): Promise<void>
  listCollections(): Promise<string[]>
  exportAll(): Promise<Snapshot>
  importAll(snapshot: Snapshot): Promise<void>
}
