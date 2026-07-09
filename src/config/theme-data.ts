import { allThemePresets } from '@/core/theme'
import type { ColorTheme } from '@/types/theme-customizer'

/**
 * Customizer-facing views over the theme preset registry (ADR-010).
 * Preset data lives in the registry; these arrays only adapt it to the
 * shape the theme customizer components consume.
 */

function stripSourcePrefix(id: string): string {
  const separator = id.indexOf(':')
  return separator === -1 ? id : id.slice(separator + 1)
}

export const tweakcnThemes: ColorTheme[] = allThemePresets('tweakcn').map(
  (preset) => ({
    name: preset.label,
    value: stripSourcePrefix(preset.id),
    preset: { label: preset.label, styles: preset.styles },
  })
)

export const colorThemes: ColorTheme[] = [
  ...allThemePresets('davidos'),
  ...allThemePresets('shadcn'),
].map((preset) => ({
  name: preset.label,
  value: stripSourcePrefix(preset.id),
  preset: { label: preset.label, styles: preset.styles },
}))
