import type { CommandContext, CommandDef } from './types'

const commands = new Map<string, CommandDef>()

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

/** Test helper. */
export function resetCommandRegistry(): void {
  commands.clear()
}
