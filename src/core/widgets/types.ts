import type { z } from 'zod'

/**
 * Widget Engine types (ADR-012). The engine itself (instance management,
 * dashboard host) lands in Phase 3; the definition type exists now so module
 * manifests can declare widgets from day one.
 */
export interface WidgetDef {
  /** Stable id, e.g. "tasks.today". */
  id: string
  title: string
  /** Owning module id. */
  module: string
  description?: string
  component?: React.ComponentType<{ config?: Record<string, unknown> }>
  /** Grid units. Resizing is future; the field is reserved (ADR-012). */
  defaultSize?: { w: number; h: number }
  /** Validates per-instance config. */
  configSchema?: z.ZodType<Record<string, unknown>>
}
