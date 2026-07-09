import type { Snapshot, StorageAdapter } from './adapter'
import { LocalStorageAdapter } from './adapters/local-storage'

/**
 * The single point where a storage backend is chosen (ADR-005). Everything
 * else — repositories, engines, modules — resolves the adapter through here.
 */
let adapter: StorageAdapter | undefined

export function setStorageAdapter(next: StorageAdapter): void {
  adapter = next
}

export function getStorageAdapter(): StorageAdapter {
  if (!adapter) {
    adapter = new LocalStorageAdapter()
  }
  return adapter
}

export async function exportSnapshot(): Promise<Snapshot> {
  return getStorageAdapter().exportAll()
}

export async function importSnapshot(snapshot: Snapshot): Promise<void> {
  return getStorageAdapter().importAll(snapshot)
}
