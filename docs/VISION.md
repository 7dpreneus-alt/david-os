# DavidOS — Vision

## What DavidOS is

DavidOS is a **personal AI operating system**: a single, premium, dark-first workspace where one person runs their entire life and work — projects, tasks, notes, goals, documents, and a workforce of AI agents — on top of a shared kernel of data, memory, and intelligence.

It is not a dashboard, a todo app, or a chat wrapper. It is an **operating system** in the architectural sense:

- **A kernel** owns the primitives: entities, storage, events, search, memory, and AI.
- **Modules** (Projects, Tasks, Notes, Goals, Workforce, and future domains like Fitness, Finance, Operations, CRM) are installable capabilities built on those primitives.
- **Everything is connected**: any entity can relate to any other, any module can react to any event, and the AI layer can see and act across all of it.

## Why it exists

Personal productivity tooling is fragmented: tasks in one app, notes in another, goals in a spreadsheet, AI in a chat tab with no memory of any of it. The context lives in the human's head and is re-explained to every tool.

DavidOS inverts this. The system holds the context — one entity graph, one memory, one search index — and both the human and the AI agents operate on it. Adding a new life domain should be a module drop-in, not a new app subscription.

## Principles

1. **Local-first, own your data.** Everything works offline against local storage. Sync and server backends are adapters, never requirements. Data is always exportable as plain JSON.
2. **Modules, not pages.** New capabilities register themselves — routes, nav, commands, entity types, search providers, agent tools — without touching core code.
3. **One entity graph.** Every object in the system shares a common metadata contract and can link to any other. Relationships are first-class.
4. **AI is the kernel, not a feature.** Provider management, memory, context assembly, model routing, tool execution, and agent orchestration live in one place (the AI Kernel) and are available to every module.
5. **Events over coupling.** Modules communicate through a global event bus. No module imports another module's internals.
6. **Premium by default.** Dark, calm, precise UI. Keyboard-first (⌘K). The quality bar is "product you'd pay for," not "admin template."
7. **Evolvable persistence.** LocalStorage today; SQLite, Supabase, or Postgres tomorrow — behind a storage adapter interface that feature code never sees through.

## North star

Open DavidOS in the morning and Mission Control tells you exactly where your life stands. Press ⌘K and reach anything you've ever written. Ask the Workforce to do something, and the agents already know your projects, your goals, and your history — because they live in the same OS you do.
