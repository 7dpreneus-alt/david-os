/** CSS variable map for one mode (variable name without `--` → value). */
export type ThemeStyles = Record<string, string>

export type ThemePresetSource = 'davidos' | 'shadcn' | 'tweakcn' | 'user'

/**
 * A theme preset is data (ADR-010): registered at boot, selectable in
 * Settings → Appearance, applicable per workspace later.
 */
export interface ThemePresetDef {
  id: string
  label: string
  source: ThemePresetSource
  styles: {
    light: ThemeStyles
    dark: ThemeStyles
  }
  /** Exactly one registered preset should be the default. */
  isDefault?: boolean
}
