# DavidOS — Architecture

DavidOS is structured as a small **kernel** (`src/core`) plus **modules** (`src/modules`). The kernel owns primitives and engines; modules own domains. Nothing in `core` imports from `modules`; modules never import each other's internals — they interact through the kernel (entities, events, commands, search, AI).

```
┌───────────────────────────────────────────────────────────────────┐
│  Shell (sidebar, header, command palette, router)                 │
│  — generated from the Module Registry & Command Engine            │
├───────────────────────────────────────────────────────────────────┤
│  Modules: mission-control · projects · tasks · notes · goals      │
│           documents · workforce · settings · (fitness, finance,…) │
├───────────────────────────────────────────────────────────────────┤
│  Engines (kernel services composed from primitives)               │
│  ┌─────────┐ ┌───────────┐ ┌──────────┐ ┌───────────┐ ┌────────┐  │
│  │ Command │ │ Widget    │ │ Workspace│ │ Notifica- │ │Activity│  │
│  │ Engine  │ │ Engine    │ │ Engine   │ │ tion Eng. │ │Timeline│  │
│  └─────────┘ └───────────┘ └──────────┘ └───────────┘ └────────┘  │
│  ┌──────────────────┐ ┌──────────────┐ ┌────────────────────────┐ │
│  │    AI Kernel     │ │Context Engine│ │ Memory Engine          │ │
│  └──────────────────┘ └──────────────┘ └────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ Workflow Engine (specified; implementation deferred)       │   │
│  └────────────────────────────────────────────────────────────┘   │
├───────────────────────────────────────────────────────────────────┤
│  Primitives                                                       │
│  ┌──────────┐ ┌─────────┐ ┌────────┐ ┌────────┐ ┌─────────┐       │
│  │ Entities │ │ Storage │ │ Events │ │ Search │ │  Theme  │       │
│  └──────────┘ └─────────┘ └────────┘ └────────┘ └─────────┘       │
├───────────────────────────────────────────────────────────────────┤
│  Storage adapters: LocalStorage → SQLite / Supabase / Postgres    │
└───────────────────────────────────────────────────────────────────┘
```

