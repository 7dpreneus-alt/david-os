# DavidOS — Decision Log

Architecture Decision Records. Newest at the bottom. Format: context → decision → consequences.

---

## ADR-001: Build on the ShadcnStore template fork rather than from scratch

**Date:** 2026-07-09 · **Status:** Accepted

**Context.** DavidOS needs a premium UI fast. The forked template ships 39 current shadcn/ui v3 primitives, a mature sidebar/layout system, Tailwind v4 token theming, and working table/calendar implementations.

**Decision.** Keep the template as the UI foundation; strip its demo/marketing surface; build the OS kernel underneath it.

**Consequences.** Weeks of UI work saved; obligation to delete template baggage aggressively (Phase 0) so it doesn't shape product decisions. MIT license retained in `License.md`.

---

## ADR-002: Vite SPA, delete the Next.js version

**Date:** 2026-07-09 · **Status:** Accepted

**Context.** The repo contained parallel Vite and Next.js implementations. DavidOS v1 is single-user and local-first: no SSR, no server data, no auth.

**Decision.** Keep `vite-version` as the app (promoted to repo root); delete `nextjs-version` entirely.

**Consequences.** One codebase; static deploy anywhere; simpler mental model. If server-side AI key proxying is needed later, it will be a small edge function, not a framework migration. Git history retains the Next.js code.

---

## ADR-003: Kernel + modules architecture instead of pages

**Date:** 2026-07-09 · **Status:** Accepted

**Context.** DavidOS must grow into new life domains (Fitness, Finance, Operations, CRM) without restructuring. A page-per-feature app couples nav, routes, search, and AI features to core files.

**Decision.** `src/core` kernel (entities, storage, events, search, AI, memory, theme, module registry) + `src/modules` where each capability registers a manifest (routes, nav, commands, entity types, search extractors, event handlers, tools, widgets). Shell renders from the registry.

**Consequences.** New capability = new folder + manifest entry. Costs upfront indirection in Phase 1; pays off from the first added module. Core never imports modules; modules communicate via the kernel only.

---

## ADR-004: Universal entity model with a central link graph

**Date:** 2026-07-09 · **Status:** Accepted

**Context.** Cross-module relationships (task↔project, workout↔goal) must work between modules that don't know about each other, and generic UI (search, link pickers, Mission Control) must render any entity.

**Decision.** All domain objects extend `BaseEntity` (id, type, title, timestamps, tags); relationships live in a central `EntityLink` store; an entity-type registry supplies schema, icon, renderer, and search extractor per type.

**Consequences.** Any-to-any linking; one search index; generic components. Modules must register types instead of privately defining shapes; link integrity (dangling links on delete) is a kernel responsibility.

---

## ADR-005: Storage adapter abstraction, LocalStorage first

**Date:** 2026-07-09 · **Status:** Accepted

**Context.** v1 must work offline with zero infrastructure, but persistence should evolve to SQLite/Supabase/Postgres without rewriting features.

**Decision.** A `StorageAdapter` interface with typed, Zod-validated repositories on top; feature stores (Zustand) hydrate/persist only through repositories. v1 ships a LocalStorage adapter with schema versioning and export/import.

