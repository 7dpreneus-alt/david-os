# DavidOS — Roadmap (Migration Plan)

Migration from the ShadcnStore dashboard template to DavidOS, revised for the modular-OS architecture **including the engine layer** (Widget, Workspace, Command, Notification, Activity, Context, Workflow — see ARCHITECTURE.md). Each phase ends with a green build (`tsc`, ESLint, `vite build`) and its own commit(s) on the working branch.

## Phase 0 — De-template & restructure ✅

- Vite version promoted to repo root; `nextjs-version/` and template docs deleted.
- Demo surface, template branding, and analytics removed; DavidOS rebrand; dark default.
- Kept: dashboard placeholder, tasks, calendar, settings, 404, shadcn/ui library, theme customizer, layouts.
- Product docs written (VISION, PRD, ARCHITECTURE, ROADMAP, DESIGN_SYSTEM, DECISIONS).

## Phase 1 — Kernel foundations ✅

Primitives:
- `core/events`: typed event bus.
- `core/entities`: `BaseEntity`, `EntityLink`, entity-type registry, link store.
- `core/storage`: `StorageAdapter` interface, `LocalStorageAdapter`, typed repositories (Zod-validated, versioned, migration hooks) that emit `entity.*` events, export/import snapshot API.
- `core/modules`: `ModuleManifest` (incl. `commands`, `widgets`, `workspaceTemplates` fields) + module registry; shell (routes, sidebar nav, palette sources) reads from the registry; existing pages (mission-control placeholder, tasks, calendar, settings) registered as thin modules.
- `core/theme`: preset registry wrapping existing presets; `davidos-dark` flagship preset registered as default; customizer reads from the registry.

Engine skeletons (registries + types now; full UIs in later phases):
- `core/commands`: Command Engine registry; navigation commands auto-generated from module manifests; palette consumes the registry for its nav section.
- `core/activity`: recorder subscribed to `entity.*` writing activity entities (self-excluding), `activity.for(entityId)` query.
- `core/workflows`: types/spec only — **no implementation** (per ADR-017).

**Exit criteria:** adding a stub module (manifest + one route + one command) requires zero core edits; all persistence flows through the adapter; every repository mutation produces an activity record.

## Phase 2 — Core domain modules 🔄 (Tasks ✅ Projects ✅ Goals ✅)

Order: **Tasks ✅ → Projects ✅ → Goals ✅ → Notes → Documents.**

A UX interlude between Projects and Goals delivered Mission Control v0
(live widget host, template dashboard deleted), the registry-driven
entity picker (`shared/entity-picker.tsx`), and the identity pass (new
mark, favicon, branded loading/404). Every milestone now ends with a
user-experience checkpoint before further engineering.

Projects are orchestration entities: children (tasks, goals, notes,
documents, future-module entities) are discovered via projectId
back-references, the central link store, and linkedIds; progress and
health (on-track / at-risk / blocked / completed, with human-readable
reasons) are derived from duck-typed completion signals — never stored.

Kernel extensions landed with Tasks (domain-agnostic, for every future
module): async-capable **command providers** (dynamic entity-backed palette
commands) and the **widget definition registry** (metadata + renderer
reference only; instances stay workspace-owned per ADR-012).

For each: manifest, Zod schema + entity-type registration, repository-backed Zustand store, CRUD UI, links via the entity graph, domain events, search extractor, palette commands ("new task…"), and widget definitions (consumed in Phase 3).

**Exit criteria:** all five modules persist locally, survive reload, are linkable, emit activities, and export/import round-trips cleanly.

## Phase 3 — Widget Engine, Workspace Engine, Mission Control

- `core/widgets`: widget definition registry + `widget-instance` entities; dashboard becomes the widget host with move/pin/hide/configure (resizing reserved).
- `core/workspaces`: workspace entities + built-in templates (**Home, CEO, Operations, Fitness, Finance, Development, Personal**); workspace switcher (sidebar + palette); active workspace persistence; per-workspace preferences.
- Mission Control rebuilt as the widget host over live module data; v1 widgets from Phase 2 modules plus quick capture.
- `core/notifications`: Notification Engine — `publish()` API (toast + durable history), notification entities, notification center surface + widget, per-module preferences in Settings.

## Phase 4 — Command Engine as the primary interface

- `core/search`: inverted index over repositories, incremental updates from events; activities/notifications/memories included.
- Palette rebuilt on `ui/command.tsx` with theme tokens, fully driven by the Command Engine: navigation + registered actions + workspace switching + entity search results (adapted to commands) with deep links.
- Keyboard shortcuts registered from command definitions; quick capture executable from the palette.
- Global Activity Timeline view + per-entity history panels (searchable via the index).

## Phase 5 — AI Kernel, Context Engine, Memory Engine, Workforce

- `core/ai`: Anthropic provider (BYO key via Settings → AI), model router, tool registry (module tools + Command Engine bridge), agent orchestrator with persisted runs.
- `core/memory`: memory entities, event-driven observers, `retrieve()` API.
- `core/context`: Context Engine — `assemble()` over entity graph, memory, activity, workspace state, conversation; per-agent `ContextPolicy` editable in Workforce settings. **AI Kernel never builds prompts itself.**
- **Workforce module**: agent registry UI (agents as entities), chat-style run view, run history; agent runs notify and appear on the timeline.

## Phase 6 — Polish & hardening

- Empty states, skeletons, error boundaries per module; responsive pass.
- Data-safety pass: hydrate-failure fallbacks, storage quota handling, export reminder.
- README/docs refresh; final lint/typecheck/build; light-mode QA (dark stays default).

## Later (post-v1)

- **Workflow Engine implementation** (manual + event triggers first, schedules later) on the Command Engine substrate.
- Widget resizing; workspace sharing/templates export.
- SQLite adapter (Tauri/WASM) and Supabase adapter with sync.
- Embedding-based memory retrieval.
- New life-domain modules: Fitness, Finance, Operations, CRM — each a manifest drop-in with its own workspace template.
- Server-side agent execution / key proxy.
