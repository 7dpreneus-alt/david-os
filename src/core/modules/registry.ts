import { registerCommands, type CommandDef } from '@/core/commands'
import { registerEntityTypes } from '@/core/entities'
import { events } from '@/core/events'
import type { ModuleManifest, ModuleRoute, NavItem } from './types'

const modules = new Map<string, ModuleManifest>()

/**
 * Register module manifests and fan their contributions out to the kernel
 * registries. Idempotent per module id (re-registration replaces).
 */
export function registerModules(manifests: ModuleManifest[]): void {
  for (const manifest of manifests) {
    if (modules.has(manifest.id)) continue
    modules.set(manifest.id, manifest)

    if (manifest.entityTypes?.length) {
      registerEntityTypes(manifest.entityTypes)
    }
    if (manifest.commands?.length) {
      registerCommands(manifest.commands)
    }
    registerCommands(navigationCommandsFor(manifest))
    for (const subscription of manifest.events ?? []) {
      events.on(subscription.event, subscription.handler)
    }
  }
}

export function getModule(id: string): ModuleManifest | undefined {
  return modules.get(id)
}

export function allModules(): ModuleManifest[] {
  return [...modules.values()].sort(
    (a, b) => (a.order ?? 100) - (b.order ?? 100)
  )
}

/** Flat route table for the router, in module order. */
export function moduleRoutes(): ModuleRoute[] {
  return allModules().flatMap((m) => m.routes)
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/** Sidebar structure: modules grouped by navGroup, in module order. */
export function navGroups(): NavGroup[] {
  const groups: NavGroup[] = []
  for (const manifest of allModules()) {
    let group = groups.find((g) => g.label === manifest.navGroup)
    if (!group) {
      group = { label: manifest.navGroup, items: [] }
      groups.push(group)
    }
    group.items.push(...manifest.navItems)
  }
  return groups
}

/**
 * Navigation commands generated from a module's nav items (ADR-014): the
 * palette's navigation section and the sidebar share one source of truth.
 */
function navigationCommandsFor(manifest: ModuleManifest): CommandDef[] {
  const commands: CommandDef[] = []
  for (const item of manifest.navItems) {
    if (item.items?.length) {
      for (const child of item.items) {
        if (child.url === '#') continue
        commands.push({
          id: `nav:${child.url}`,
          title: child.title,
          icon: child.icon ?? item.icon,
          group: item.title,
          run: ({ navigate }) => navigate(child.url),
        })
      }
    } else if (item.url !== '#') {
      commands.push({
        id: `nav:${item.url}`,
        title: item.title,
        icon: item.icon ?? manifest.icon,
        group: manifest.navGroup,
        run: ({ navigate }) => navigate(item.url),
      })
    }
  }
  return commands
}

/** Test helper. */
export function resetModuleRegistry(): void {
  modules.clear()
}