**Consequences.** No `localStorage` calls in feature code — enforced by review. Async interface from day one (LocalStorage is sync, but the API isn't) so future adapters don't change call sites. LocalStorage quota (~5MB) is acceptable for v1 text data; documents/blobs wait for a richer adapter.

---

## ADR-006: Zustand for state, one store per module

**Date:** 2026-07-09 · **Status:** Accepted

**Context.** Already a template dependency; the app needs simple, non-boilerplate client state bound to the repository layer.

**Decision.** One Zustand store per module, hydrated from its repository; cross-module reads go through kernel APIs (entity registry, links, search), not other modules' stores.

**Consequences.** No Redux/query-cache complexity; the event bus (not store subscriptions) is the cross-module signal mechanism.

---

## ADR-007: Centralized AI Kernel; agents are data

**Date:** 2026-07-09 · **Status:** Accepted

**Context.** AI must be a system capability (memory, tools, context over the whole entity graph), not a chat page. Multiple providers/models will come and go.

**Decision.** One `core/ai` subsystem owning providers, model routing, context assembly, tool execution, and agent orchestration. Agents are entities (data), executed by the kernel. Modules contribute tools via manifests. v1 provider: Anthropic, BYO key stored locally.

**Consequences.** The Workforce UI stays thin; swapping/adding providers touches one layer; every module's data is automatically actionable by agents through registered tools. Local key storage is an accepted v1 trade-off (single-user, own device); a proxy adapter is the later hardening path.

---

## ADR-008: Global event bus for cross-module communication

**Date:** 2026-07-09 · **Status:** Accepted

**Context.** Search indexing, memory capture, and Mission Control all need to react to domain changes without coupling to every module.

**Decision.** Typed in-process pub/sub in `core/events`; repositories auto-emit `entity.*` events; modules declare subscriptions in manifests.

**Consequences.** Observers (search, memory, widgets) stay current for free. Synchronous and in-process — no durability or ordering guarantees beyond call order; handlers must be idempotent and non-throwing.

---

## ADR-009: Rename "AI Agents" to "Workforce" (UI only)

**Date:** 2026-07-09 · **Status:** Accepted

**Context.** Product direction: the agents area should read as a staffed team, not a technical feature.

**Decision.** All user-facing surfaces say **Workforce** (module id `workforce`). Internal architecture, types, and docs keep agent terminology (`agent`, `AgentRun`, orchestrator).

**Consequences.** Copy/nav/branding use Workforce; no architectural change.

---

## ADR-010: Keep and modularize the theme system

**Date:** 2026-07-09 · **Status:** Accepted (supersedes the pre-revision plan to strip the customizer)

**Context.** The original migration plan proposed reducing the theme customizer to a minimal appearance panel. Revised direction: preserve theming power, make it modular.

**Decision.** Theme presets become a registry in `core/theme`; the customizer becomes the implementation of Settings → Appearance; `davidos-dark` registers as the default preset; modules/users can register presets.

**Consequences.** Full theming flexibility retained; preset data moves from hardcoded files to registry entries in Phase 1; dark-first identity enforced by the default preset rather than by deleting options.

---

## ADR-011: Memory Engine starts keyword-based, embeddings later

**Date:** 2026-07-09 · **Status:** Accepted

**Context.** Long-term memory retrieval is required, but v1 has no vector infrastructure and must stay local-first.

**Decision.** Memories are entities scored by keyword match × importance × recency behind a `retrieve(query, budget)` API. Embedding retrieval is a future drop-in behind the same API.

**Consequences.** Zero infra for v1; retrieval quality is bounded by keyword matching until embeddings land; API stability protects the AI Kernel from that upgrade.

---

## ADR-012: Widget Engine — every dashboard card is a widget

**Date:** 2026-07-09 · **Status:** Accepted

**Context.** Mission Control must grow with new modules and support per-user arrangement. Hardcoded dashboard cards couple the home surface to every module.

**Decision.** Widget **definitions** come from module manifests; widget **instances** (position, pinned, hidden, per-instance config, reserved size field) are persisted entities owned by a workspace. The dashboard is a generic widget host with move/pin/hide/configure affordances.

**Consequences.** New modules light up the dashboard by declaring widgets — no dashboard edits. Resizing is future-proofed via the reserved `size` field rather than built now. Instance config validates against a widget-declared Zod schema.

---

## ADR-013: Workspace Engine with built-in templates

**Date:** 2026-07-09 · **Status:** Accepted

**Context.** One fixed dashboard can't serve different operating modes (running the company vs training vs personal life).

**Decision.** Workspaces are entities that own a widget layout and preferences; switching loads both. Built-in templates: Home (default), CEO, Operations, Fitness, Finance, Development, Personal. Modules may ship workspace templates in manifests.

**Consequences.** The same widget catalog composes into unlimited operating views; workspaces persist/export like all entities; per-workspace theme preference is possible without new plumbing.

---

## ADR-014: One Command Engine; the palette is the primary interface

**Date:** 2026-07-09 · **Status:** Accepted

**Context.** Navigation, quick actions, search, shortcuts, and future automation would otherwise each grow their own action lists (the Phase-0 palette already duplicated the sidebar).

**Decision.** A single command registry (`core/commands`) holds everything runnable: module commands, auto-generated navigation, workspace switching, system commands. The ⌘K palette, keyboard shortcuts, the future Workflow Engine, and the AI-tool bridge all consume this one registry.

**Consequences.** One place to discover/rank/execute actions; workflows and agents automate exactly what users can do by hand; no parallel action systems to drift.

---

## ADR-015: Notification Engine — one publish pipeline, durable history

**Date:** 2026-07-09 · **Status:** Accepted

**Context.** Ad-hoc toasts lose history; modules should not each invent notification handling.

**Decision.** All modules publish through `notifications.publish()`. Notifications are entities: the same call persists to history, emits an event, and optionally shows a transient toast (sonner as transport). A notification center surfaces history with read/unread and per-module filters.

**Consequences.** Nothing important vanishes with a toast; notification history is searchable like any entity; per-module preferences are a filter, not new APIs.

---

## ADR-016: Activity Timeline recorded from repository events

**Date:** 2026-07-09 · **Status:** Accepted

**Context.** "What happened?" must be answerable across the whole system, for the user and for AI context.

**Decision.** A kernel recorder subscribes to the `entity.*` events repositories already emit and writes activity entities (verb, entity ref, actor user/agent, shallow diff). Activity and notification entities are excluded from recording to prevent recursion. Activities are indexed, so the timeline is searchable; `activity.for(entityId)` powers per-entity history.

**Consequences.** Modules get audit history for free by using repositories; the Context and Memory Engines gain a temporal signal source; storage growth is bounded later by retention policies (a storage-layer concern).

---

## ADR-017: Workflow Engine specified now, implemented later

**Date:** 2026-07-09 · **Status:** Accepted (implementation deferred)

**Context.** Reusable multi-step workflows are a committed direction, but building them before the Command Engine and domain modules exist would invert dependencies.

**Decision.** The architecture is fixed now — workflows are entities whose steps invoke registered commands or agent runs, with manual/event triggers (schedules later); runs persist as entities, failures notify, and everything lands on the timeline. `core/workflows` ships types/spec only until the post-v1 roadmap slot. **No feature code before then.**

**Consequences.** Every earlier engine is built knowing workflows will sit on top (commands stay serializable/addressable by id); no throwaway automation code in v1.

---

## ADR-018: Context Engine separated from Memory Engine

**Date:** 2026-07-09 · **Status:** Accepted (refines ADR-007/ADR-011)

**Context.** "Memory" was conflating two jobs: storing knowledge and deciding what a model call should see.

**Decision.** Memory stores information (memory entities + `retrieve()`). A distinct Context Engine (`core/context`) owns `assemble()`: it selects and budgets from the entity graph, memory retrievals, recent activity, workspace state, and conversation history, governed by per-agent `ContextPolicy` data. The AI Kernel calls the Context Engine before every model call and never builds prompts itself.

**Consequences.** Retrieval quality and prompt construction evolve independently (embeddings upgrade Memory; selection policy upgrades Context); context policies become user-editable per agent; one place to audit exactly what an agent saw.
