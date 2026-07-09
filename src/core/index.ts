import { startActivityRecorder } from './activity'
import { startLinkIntegrity } from './entities'

let booted = false

/**
 * Kernel boot (ARCHITECTURE.md § Boot sequence). Module registration happens
 * on import of `@/config/modules`; this wires the always-on observers.
 * Idempotent — safe under React StrictMode double-invocation.
 */
export function bootKernel(): void {
  if (booted) return
  booted = true
  startActivityRecorder()
  startLinkIntegrity()
}
