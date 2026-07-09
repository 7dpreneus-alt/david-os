# DavidOS — Product Requirements

## 1. Overview

| | |
|---|---|
| Product | DavidOS — personal AI operating system |
| User | Single user ("David"). No multi-tenancy, no auth in v1. |
| Platform | Web SPA (React + Vite), installable/deployable as static files |
| Persistence | Local-first (LocalStorage adapter in v1), export/import as JSON |
| Theme | Premium dark UI by default; light mode supported; modular theme engine |

## 2. Product surface (v1 modules)

### 2.1 Mission Control (home)
The OS desktop. Computed live from real module data — never demo data.
- Today's tasks (due/overdue/scheduled) with inline complete.
- Active projects with progress.
- Goal progress summaries.
- Recent notes and documents.
- Workforce status (agents defined, last runs).
- Quick capture: one input that creates a task/note from anywhere.

### 2.2 Projects
- CRUD projects with status (`idea | active | paused | done | archived`), color/icon, description, target date.
- Project detail view: linked tasks, notes, goals, documents, agent activity.
- Progress derived from linked tasks.

### 2.3 Tasks
- CRUD tasks: title, status (`todo | in-progress | blocked | done`), priority, due date, tags, project link.
- Table view with sorting/filtering/faceted filters (reuse the TanStack table kit).
- Quick-add modal and quick capture from Mission Control / command palette.
- Completing a task emits `task.completed` on the event bus (feeds Mission Control, Goals, Memory).

### 2.4 Notes
- CRUD notes with markdown-friendly editor, tags, pinning.
- Linkable to projects, goals, tasks.
- Full-text searchable from the command palette.

### 2.5 Goals
- CRUD goals: metric-based (target/current) or milestone-based, with timeframes.
- Linked to projects/tasks; progress can be derived from linked entity completion.

### 2.6 Documents
- Lightweight document store (longer-form than notes): title, rich body, tags, links.
- Future: file attachments once a storage adapter supports blobs.

### 2.7 Workforce (AI agents)
User-facing name: **Workforce**. Architecture remains agent-based.
- Registry of agents: name, role, avatar/color, model, system prompt, allowed tools, status.
- Agent detail: chat-style run view, run history.
- Agents execute through the AI Kernel (provider keys, routing, memory, tools) — never call providers directly.
- v1 ships with BYO API key (stored locally); a server-side proxy is a later adapter.

### 2.8 Settings
- Profile (name, avatar).
- Appearance (theme presets via the modular theme engine, dark/light, layout options).
- AI (providers, API keys, default models, memory controls).
- Data (export all, import, reset; storage adapter status).
- Notifications (in-app preferences).

## 3. System-level requirements (the OS layer)

### 3.1 Module system
- Every capability above is a module with a **manifest**: id, name, icon, routes, nav items, command-palette commands, entity types, search providers, event subscriptions, settings panels, agent tools.
- Core shell (sidebar, command palette, router, search, Mission Control widgets) is **generated from the module registry** — adding a Fitness or Finance module must require zero changes to core files.

### 3.2 Universal entity model
- All domain objects extend `BaseEntity`: `id`, `type`, `title`, `createdAt`, `updatedAt`, `tags[]`, `archived`, module-owned payload.
- First-class `EntityLink { fromId, toId, kind }` graph shared across all modules.
- Entity type registry maps `type → schema (Zod), module, icon, renderer, search extractor`.

### 3.3 Storage abstraction
- `StorageAdapter` interface (collections: get/list/put/delete/query, bulk export/import, schema version + migrations).
- v1 adapter: LocalStorage. Planned: SQLite (via WASM/Tauri), Supabase, Postgres.
- Feature code talks to typed repositories only; no `localStorage` calls outside the adapter.

### 3.4 AI Kernel
Single subsystem responsible for: provider registry (Anthropic first), model routing, context assembly (entity graph + Memory Engine + conversation), tool registry (contributed by modules), agent orchestration (runs, steps, tool calls), and usage/limits.

### 3.5 Event bus
- Typed global pub/sub (`entity.created|updated|deleted`, `task.completed`, `agent.run.finished`, …).
- Search index, Memory Engine, and Mission Control are event subscribers.

### 3.6 Universal search
- Every entity indexed (title, body text, tags) via module-registered extractors.
- Surfaced in the command palette: navigation + actions + entity results with deep links.

### 3.7 Memory Engine
- Long-term memory store (observations, facts, summaries) written by the AI Kernel and by explicit user action.
- Retrieval API used during context assembly. v1: keyword/recency scoring; embeddings later without API change.

## 4. Non-functional requirements
- **Quality bar**: builds clean (`tsc` + ESLint), no dead template code, no demo data in shipped views.
- **Performance**: route-level code splitting; command palette opens <100ms; search over thousands of entities stays instant (in-memory index).
- **Resilience**: corrupt/missing stored data never crashes the app — schemas validate on hydrate and fall back to empty state; export/import guards against data loss.
- **Keyboard-first**: ⌘K everywhere; core actions reachable without the mouse.

## 5. Out of scope (v1)
Multi-user/auth, real-time sync, mobile apps, server-side agent execution, file/blob storage, third-party module marketplace.
