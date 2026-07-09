import { shadcnThemePresets } from '@/utils/shadcn-ui-theme-presets'
import { tweakcnPresets } from '@/utils/tweakcn-theme-presets'
import { davidosDark } from './presets/davidos-dark'
import type { ThemePresetDef, ThemePresetSource } from './types'

/**
 * Theme preset registry (ADR-010). Presets are data; the customizer and
 * Settings → Appearance read from here instead of hardcoded preset files.
 * Modules and users can register additional presets.
 */
const presets = new Map<string, ThemePresetDef>()
let seeded = false

function seed(): void {
  if (seeded) return
  seeded = true

  registerThemePreset(davidosDark)
  for (const [id, preset] of Object.entries(shadcnThemePresets)) {
    registerThemePreset({
      id: `shadcn:${id}`,
      label: preset.label ?? id,
      source: 'shadcn',
      styles: preset.styles,
    })
  }
  for (const [id, preset] of Object.entries(tweakcnPresets)) {
    registerThemePreset({
      id: `tweakcn:${id}`,
      label: preset.label ?? id,
      source: 'tweakcn',
      styles: preset.styles,
    })
  }
}

export function registerThemePreset(preset: ThemePresetDef): void {
  presets.set(preset.id, preset)
}

export function allThemePresets(source?: ThemePresetSource): ThemePresetDef[] {
  seed()
  const list = [...presets.values()]
  return source ? list.filter((p) => p.source === source) : list
}

export function getThemePreset(id: string): ThemePresetDef | undefined {
  seed()
  return presets.get(id)
}

export function defaultThemePreset(): ThemePresetDef {
  seed()
  return [...presets.values()].find((p) => p.isDefault) ?? davidosDark
}
