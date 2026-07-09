import type { CommandContext, CommandDef, CommandProvider } from './types'

const commands = new Map<string, CommandDef>()
const providers = new Set<CommandProvider>()

export function registerCommand(def: CommandDef): void {
  if (commands.has(def.id)) {
    console.warn(`[commands] "${def.id}" registered twice; replacing`)
  }
  commands.set(def.id, def)
}

export function registerCommands(defs: CommandDef[]): void {
  for (const def of defs) registerCommand(def)
}

export function getCommand(id: string): CommandDef | undefined {
  return commands.get(id)
}

/** All currently available commands (respects `when` predicates). */
export function allCommands(): CommandDef[] {
  return [...commands.values()].filter((c) => (c.when ? c.when() : true))
}

export async function executeCommand(
  id: string,
  ctx: CommandContext
): Promise<void> {
  const command = commands.get(id)
  if (!command) {
    console.warn(`[commands] unknown command "${id}"`)
    return
  }
  if (command.when && !command.when()) return
  await command.run(ctx)
}

export function registerCommandProvider(provider: CommandProvider): void {
  providers.add(provider)
}

/**
 * Dynamic commands matching a palette query, gathered from every registered
 * provider. Sync and async providers are normalized; a failing provider is
 * isolated and never breaks the others.
 */
export async function queryCommands(query: string): Promise<CommandDef[]> {
  const settled = await Promise.all(
    [...providers].map(async (provider) => {
      try {
        return await provider(query)
      } catch (error) {
        console.error('[commands] provider threw', error)
        return []
      }
    })
  )
  return settled.flat()
}

/** Test helper. */
export function resetCommandRegistry(): void {
  commands.clear()
  providers.clear()
}
