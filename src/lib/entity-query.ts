import {
  allEntityTypes,
  getEntityType,
  type BaseEntity,
  type EntityTypeDef,
} from '@/core/entities'
import { getStorageAdapter } from '@/core/storage'

/**
 * Registry-driven entity queries for platform UI (entity picker, chips).
 * Works for every registered entity type — current and future modules —
 * with no module imports: types come from the entity registry, records
 * from the storage adapter, validation from each type's schema.
 */

export interface EntityOption {
  id: string
  type: string
  title: string
  archived?: boolean
}

function resolveDefs(types?: string[]): EntityTypeDef[] {
  if (!types) return allEntityTypes()
  return types
    .map((t) => getEntityType(t))
    .filter((d): d is EntityTypeDef => d !== undefined)
}

/** All live entities of the given types (or every registered type). */
export async function listEntities(types?: string[]): Promise<EntityOption[]> {
  const adapter = getStorageAdapter()
  const options: EntityOption[] = []
  for (const def of resolveDefs(types)) {
    const records = await adapter.list<BaseEntity>(def.collection)
    for (const record of records) {
      const parsed = def.schema.safeParse(record)
      if (parsed.success && !parsed.data.archived) {
        options.push({
          id: parsed.data.id,
          type: parsed.data.type,
          title: parsed.data.title,
        })
      }
    }
  }
  return options.sort((a, b) => a.title.localeCompare(b.title))
}

/** Resolve one entity id to its option, searching the given types. */
export async function findEntity(
  id: string,
  types?: string[]
): Promise<EntityOption | undefined> {
  const adapter = getStorageAdapter()
  for (const def of resolveDefs(types)) {
    const record = await adapter.get<BaseEntity>(def.collection, id)
    if (record) {
      const parsed = def.schema.safeParse(record)
      if (parsed.success) {
        return {
          id: parsed.data.id,
          type: parsed.data.type,
          title: parsed.data.title,
          archived: parsed.data.archived,
        }
      }
    }
  }
  return undefined
}
