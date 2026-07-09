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
