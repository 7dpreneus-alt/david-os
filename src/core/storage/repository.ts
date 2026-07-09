import type { z } from 'zod'

import type { BaseEntity } from '@/core/entities/types'
import { events } from '@/core/events'
import { getStorageAdapter } from './provider'

/**
 * Typed access to one collection. Repositories validate on read/write,
 * stamp `updatedAt`, and emit `entity.*` events — the signals that keep the
 * Activity Timeline, search index, and Memory Engine current (ADR-008/016).
 */
export interface Repository<T extends BaseEntity> {
  collection: string
  get(id: string): Promise<T | undefined>
  list(): Promise<T[]>
  put(value: T): Promise<T>
  remove(id: string): Promise<void>
}

/**
 * Low-level store for non-entity records (e.g. links, key-value settings).
 * No events, no stamping — just validated persistence.
 */
export interface RecordStore<T extends { id: string }> {
  collection: string
  get(id: string): Promise<T | undefined>
  list(): Promise<T[]>
  put(value: T): Promise<T>
  remove(id: string): Promise<void>
}

export function createRecordStore<T extends { id: string }>(
  collection: string,
  schema: z.ZodType<T>
): RecordStore<T> {
  return {
    collection,
    async get(id) {
      const raw = await getStorageAdapter().get(collection, id)
      if (raw === undefined) return undefined
      const parsed = schema.safeParse(raw)
      return parsed.success ? parsed.data : undefined
    },
    async list() {
      const raw = await getStorageAdapter().list(collection)
      const valid: T[] = []
      for (const record of raw) {
        const parsed = schema.safeParse(record)
        if (parsed.success) {
          valid.push(parsed.data)
        } else {
          console.warn(`[storage] dropping invalid record in "${collection}"`)
        }
      }
      return valid
    },
    async put(value) {
      const parsed = schema.parse(value)
      await getStorageAdapter().put(collection, parsed)
      return parsed
    },
    async remove(id) {
      await getStorageAdapter().delete(collection, id)
    },
  }
}

export function createRepository<T extends BaseEntity>(
  collection: string,
  schema: z.ZodType<T>
): Repository<T> {
  const records = createRecordStore(collection, schema)

  return {
    collection,
    get: records.get,
    list: records.list,
    async put(value) {
      const previous = await records.get(value.id)
      const stamped: T = { ...value, updatedAt: new Date().toISOString() }
      const saved = await records.put(stamped)
      if (previous) {
        events.emit('entity.updated', { collection, entity: saved, previous })
      } else {
        events.emit('entity.created', { collection, entity: saved })
      }
      return saved
    },
    async remove(id) {
      const entity = await records.get(id)
      await records.remove(id)
      if (entity) {
        events.emit('entity.deleted', { collection, entity })
      }
    },
  }
}
