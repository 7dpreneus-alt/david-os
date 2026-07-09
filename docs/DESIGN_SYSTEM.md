# DavidOS — Design System

## Identity

DavidOS should feel like a **premium operating system**: dark, calm, precise, fast. The reference points are Linear, Raycast, and Vercel's dashboard — not admin templates. Density over decoration; motion only where it communicates state.

## Foundations

### Color

- Tokens are CSS variables in **oklch**, defined in `src/index.css` under Tailwind v4 `@theme`, consumed as semantic utilities (`bg-background`, `text-muted-foreground`, `bg-sidebar`, …).
- **Dark is the default theme.** Light mode is supported and maintained, but design decisions are made dark-first.
- The flagship preset is `davidos-dark`: deep neutral surfaces (near-black with a subtle cool cast), one signature accent used sparingly (primary actions, active nav, focus rings), muted supporting palette, hairline borders (`--border` barely above surface), and restrained shadows/glows for elevation.
- Chart colors come from `--chart-1..5`; status colors (success/warning/destructive) are tokens, never hardcoded Tailwind palette classes.

**Rule: no hardcoded palette colors (`zinc-800`, `#111`, etc.) in feature code.** Everything routes through semantic tokens. (The legacy `command-search.tsx` violates this and is scheduled for rebuild in Phase 4.)

### Typography

- Inter, loaded in `index.html`, exposed as `--font-inter` / `font-sans`.
- Scale: page title `text-2xl font-bold tracking-tight`; section `text-lg font-semibold`; body `text-sm`; metadata `text-xs text-muted-foreground`. Numbers in stat contexts use `tabular-nums`.

### Spacing, radius, elevation

- Tailwind spacing scale; page gutter `px-4 lg:px-6`; vertical rhythm `gap-4 md:gap-6`.
- Radius from `--radius` (0.625rem) via `rounded-sm|md|lg|xl` tokens.
- Elevation: prefer border + subtle background shift over heavy shadows; dialogs/popovers get `shadow-2xl` at most.

## Theme engine (modular)

The template's theming system is preserved and becomes `core/theme`:

- **Preset registry**: themes are data (`ThemePreset { id, name, cssVars: { light, dark } }`) registered at boot. Existing tweakcn/shadcn presets remain available; `davidos-dark` is registered as default.
- **Contributions**: modules may register presets; users can import/create presets (existing customizer import flow).
- **Appearance settings** (Settings → Appearance) is the user-facing surface; the theme customizer panel is its implementation.
- Mode (dark/light/system) via the `ThemeProvider` class strategy, persisted under `davidos-ui-theme`.

## Components

- **Primitives**: `src/components/ui/*` — stock shadcn/ui v3. Do not fork primitives; extend by composition in `components/shared`.
- **Shell**: sidebar (16rem expanded / 3rem icon rail), header (sidebar trigger, ⌘K search, mode toggle), footer. Sidebar identity block shows DavidOS logo + name.
- **Shared kit** (grows in Phase 2–3): data-table kit (TanStack wrappers from Tasks), stat card, empty state, page header, entity chip (icon + title for any entity type, used by links/search).

### Patterns

- **Empty states**: every list view ships one — icon, one-line explanation, primary action. Never a blank table.
- **Feedback**: mutations get a `sonner` toast; destructive actions confirm via dialog.
- **Loading**: route-level `Suspense` spinner; content-level skeletons matching final layout.
- **Forms**: react-hook-form + Zod resolvers; inline validation messages via `ui/form.tsx`.

## Interaction

- **Keyboard-first**: ⌘K opens the palette from anywhere; Esc closes overlays; palette actions cover all primary creation flows.
- **Motion**: 100–200ms ease-out transitions on hover/selection; no entrance animations on data content; theme switch may use the existing circular transition.

## Accessibility

- Radix primitives keep focus management and ARIA correct — don't bypass them.
- Maintain WCAG AA contrast in both modes (validate presets on registration).
- Visible focus rings via `--ring`; never remove outlines without replacement.
