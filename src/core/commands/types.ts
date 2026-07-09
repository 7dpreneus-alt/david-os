import type { LucideIcon } from 'lucide-react'

/** Execution context handed to every command (grows over time). */
export interface CommandContext {
  navigate: (path: string) => void
}

/**
 * One runnable thing (ADR-014). Navigation, module actions, workspace
 * switching, workflow steps, and AI tools all share this shape and live in
 * the single command registry — the palette is its primary UI.
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

/**
 * Query-time command source registered by modules (never by the engine
 * itself — the Command Engine knows no domain). Providers may be
 * synchronous (in-memory stores) or asynchronous (repositories, remote
 * indexes); the engine normalizes both. This is how entity-backed commands
 * ("Complete task: X", "Open client: Y") reach the palette, and the
 * substrate Phase 4 search and future automation build on.
 */
export type CommandProvider = (
  query: string
) => CommandDef[] | Promise<CommandDef[]>