**Layering rule:** primitives know nothing above them; engines are built on primitives (and may consume each other's public APIs); modules consume primitives and engines through registries; the shell consumes registries only.

## Folder structure (target)

```
src/
├── core/
│   ├── modules/        # ModuleManifest type, module registry, lifecycle
│   ├── entities/       # BaseEntity, EntityLink graph, entity-type registry
│   ├── storage/        # StorageAdapter interface, adapters/, repositories
│   ├── events/         # typed event bus
│   ├── search/         # index, extractor registry, query API
│   ├── commands/       # Command Engine: one registry for everything runnable
│   ├── widgets/        # Widget Engine: widget defs + instance management
│   ├── workspaces/     # Workspace Engine: layouts, preferences, switching
│   ├── notifications/  # Notification Engine: publish API + history
│   ├── activity/       # Activity Timeline: recorder + query API
│   ├── ai/             # AI Kernel: providers, router, tools, orchestrator
│   ├── context/        # Context Engine: decides what AI receives
│   ├── memory/         # Memory Engine: long-term knowledge store
│   ├── workflows/      # Workflow Engine (types/spec only until implemented)
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

---

# Primitives

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
  commands?: CommandDef[]           // registered into the Command Engine
  widgets?: WidgetDef[]             // registered into the Widget Engine
  workspaceTemplates?: WorkspaceTemplate[] // suggested workspaces (e.g. Fitness)
  searchProviders?: SearchExtractor[]
  events?: EventSubscription[]      // handlers wired at boot
  settingsPanels?: SettingsPanelDef[]
  agentTools?: AgentToolDef[]       // tools exposed to the AI Kernel
}
```

At boot, `core/modules/registry.ts` collects manifests and registers every contribution into the corresponding engine/registry, then hands routes/nav to the shell. **Adding Fitness/Finance/CRM = adding one folder + one manifest entry.**

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

Each module extends `BaseEntity` with its payload and registers a Zod schema. Links live in a **central link store** so relationships work across modules that know nothing about each other. The entity registry provides per-type icon, renderer, and search extractor so generic UI (search results, link pickers, widgets, timeline) can render anything. System records — workspaces, widget instances, notifications, activities, memories, agents, workflow runs — are themselves entities, so persistence, export, search, and linking come for free.

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

- Modules use **typed repositories** (`createRepository<Task>("tasks", taskSchema)`) that validate on read/write, stamp `updatedAt`, and emit `entity.*` events.
- Zustand stores hydrate from repositories and persist through them — the adapter is injected once in core config.
- v1 ships `LocalStorageAdapter` (namespaced keys, schema `version`, migration hooks). SQLite/Supabase/Postgres adapters implement the same interface; feature code does not change.

## 4. Event bus (`core/events`)

Typed pub/sub with a discriminated-union event map:

```ts
events.emit("task.completed", { taskId })
events.on("entity.created", handler)     // wildcard entity events emitted by repositories
```

Repositories emit `entity.*` events automatically, so the search index, Activity Timeline, Notification Engine, and Memory Engine stay current without module cooperation. Synchronous, in-process, ordered; handlers must not throw (errors are caught and logged).

## 5. Universal search (`core/search`)

- In-memory inverted index built at boot from repositories, updated incrementally from `entity.*` events.
- Modules register extractors: `(entity) => ({ text, boostFields })`.
- Query API returns ranked entities with type metadata for rendering. Because activities, notifications, and memories are entities, **the timeline and notification history are searchable through the same index**.
- The Command Engine consumes search as one of its result sources.

## 6. Theme engine (`core/theme`)

The template's theme system is **kept and modularized**:

- Design tokens remain CSS variables (Tailwind v4 `@theme`, oklch).
- Presets are data registered in a **preset registry**; `davidos-dark` is the flagship default. Modules and users can register presets.
- The theme customizer is the implementation behind Settings → Appearance, driven by the registry instead of hardcoded preset files.

---

# Engines

## 7. Command Engine (`core/commands`)

**The command palette is the primary operating interface of DavidOS.** Everything runnable lives in one registry:

```ts
interface CommandDef {
  id: string                 // "tasks.create", "nav.tasks", "theme.toggle"
  title: string
  icon?: LucideIcon
  group: string              // palette section: "Navigation" | "Actions" | ...
  keywords?: string[]
  shortcut?: string          // e.g. "mod+shift+t"
  when?: () => boolean       // availability predicate
  run: (ctx: CommandContext) => void | Promise<void>
}
```

- **Sources:** module manifests (actions), auto-generated navigation commands (from module routes/nav), workspace switching, theme/system commands, and — later — workflows and automations. Entity search results are adapted into ad-hoc "open X" commands at query time.
- **Consumers:** the ⌘K palette (UI), keyboard shortcuts (registered from `shortcut`), the Workflow Engine (steps invoke commands), and the AI Kernel (commands can be exposed as agent tools via a bridge).
- One registry means navigation, search, quick actions, and future automation share discovery, ranking, and execution — no parallel action systems.

## 8. Widget Engine (`core/widgets`)

Every dashboard card is a widget.

```ts
interface WidgetDef {
  id: string                     // "tasks.today"
  title: string
  module: string
  component: React.LazyExoticComponent<WidgetComponent>
  defaultSize: { w: number; h: number }   // grid units; resizing is future
  configSchema?: ZodSchema       // per-instance configuration
}

interface WidgetInstance extends BaseEntity {   // type: "widget-instance"
  widgetId: string
  workspaceId: string
  position: number               // order in the workspace grid
  pinned: boolean                // pinned widgets sort first and survive "reset"
  hidden: boolean
  size?: { w: number; h: number }          // reserved for future resizing
  config?: Record<string, unknown>         // validated against configSchema
}
```

- Definitions come from module manifests; instances are entities owned by a workspace.
- The dashboard is a **widget host**: it renders the active workspace's visible instances in position order, provides move/pin/hide/configure affordances, and validates config against the widget's schema.
- Widgets read live module data via stores/repositories and subscribe to events; they never receive another module's internals through props.

## 9. Workspace Engine (`core/workspaces`)

A workspace is a saved way of operating DavidOS: which widgets are on the dashboard, in what arrangement, plus preferences.

```ts
interface Workspace extends BaseEntity {        // type: "workspace"
  icon?: string
  isDefault?: boolean
  preferences?: {
    themePresetId?: string       // optional per-workspace theme
    accentOverride?: string
  }
  // layout = the WidgetInstances whose workspaceId points here
}
```

- **Built-in templates:** Home (default), CEO, Operations, Fitness, Finance, Development, Personal. Templates seed a workspace with a curated widget layout; users can create/duplicate/edit workspaces freely.
- Switching a workspace loads its widget layout and applies its preferences; the active workspace id is persisted.
- Modules can ship `workspaceTemplates` in their manifests (installing a Fitness module offers the Fitness workspace).
- Workspaces are entities: persisted, exportable, searchable, linkable.

## 10. Notification Engine (`core/notifications`)

Central publish API and history — all modules notify through one system:

```ts
interface Notification extends BaseEntity {     // type: "notification"
  severity: "info" | "success" | "warning" | "error"
  body?: string
  sourceModule: string
  entityRef?: string             // deep link to the subject entity
  read: boolean
}

notifications.publish({ severity, title, body, sourceModule, entityRef, transient? })
```

- **Transient display** (toasts via sonner) and **durable history** are the same pipeline: `publish()` persists the notification entity, emits `notification.published`, and optionally toasts.
- Sources: module code, event-bus subscriptions (e.g. notify on `agent.run.finished`), the AI Kernel, and later workflows.
- History is a first-class surface (notification center + widget), searchable via the universal index, with read/unread state and per-module filtering in Settings → Notifications.

## 11. Activity Timeline (`core/activity`)

Every entity mutation is recorded:

```ts
interface Activity extends BaseEntity {         // type: "activity"
  verb: "created" | "updated" | "deleted" | "completed" | ...
  entityRef: { id: string; type: string; title: string }
  actor: "user" | { agentId: string }
  changes?: Record<string, { from: unknown; to: unknown }>  // shallow diff
}
```

- A kernel **recorder** subscribes to `entity.*` (and domain events like `task.completed`) and writes Activity entities. Activity/notification entities themselves are excluded to prevent recursion.
- The timeline is **searchable** (activities are indexed like any entity) and queryable per entity (`activity.for(entityId)`) — powering a global timeline view, per-entity history panels, and a Mission Control widget.
- The Context Engine and Memory Engine read the timeline as a signal source ("what has been happening").

## 12. AI Kernel (`core/ai`)

One subsystem, four responsibilities (context assembly is delegated to the Context Engine):

1. **Providers** — registry of LLM providers (Anthropic first; BYO key stored via the storage layer). Uniform `complete()/stream()` interface.
2. **Model routing** — maps a request class (fast/cheap vs deep reasoning, per-agent override) to a provider+model.
3. **Tool execution** — tool registry populated by module manifests plus a Command Engine bridge; the kernel validates arguments (Zod), executes, and emits events.
4. **Agent orchestration** — agents are *data* (entities of type `agent`); the orchestrator runs the loop (LLM ↔ tools), persists runs/steps as entities, and emits `agent.run.*` events.

The Workforce module is a UI over this kernel; it contains no provider logic.

## 13. Context Engine (`core/context`) — separate from Memory

**Memory stores information. Context decides what the AI receives.** They are distinct kernel services:

```ts
context.assemble(request: {
  agentId?: string
  intent: string                  // the user/task prompt
  focusEntityIds?: string[]       // what the user is looking at / acting on
  budget: TokenBudget
  policy?: ContextPolicy          // per-agent/per-task overrides
}): AssembledContext               // ordered, budgeted prompt sections
```

- **Sources** the Context Engine draws from: the entity graph (focus entities + linked neighbors), Memory Engine retrievals, recent Activity Timeline entries, active workspace state, and conversation history.
- **Policy-driven:** a `ContextPolicy` declares which sources an agent may see, per-source token budgets, and ordering. Policies are data, editable per agent in Workforce settings.
- The AI Kernel calls `context.assemble()` before every model call; nothing else in the system builds prompts.
- This separation means memory quality (what is stored) and prompt quality (what is sent) evolve independently — embeddings upgrade Memory; smarter selection/budgeting upgrades Context — without touching each other or the AI Kernel.

## 14. Memory Engine (`core/memory`)

- Memories are entities (`type: "memory"`): `{ kind: "fact" | "observation" | "summary", content, sourceIds, importance, lastAccessed }`.
- Written by: agent runs (kernel-side extraction), event-driven observers (e.g., summarize on `project.completed`), and explicit "remember this" user actions.
- `retrieve(query, budget)` scores by keyword match × importance × recency; consumed by the **Context Engine** (not by the AI Kernel directly). Embedding-based retrieval is a drop-in upgrade behind the same API.

## 15. Workflow Engine (`core/workflows`) — specified, not yet implemented

Reusable multi-step workflows. **Architecture only for now; no implementation until the roadmap reaches it.**

```ts
interface WorkflowDef extends BaseEntity {      // type: "workflow"
  trigger: { kind: "manual" } | { kind: "event"; event: string }
         | { kind: "schedule"; cron: string }   // schedule = future
  steps: WorkflowStep[]
}

type WorkflowStep =
  | { kind: "command"; commandId: string; args?: Record<string, unknown> }
  | { kind: "agent"; agentId: string; prompt: string }
  | { kind: "condition"; expr: string; then: WorkflowStep[]; else?: WorkflowStep[] }
```

- **Execution substrate is the Command Engine** — workflow steps invoke registered commands or agent runs; workflows add sequencing, conditions, and triggers on top. No step type may bypass the registries.
- Runs persist as entities (`workflow-run`) with per-step status; failures notify through the Notification Engine and appear on the Activity Timeline.
- Because workflows are entities and steps reference command ids, workflows are exportable, searchable, and eventually AI-authorable (an agent can compose a workflow from the same command registry it uses as tools).

---

## Boot sequence

1. Core config selects storage adapter → repositories created.
2. Module registry loads manifests → entity types, commands, widgets, workspace templates, tools, extractors, event handlers, theme presets registered.
3. Stores hydrate (validated); search index builds; Activity recorder, Notification Engine, and Memory observers attach to the bus.
4. Workspace Engine loads the active workspace (creating Home from template on first run).
5. Shell renders routes/nav from the module registry and the palette from the Command Engine. AI Kernel initializes providers lazily on first use.

## Migration note

The current codebase (post Phase 0) still uses the template's `src/app` + `src/components` layout with static demo data in Dashboard/Tasks/Calendar. The kernel primitives and engines land per ROADMAP.md; pages are converted into modules as their domains are built.
