# DavidOS — Architecture

DavidOS is structured as a small **kernel** (`src/core`) plus **modules** (`src/modules`). The kernel owns primitives; modules own domains. Nothing in `core` imports from `modules`; modules never import each other's internals — they interact through the kernel (entities, events, search, AI).

```
┌──────────────────────────────────────────────────────────────┐
│  Shell (app chrome: sidebar, header, command palette, router)│
│  — generated from the Module Registry                        │
├──────────────────────────────────────────────────────────────┤
│  Modules: mission-control · projects · tasks · notes · goals │
│           documents · workforce · settings · (fitness, …)    │
├──────────────────────────────────────────────────────────────┤
│  Kernel (src/core)                                           │
│  ┌──────────┐ ┌─────────┐ ┌────────┐ ┌────────┐ ┌─────────┐  │
│  │ Entities │ │ Storage │ │ Events │ │ Search │ │  Theme  │  │
│  └──────────┘ └─────────┘ └────────┘ └────────┘ └─────────┘  │
│  ┌──────────────────────────────┐ ┌───────────────────────┐  │
│  │           AI Kernel          │ │     Memory Engine     │  │
│  └──────────────────────────────┘ └───────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│  Storage adapters: LocalStorage → SQLite / Supabase / Postgres│
└──────────────────────────────────────────────────────────────┘
```

## Folder structure (target)

```
src/
├── core/
│   ├── modules/        # ModuleManifest type, module registry, lifecycle
│   ├── entities/       # BaseEntity, EntityLink graph, entity-type registry
│   ├── storage/        # StorageAdapter interface, adapters/, repositories
│   ├── events/         # typed event bus
│   ├── search/         # index, extractor registry, query API
│   ├── ai/             # AI Kernel: providers/, router, context, tools, orchestrator
│   ├── memory/         # Memory Engine: store, retrieval, policies
│   └── theme/          # theme engine: tokens, preset registry, appearance API
├── modules/
│   ├── mission-control/
│   ├── projects/       # each: manifest.ts, components/, store.ts, types.ts, schemas.ts
│   ├── tasks/
│   ├── notes/
│   ├── goals/
│   ├── documents/
│   ├── workforce/
│   └── settings/
├── components/
│   ├── ui/             # shadcn/ui primitives (unmodified)
│   ├── layout/         # shell: sidebar, header, base layout
│   └── shared/         # data-table kit, empty states, stat cards
├── app/                # thin route shells only (until fully registry-driven)
├── config/             # app config; navigation derives from module registry
├── lib/                # utils, id/date helpers
└── types/              # cross-cutting shared types
```

## 1. Module system

A module is a folder exporting a **manifest**:

```ts
interface ModuleManifest {
  id: string                        // "tasks", "fitness"
  name: string                      // "Tasks"
  icon: LucideIcon
  navGroup: string                  // where it appears in the sidebar
  routes: RouteConfig[]             // lazy route elements
  entityTypes?: EntityTypeDef[]     // registered into the entity registry
  commands?: CommandDef[]           // command-palette actions
  searchProviders?: SearchExtractor[]
  events?: EventSubscription[]      // handlers wired at boot
  settingsPanels?: SettingsPanelDef[]
  agentTools?: AgentToolDef[]       // tools exposed to the AI Kernel
  widgets?: WidgetDef[]             // Mission Control dashboard widgets
}
```

At boot, `core/modules/registry.ts` collects manifests, registers entity types, search extractors, event handlers, tools, and theme contributions, and hands routes/nav/commands to the shell. **Adding Fitness/Finance/CRM = adding one folder + one manifest entry.**

## 2. Universal entity model

```ts
interface BaseEntity {
  id: string            // nanoid
  type: string          // "task" | "note" | "goal" | ... (registry key)
  title: string
  createdAt: string     // ISO
  updatedAt: string
  tags: string[]
  archived?: boolean
}

interface EntityLink {
  id: string
  fromId: string
  toId: string
  kind: string          // "belongs-to" | "references" | "blocks" | ...
  createdAt: string
}
```

Each module extends `BaseEntity` with its payload (`Task extends BaseEntity { status, priority, dueDate, ... }`) and registers a Zod schema. Links live in a **central link store** so relationships work across modules that know nothing about each other (a Fitness workout can link to a Goal). The entity registry provides per-type icon, renderer, and search extractor so generic UI (search results, link pickers, Mission Control) can render anything.

