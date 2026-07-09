import type { BaseEntity } from '@/core/entities'

/**
 * Workspace Engine types (ADR-013). The engine (switching, persistence,
 * built-in templates: Home, CEO, Operations, Fitness, Finance, Development,
 * Personal) lands in Phase 3; types exist now so module manifests can ship
 * workspace templates from day one.
 */
export interface Workspace extends BaseEntity {
  type: 'workspace'
  icon?: string
  isDefault?: boolean
  preferences?: {
    themePresetId?: string
  }
}

export interface WorkspaceTemplate {
  id: string
  name: string
  icon?: string
  /** Widget layout the template seeds, in display order. */
  widgets: Array<{
    widgetId: string
    pinned?: boolean
    config?: Record<string, unknown>
  }>
}
