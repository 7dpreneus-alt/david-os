import type { LucideIcon } from 'lucide-react'

/** Execution context handed to every command (grows over time). */
export interface CommandContext {
  navigate: (path: string) => void
}

/**
 * One runnable thing (ADR-014). Navigation, module actions, workspace
 * switching, and future workflow steps all share this shape and live in the
 * single command registry — the palette is its primary UI.
 */
export interface CommandDef {
  /** Stable, addressable id, e.g. "nav:/tasks", "tasks.create". */
  id: string
  title: string
  icon?: LucideIcon
  /** Palette section, e.g. "Overview", "Work", "Settings", "Actions". */
  group: string
  keywords?: string[]
  /** Future: registered as a global keyboard shortcut, e.g. "mod+shift+t". */
  shortcut?: string
  /** Availability predicate; unavailable commands are hidden. */
  when?: () => boolean
  run: (ctx: CommandContext) => void | Promise<void>
}
