import type { LucideIcon } from 'lucide-react'

import type { CommandDef } from '@/core/commands'
import type { EntityTypeDef } from '@/core/entities'
import type { EventHandler } from '@/core/events'
import type { WidgetDef } from '@/core/widgets/types'
import type { WorkspaceTemplate } from '@/core/workspaces/types'

export interface ModuleRoute {
  path: string
  element: React.ReactNode
}

export interface NavItem {
  title: string
  url: string
  icon?: LucideIcon
  items?: NavItem[]
}

export interface EventSubscription {
  event: string
  handler: EventHandler
}

export interface SettingsPanelDef {
  id: string
  title: string
  route: string
}

/**
 * The contract every DavidOS capability ships (ADR-003). The shell —
 * routes, sidebar, command palette — is generated from registered
 * manifests; adding a module requires zero core edits.
 */
export interface ModuleManifest {
  /** Stable id, e.g. "tasks", "fitness". */
  id: string
  name: string
  icon: LucideIcon
  /** Sidebar group label, e.g. "Overview", "Work", "System". */
  navGroup: string
  /** Sort order within the sidebar (lower first). */
  order?: number
  routes: ModuleRoute[]
  /** Sidebar entries. Navigation commands are generated from these. */
  navItems: NavItem[]
  commands?: CommandDef[]
  entityTypes?: EntityTypeDef[]
  widgets?: WidgetDef[]
  workspaceTemplates?: WorkspaceTemplate[]
  events?: EventSubscription[]
  settingsPanels?: SettingsPanelDef[]
}
