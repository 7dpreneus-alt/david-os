import type {
  CoreEventMap,
  CoreEventName,
  EventHandler,
  Unsubscribe,
} from './types'

/**
 * Global in-process event bus (ADR-008). Synchronous and ordered; handler
 * errors are caught and logged so one bad subscriber cannot break emitters.
 */
class EventBus {
  private handlers = new Map<string, Set<EventHandler>>()

  on<K extends CoreEventName>(
    event: K,
    handler: EventHandler<CoreEventMap[K]>
  ): Unsubscribe
  on(event: string, handler: EventHandler): Unsubscribe
  on(event: string, handler: EventHandler): Unsubscribe {
    let set = this.handlers.get(event)
    if (!set) {
      set = new Set()
      this.handlers.set(event, set)
    }
    set.add(handler)
    return () => this.off(event, handler)
  }

  off(event: string, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler)
  }

  emit<K extends CoreEventName>(event: K, payload: CoreEventMap[K]): void
  emit(event: string, payload?: unknown): void
  emit(event: string, payload?: unknown): void {
    const set = this.handlers.get(event)
    if (!set) return
    for (const handler of [...set]) {
      try {
        handler(payload)
      } catch (error) {
        console.error(`[events] handler for "${event}" threw`, error)
      }
    }
  }

  /** Test helper — drops every subscription. */
  clear(): void {
    this.handlers.clear()
  }
}

export const events = new EventBus()
