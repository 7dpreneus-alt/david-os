# Personal Mission Control OS

Production architecture and implementation handoff

**Architecture baseline date:** 2026-07-28  
**Primary timezone:** `America/New_York`  
**Package status:** Implementation-ready specification; no application has been built by this package.

## Purpose

Personal Mission Control OS is a secure, mobile-first personal operations system that turns responsibilities, goals, routines, calendar commitments, constraints, and recovery choices into an understandable daily operating plan. It is not a generic to-do app and it is not an autonomous life manager. The product maintains operational truth, proposes realistic actions, explains tradeoffs, and requires user approval before material external writes during the initial phase.

## Status vocabulary

Every feature and integration must use one of these labels:

- **Implemented:** Code, persistence, tests, error handling, and deployment evidence exist.
- **Implemented but requires credentials:** Code and tests exist; owner credentials or provider approval are still required.
- **Sandbox/demo mode:** Behavior is intentionally simulated and clearly labeled. Demo results never appear as live results.
- **Deferred:** Approved for a later phase and absent from current production paths.
- **Blocked:** Cannot proceed; exact blocker, owner, and next action are recorded.

A rendered screen is never evidence that a feature is implemented.

## Architecture assumptions

1. The first deployment is single-user in product behavior, but every table and authorization policy is multi-user safe from day one.
2. Google Calendar is a major scheduling source of truth. Internal tasks, recovery logic, approvals, decisions, and planning metadata remain owned by Personal Mission Control OS.
3. Phase 1 may read Google Calendar and create internal schedule proposals. Calendar writes remain approval-gated and are not treated as complete until OAuth, write scopes, idempotency, reconciliation, and end-to-end tests pass.
4. The app uses `America/New_York` as the initial home timezone while storing timestamps in UTC and preserving source timezones.
5. Houston wedding-trip data is starter data only. Dates and booking details are explicitly unverified until the user confirms them.
6. Financial guardrails manage affordability and scheduling decisions using user-entered budgets in Phase 1. Personal banking synchronization, payments, purchases, trading execution, grant submissions, and external messages are outside scope.
7. Priority and recovery recommendations are deterministic and explainable in Phase 1. A language model may later improve wording, but it cannot silently change scores, commitments, or calendars.
8. Offline support in Phase 1 covers app-shell access, read-only cached daily state, and queued rapid capture. Conflict-heavy offline editing of all records is deferred.
9. The main screen presents at most three dominant outcomes.
10. Starter data is inserted only through an explicit development or onboarding action and is never mixed with production metrics without a visible starter-data label.

## Implementation-blocking owner questions

Architecture does not stop for these questions, but the matching milestones cannot be completed without answers:

1. Which Supabase organization, project name, region, and billing owner will host production?
2. Which Google Cloud project, verified domain, OAuth consent configuration, and support email will own the Calendar integration?
3. Which Vercel team, project, production domain, and billing tier will host the application?
4. What are the confirmed Houston travel dates, local trip timezone, bookings already made, and hard preparation deadlines?
5. For Phase 2 email notifications, should the product use Resend, another provider, or remain in-app/browser only?

## Approved stack

- Node.js 24 LTS
- Next.js 16.2.x or the latest patched 16.2 Active LTS release; do not use preview builds
- React 19.2.x
- TypeScript in strict mode
- PostgreSQL through Supabase
- Supabase Auth with server-side session handling
- Supabase Row Level Security on every exposed table and view
- Tailwind CSS plus accessible Radix-based components
- Zod for request, environment, and domain validation
- Server Components by default; Client Components only for interactive islands
- Vercel for web deployment
- Vercel Cron plus a PostgreSQL job ledger in Phase 2
- Vitest, Testing Library, Playwright, and pgTAP
- Pino-compatible structured JSON logs and Sentry-compatible error monitoring
- A custom, minimal PWA service worker for app shell, cached daily state, and queued capture

Exact versions must be pinned in the lockfile and updated through reviewed dependency pull requests. Security patch releases take priority over feature upgrades.

## Source-of-truth hierarchy

When files appear to conflict, use this order:

1. `SECURITY_AND_PRIVACY.md`
2. `ACCEPTANCE_CRITERIA.md`
3. `DATA_MODEL.md` and `DATABASE_SCHEMA.sql`
4. `API_CONTRACTS.md`
5. `CALENDAR_INTEGRATION.md`, `PRIORITY_ENGINE.md`, and `RECOVERY_ENGINE.md`
6. `PRD.md`
7. `DESIGN_SYSTEM.md` and `INFORMATION_ARCHITECTURE.md`
8. `IMPLEMENTATION_ROADMAP.md`
9. `AGENT_HANDOFF.md`

Any unresolved contradiction must be entered in `DECISION_LOG.md` before implementation continues.

## Phase gates

### Phase 1: Functional Daily Core

The gate passes only when a real user can authenticate, persist tasks, connect and read a real Google Calendar, create a realistic day plan, approve or reject schedule proposals, recover a missed task, use home/fitness/learning/travel starter workflows, inspect decision history, and complete the critical mobile paths in production.

### Phase 2: Intelligence and Automation

May begin only after Phase 1 acceptance tests pass in production and no Severity 1 or Severity 2 defect remains open. Adds write sync, background sync, notifications, weekly review, capacity learning, import/export, and stronger analytics.

### Phase 3: Opportunity Radar

May begin only after Phase 1 is operational and Phase 2 security foundations for jobs, notifications, source provenance, and approval are proven. No broad scraping is approved by this package.

## Repository layout

```text
personal-mission-control-os/
├── app/
│   ├── (auth)/
│   ├── (product)/
│   ├── api/
│   ├── manifest.ts
│   └── global-error.tsx
├── components/
│   ├── command-center/
│   ├── capture/
│   ├── calendar/
│   ├── recovery/
│   ├── approvals/
│   └── ui/
├── domain/
│   ├── tasks/
│   ├── planning/
│   ├── priority/
│   ├── recovery/
│   ├── calendar/
│   ├── home/
│   ├── fitness/
│   ├── learning/
│   ├── travel/
│   └── opportunities/
├── lib/
│   ├── auth/
│   ├── db/
│   ├── google/
│   ├── jobs/
│   ├── logging/
│   ├── validation/
│   └── pwa/
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── tests/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── public/
│   └── sw.js
├── docs/
├── .github/workflows/
└── package.json
```

## Required commands

```bash
corepack enable
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm test:db
pnpm test:e2e
pnpm build
```

Supabase local workflow:

```bash
supabase start
supabase db reset
supabase test db
supabase migration new <name>
supabase db diff --use-migra -f <name>
```

## Package contents

This package contains the 25 requested deliverables plus `RED_TEAM_REPORT.md`. `AGENT_HANDOFF.md` is intentionally last in the build reading order.

## Reference baseline

The architecture follows current official guidance for Next.js 16, React 19.2, Supabase RLS and database testing, Google Calendar incremental synchronization and push notifications, and Vercel environment and cron controls. Implementation engineers must recheck official security advisories before installing dependencies.