## 3. Storage abstraction

```ts
interface StorageAdapter {
  get<T>(collection: string, id: string): Promise<T | undefined>
  list<T>(collection: string): Promise<T[]>
  put<T>(collection: string, value: T & { id: string }): Promise<void>
  delete(collection: string, id: string): Promise<void>
  exportAll(): Promise<Snapshot>
  importAll(snapshot: Snapshot): Promise<void>
}
```

- Modules use **typed repositories** (`createRepository<Task>("tasks", taskSchema)`) that validate on read/write and stamp `updatedAt`.
- Zustand stores hydrate from repositories and persist through them — the adapter is injected once in core config.
- v1 ships `LocalStorageAdapter` (namespaced keys, schema `version`, migration hooks). SQLite/Supabase/Postgres adapters implement the same interface; feature code does not change.

## 4. AI Kernel (`core/ai`)

One subsystem, five responsibilities:

1. **Providers** — registry of LLM providers (Anthropic first; BYO key stored via the storage layer). Uniform `complete()/stream()` interface.
2. **Model routing** — maps a request class (fast/cheap vs deep reasoning, per-agent override) to a provider+model.
3. **Context assembly** — builds prompts from: the requesting agent's definition, relevant entities (via the link graph), Memory Engine retrievals, and conversation history. Token-budget aware.
4. **Tool execution** — tool registry populated by module manifests (`tasks.create`, `notes.search`, …); the kernel validates arguments (Zod), executes against repositories, and emits events.
5. **Agent orchestration** — agents are *data* (entities of type `agent`); the orchestrator runs the loop (LLM ↔ tools), persists runs/steps as entities, and emits `agent.run.*` events.

The Workforce module is a UI over this kernel; it contains no provider logic.

## 5. Event bus (`core/events`)

Typed pub/sub with a discriminated-union event map:

```ts
events.emit("task.completed", { taskId })
events.on("entity.created", handler)     // wildcard entity events emitted by repositories
```

Repositories emit `entity.*` events automatically, so the search index and Memory Engine stay current without module cooperation. Synchronous, in-process, ordered; handlers must not throw (errors are caught and logged).

## 6. Universal search (`core/search`)

- In-memory inverted index built at boot from repositories, updated incrementally from `entity.*` events.
- Modules register extractors: `(entity) => ({ text, boostFields })`.
- Query API returns ranked entities with type metadata for rendering; the command palette consumes it alongside nav items and registered commands.

## 7. Memory Engine (`core/memory`)

- Memories are entities (`type: "memory"`): `{ kind: "fact" | "observation" | "summary", content, sourceIds, importance, lastAccessed }`.
- Written by: agent runs (kernel-side extraction), event-driven observers (e.g., summarize on `project.completed`), and explicit "remember this" user actions.
- `retrieve(query, budget)` scores by keyword match × importance × recency; consumed by AI Kernel context assembly. Embedding-based retrieval is a drop-in upgrade behind the same API.

## 8. Theme engine (`core/theme`)

The template's theme system is **kept and modularized**, not removed:

- Design tokens remain CSS variables (Tailwind v4 `@theme`, oklch).
- Presets (current tweakcn/shadcn presets, plus DavidOS's own premium-dark default) move into a **preset registry**; modules and users can register presets.
- The theme customizer becomes the implementation behind Settings → Appearance (and stays available as a panel), driven by the registry instead of hardcoded preset files.
- Dark is the default; `davidos-dark` is the flagship preset.

## Boot sequence

1. Core config selects storage adapter → repositories created.
2. Module registry loads manifests → entity types, tools, extractors, event handlers, theme presets registered.
3. Stores hydrate (validated), search index builds, Memory Engine attaches to the bus.
4. Shell renders routes/nav/commands from the registry. AI Kernel initializes providers lazily on first use.

## Migration note

The current codebase (post Phase 0) still uses the template's `src/app` + `src/components` layout with static demo data in Dashboard/Tasks/Calendar. The kernel (`src/core`) and `src/modules` land in Phase 1–2 (see ROADMAP.md); pages are converted into modules as their domains are built.
