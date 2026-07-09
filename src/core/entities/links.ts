import { newId } from '@/lib/id'
import { events, type Unsubscribe } from '@/core/events'
import { createRecordStore } from '@/core/storage'
import { entityLinkSchema } from './schema'
import type { EntityLink } from './types'

const store = createRecordStore<EntityLink>('links', entityLinkSchema)

/**
 * Central link store (ADR-004): any entity can relate to any other, across
 * modules that know nothing about each other.
 */
export const links = {
  async create(fromId: string, toId: string, kind: string): Promise<EntityLink> {
    const link: EntityLink = {
      id: newId(),
      fromId,
      toId,
      kind,
      createdAt: new Date().toISOString(),
    }
    await store.put(link)
    events.emit('link.created', { link })
    return link
  },

  async all(): Promise<EntityLink[]> {
    return store.list()
  },

  /** Links where the entity appears on either side. */
  async for(entityId: string): Promise<EntityLink[]> {
    const all = await store.list()
    return all.filter((l) => l.fromId === entityId || l.toId === entityId)
  },

  async between(a: string, b: string): Promise<EntityLink[]> {
    const all = await store.list()
    return all.filter(
      (l) =>
        (l.fromId === a && l.toId === b) || (l.fromId === b && l.toId === a)
    )
  },

  async remove(id: string): Promise<void> {
    await store.remove(id)
    events.emit('link.removed', { linkId: id })
  },

  /** Drop every link touching an entity (used on entity deletion). */
  async removeFor(entityId: string): Promise<void> {
    const affected = await this.for(entityId)
    for (const link of affected) {
      await store.remove(link.id)
    }
    if (affected.length) {
      events.emit('link.removed', { entityId })
    }
  },
}

/**
 * Link integrity (ADR-004): deleting an entity removes its links so the
 * graph never dangles. Started once at kernel boot.
 */
export function startLinkIntegrity(): Unsubscribe {
  return events.on('entity.deleted', ({ entity }) => {
    void links.removeFor(entity.id)
  })
}
