# DavidOS — Roadmap (Migration Plan)

Migration from the ShadcnStore dashboard template to DavidOS, revised for the modular-OS architecture (see ARCHITECTURE.md). Each phase ends with a green build (`tsc`, ESLint, `vite build`) and its own commit(s) on the working branch.

## Phase 0 — De-template & restructure ✅ (this phase)

- Keep the Vite version; delete `nextjs-version/` and the template's VitePress `docs/`.
- Promote `vite-version/` to the repository root.
- Delete demo surface: landing, mail, chat, users, FAQs, pricing, all auth variants, dashboard-2, extra error pages, billing/connections settings, GTM analytics, "Upgrade to Pro"/ShadcnStore branding, template screenshots.
- Keep: dashboard (placeholder for Mission Control), tasks, calendar, settings (profile/account/appearance/notifications), 404, the full shadcn/ui library, theme customizer, layouts.
- Rebrand: DavidOS metadata, sidebar identity, dark theme as default.
- Write product docs: VISION, PRD, ARCHITECTURE, ROADMAP, DESIGN_SYSTEM, DECISIONS.

## Phase 1 — Kernel foundations

- `core/entities`: `BaseEntity`, `EntityLink`, entity-type registry.
- `core/storage`: `StorageAdapter` interface, `LocalStorageAdapter`, typed repositories (Zod-validated, versioned, migration hooks), export/import snapshot.
- `core/events`: typed event bus; repositories emit `entity.*` events.
- `core/modules`: `ModuleManifest` type + registry; shell (sidebar, routes, command palette sources) reads from the registry.
- `core/theme`: move theme presets into a preset registry; register `davidos-dark` flagship preset; theme customizer reads from the registry.
- Convert Settings into the first manifest-driven module (its panels become registry contributions).

**Exit criteria:** adding a stub module (manifest + one route) requires zero core edits; all persistence flows through the adapter.

## Phase 2 — Core domain modules

Order: **Tasks → Projects → Notes → Goals → Documents.**

For each: manifest, Zod schema + entity-type registration, repository-backed Zustand store, CRUD UI, links via the entity graph, `entity.*`/domain events, search extractor.

- Tasks: adapt existing TanStack table + add-task modal from demo JSON to the persisted store; task↔project links.
- Projects: list + detail (linked tasks/notes/goals), derived progress.
- Notes: markdown-friendly editor, tags, pinning.
- Goals: metric/milestone progress, links, derived progress from linked tasks.
- Documents: minimal long-form store.

**Exit criteria:** all five modules persist locally, survive reload, are linkable to each other, and export/import round-trips cleanly.

## Phase 3 — Mission Control

- Replace the template dashboard with a **widget host**: modules contribute widgets via their manifests.
- v1 widgets: Today's tasks, Active projects, Goal progress, Recent notes/documents, Quick capture, Workforce status (stub until Phase 5).
- Live data only; reacts to event-bus updates.

## Phase 4 — Command palette & universal search

- `core/search`: inverted index over repositories, incremental updates from events.
- Rebuild the ⌘K palette on `ui/command.tsx` with theme tokens; three sections: navigation (module registry), commands (module manifests), entity results (search index) with deep links.
- Quick-capture actions ("new task…", "new note…") executable from the palette.

## Phase 5 — AI Kernel, Memory Engine, Workforce

- `core/ai`: Anthropic provider (BYO key via Settings → AI), model router, context assembler, tool registry (modules contribute `tasks.create`, `notes.search`, etc.), agent orchestrator with persisted runs.
- `core/memory`: memory entities, event-driven observers, `retrieve()` for context assembly.
- **Workforce module**: agent registry UI (agents as entities), chat-style run view, run history, agent settings. Named "Workforce" in all UI; agent-based underneath.

## Phase 6 — Polish & hardening

- Empty states, skeletons, toasts on mutations, error boundaries per module.
- Keyboard shortcuts beyond ⌘K; responsive pass.
- Data-safety pass: hydrate-failure fallbacks, storage quota handling, export reminder.
- README/docs refresh; final lint/typecheck/build; light-mode QA (dark stays default).

## Later (post-v1)

- SQLite adapter (Tauri/WASM) and Supabase adapter with sync.
- Embedding-based memory retrieval.
- New life-domain modules: Fitness, Finance, Operations, CRM — each a manifest drop-in.
- Server-side agent execution / key proxy.
