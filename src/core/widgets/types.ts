import type { LucideIcon } from 'lucide-react'
import type { z } from 'zod'

/** Grid units. */
export interface WidgetSize {
  w: number
  h: number
}

export interface WidgetComponentProps {
  /** Per-instance configuration, validated against `configSchema`. */
  config?: Record<string, unknown>
}

/**
 * Widget definition (ADR-012) — pure metadata plus a renderer reference,
 * registered from module manifests. The registry owns definitions only;
 * widget *instances* (position, pinned, hidden, size, config) are entities
 * owned by a workspace, managed by the Phase 3 Widget Engine. Nothing here
 * may depend on any particular dashboard implementation.
 */
export interface WidgetDef {
  /** Stable id, e.g. "tasks.today", "finance.cashflow". */
  id: string
  title: string
  /** Owning module id. */
  module: string
  description?: string
  icon?: LucideIcon
  /** Renderer reference. Hosts decide where and how to mount it. */
  component?: React.ComponentType<WidgetComponentProps>
  defaultSize?: WidgetSize
  /** Reserved for future resizing (ADR-012). */
  minSize?: WidgetSize
  maxSize?: WidgetSize
  /** Validates per-instance configuration. */
  configSchema?: z.ZodType<Record<string, unknown>>
  /**
   * Workspace template ids the widget suggests itself for (e.g. ["fitness",
   * "home"]). Undefined = available to every workspace.
   */
  supportedWorkspaces?: string[]
  /**
   * Declared capabilities for future permission policy, e.g.
   * "entities:read:task", "network:fetch". Advisory until enforcement lands.
   */
  capabilities?: string[]
}
