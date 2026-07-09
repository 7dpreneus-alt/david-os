import type { WidgetDef } from './types'

/**
 * Widget definition registry (ADR-012). Definitions register at boot from
 * module manifests; the Phase 3 Widget Engine adds instance management and
 * the dashboard host on top of this.
 */
const widgets = new Map<string, WidgetDef>()

export function registerWidget(def: WidgetDef): void {
  if (widgets.has(def.id)) {
    console.warn(`[widgets] "${def.id}" registered twice; replacing`)
  }
  widgets.set(def.id, def)
}

export function registerWidgets(defs: WidgetDef[]): void {
  for (const def of defs) registerWidget(def)
}

export function getWidget(id: string): WidgetDef | undefined {
  return widgets.get(id)
}

export function allWidgets(): WidgetDef[] {
  return [...widgets.values()]
}

/** Test helper. */
export function resetWidgetRegistry(): void {
  widgets.clear()
}
