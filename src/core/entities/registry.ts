import type { BaseEntity, EntityTypeDef } from './types'

/**
 * Entity-type registry. Maps a type key to its schema, collection, icon and
 * labels so generic UI (search results, link pickers, timeline, widgets) can
 * validate and render any entity without knowing its module.
 */
const types = new Map<string, EntityTypeDef>()

export function registerEntityType<T extends BaseEntity>(
  def: EntityTypeDef<T>
): void {
  if (types.has(def.type)) {
    console.warn(`[entities] type "${def.type}" registered twice; replacing`)
  }
  types.set(def.type, def as unknown as EntityTypeDef)
}

export function registerEntityTypes(defs: EntityTypeDef[]): void {
  for (const def of defs) registerEntityType(def)
}

export function getEntityType(type: string): EntityTypeDef | undefined {
  return types.get(type)
}

export function allEntityTypes(): EntityTypeDef[] {
  return [...types.values()]
}

/** Test helper. */
export function resetEntityTypeRegistry(): void {
  types.clear()
}
