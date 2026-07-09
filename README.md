# DavidOS

**A premium personal AI operating system.**

DavidOS is a single, dark-first workspace where projects, tasks, notes, goals, documents, and a workforce of AI agents run on a shared kernel of data, memory, and intelligence. Local-first: your data lives on your device and is always exportable.

> Status: under active migration from a dashboard template into the modular OS architecture. See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the current phase.

## Documentation

| Doc | Purpose |
|---|---|
| [`docs/VISION.md`](docs/VISION.md) | What DavidOS is and the principles behind it |
| [`docs/PRD.md`](docs/PRD.md) | Product requirements — modules and system capabilities |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Kernel + module architecture (entities, storage, events, search, AI, memory, theme) |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Phased migration and delivery plan |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Visual language, tokens, component patterns |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Architecture decision records |

## Tech stack

React 19 · TypeScript · Vite 7 · Tailwind CSS v4 · shadcn/ui v3 (Radix UI) · Zustand · Zod · react-hook-form · TanStack Table · Recharts · react-router v7 · cmdk

## Getting started

Requires Node.js 18+ and pnpm.

```bash
pnpm install
pnpm dev        # http://localhost:5173
```

Other commands:

```bash
pnpm build      # typecheck + production build
pnpm lint       # ESLint
pnpm preview    # preview production build
```

## Credits

UI foundation forked from the MIT-licensed [ShadcnStore dashboard template](https://github.com/silicondeck/shadcn-dashboard-landing-template). See [`License.md`](License.md).
