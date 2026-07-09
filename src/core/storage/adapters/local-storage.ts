import { SNAPSHOT_VERSION, type Snapshot, type StorageAdapter } from '../adapter'

const PREFIX = 'davidos:data:'
const META_KEY = 'davidos:meta'

interface Meta {
  version: number
}

/**
 * v1 adapter: one localStorage key per collection, holding a record map
 * keyed by id. Corrupt or missing data never throws — reads fall back to an
 * empty collection (PRD resilience requirement).
 */
export class LocalStorageAdapter implements StorageAdapter {
  private store: Storage

  constructor(store: Storage | undefined = globalThis.localStorage) {
    if (!store) {
      throw new Error(
        'LocalStorageAdapter requires a Storage implementation (none found on globalThis)'
      )
    }
    this.store = store
    this.ensureMeta()
  }

  private ensureMeta(): void {
    if (!this.store.getItem(META_KEY)) {
      const meta: Meta = { version: SNAPSHOT_VERSION }
      this.store.setItem(META_KEY, JSON.stringify(meta))
    }
  }

  private key(collection: string): string {
    return `${PREFIX}${collection}`
  }

  private read(collection: string): Record<string, unknown> {
    const raw = this.store.getItem(this.key(collection))
    if (!raw) return {}
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
      return {}
    } catch {
      console.error(`[storage] corrupt collection "${collection}"; treating as empty`)
      return {}
    }
  }

  private write(collection: string, records: Record<string, unknown>): void {
    this.store.setItem(this.key(collection), JSON.stringify(records))
  }

  async get<T>(collection: string, id: string): Promise<T | undefined> {
    return this.read(collection)[id] as T | undefined
  }

  async list<T>(collection: string): Promise<T[]> {
    return Object.values(this.read(collection)) as T[]
  }

  async put<T extends { id: string }>(collection: string, value: T): Promise<void> {
    const records = this.read(collection)
    records[value.id] = value
    this.write(collection, records)
  }

  async delete(collection: string, id: string): Promise<void> {
    const records = this.read(collection)
    if (!(id in records)) return
    delete records[id]
    this.write(collection, records)
  }

  async listCollections(): Promise<string[]> {
    const collections: string[] = []
    for (let i = 0; i < this.store.length; i++) {
      const key = this.store.key(i)
      if (key?.startsWith(PREFIX)) {
        collections.push(key.slice(PREFIX.length))
      }
    }
    return collections
  }

  async exportAll(): Promise<Snapshot> {
    const collections: Snapshot['collections'] = {}
    for (const name of await this.listCollections()) {
      collections[name] = this.read(name)
    }
    return {
      app: 'davidos',
      version: SNAPSHOT_VERSION,
      exportedAt: new Date().toISOString(),
      collections,
    }
  }

  async importAll(snapshot: Snapshot): Promise<void> {
    if (snapshot.app !== 'davidos') {
      throw new Error('[storage] snapshot is not a DavidOS export')
    }
    if (snapshot.version > SNAPSHOT_VERSION) {
      throw new Error(
        `[storage] snapshot version ${snapshot.version} is newer than supported ${SNAPSHOT_VERSION}`
      )
    }
    // Replace wholesale: drop current collections, then write the snapshot's.
    for (const name of await this.listCollections()) {
      this.store.removeItem(this.key(name))
    }
    for (const [name, records] of Object.entries(snapshot.collections)) {
      this.write(name, records)
    }
    this.store.setItem(META_KEY, JSON.stringify({ version: SNAPSHOT_VERSION }))
  }
}
