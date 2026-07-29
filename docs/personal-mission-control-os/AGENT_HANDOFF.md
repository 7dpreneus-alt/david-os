# Agent Handoff

## Current objective

Implement **Phase 1 — Functional Daily Core** of Personal Mission Control OS from the supplied architecture package. Do not begin Phase 2 Calendar writes, background jobs, browser/email notification delivery, weekly-review automation, capacity learning, or Phase 3 Opportunity Radar until the Phase 1 production gate passes.

This handoff does not authorize claiming the application is built. Report only verified work.

## Source-of-truth files

Read in this order:

1. `SECURITY_AND_PRIVACY.md`
2. `ACCEPTANCE_CRITERIA.md`
3. `DATA_MODEL.md`
4. `DATABASE_SCHEMA.sql`
5. `API_CONTRACTS.md`
6. `CALENDAR_INTEGRATION.md`
7. `PRIORITY_ENGINE.md`
8. `RECOVERY_ENGINE.md`
9. `PRD.md`
10. `INFORMATION_ARCHITECTURE.md`
11. `DESIGN_SYSTEM.md`
12. `IMPLEMENTATION_ROADMAP.md`
13. `TEST_PLAN.md`
14. `RISK_REGISTER.md`
15. `DECISION_LOG.md`
16. `RED_TEAM_REPORT.md`

When files conflict, follow the hierarchy in `README.md`. Record unresolved decisions before coding.

## Approved technology stack

- Node.js 24 LTS
- pnpm with committed lockfile
- Next.js 16.2.x latest patched stable/Active LTS release; no preview tag
- React 19.2.x latest patched release
- TypeScript strict
- Supabase PostgreSQL and Supabase Auth
- RLS on every exposed table/view
- Tailwind CSS and accessible Radix-based components
- Zod
- React Hook Form
- Server Components by default
- Vercel deployment
- Vitest, Testing Library, Playwright, pgTAP
- Structured JSON logging and Sentry-compatible error adapter
- Minimal custom PWA service worker for cached shell/state and queued capture

Do not introduce microservices, a second database, Redis, a workflow vendor, an LLM dependency, or a state-management framework without a written decision explaining the proven need.

## Required repository structure

```text
app/
  (auth)/
  (product)/
  api/v1/
  manifest.ts
  global-error.tsx
components/
  command-center/
  capture/
  calendar/
  recovery/
  approvals/
  ui/
domain/
  tasks/
  planning/
  priority/
  recovery/
  calendar/
  home/
  fitness/
  learning/
  travel/
  opportunities/
lib/
  auth/
  db/
  google/
  jobs/
  logging/
  validation/
  pwa/
supabase/
  migrations/
  seed.sql
  tests/
tests/
  unit/
  integration/
  e2e/
public/sw.js
docs/
.github/workflows/
```

Domain engines must not import UI code. Provider adapters must not mutate unrelated domains.

## Exact first implementation milestone

Implement **Milestone 0: Repository, tooling, and guardrails** only.

Deliver:

1. Fresh Next.js project using the approved versions.
2. Strict TypeScript and lint configuration.
3. Environment schema with feature flags defaulted safely.
4. `/system/status` server route/page showing environment, build SHA, and feature status without secrets.
5. Structured request logging with correlation IDs.
6. Global error boundary and typed API error envelope.
7. Vitest, Testing Library, Playwright, Supabase CLI, and pgTAP scaffolding.
8. GitHub Actions for audit, typecheck, lint, unit, database, build, and E2E smoke.
9. Security headers with CSP report-only in preview.
10. README commands that work from a fresh clone.

Do not build the dashboard during Milestone 0.

## Build order

1. Milestone 0 — repository/tooling
2. Milestone 1 — auth/database/RLS
3. Milestone 2 — inbox/tasks/projects/capture
4. Milestone 3 — Google OAuth and real read sync
5. Milestone 4 — calendar view/open windows
6. Milestone 5 — priority engine/Command Center
7. Milestone 6 — day plans/proposals/approvals
8. Milestone 7 — recovery engine
9. Milestone 8 — Home/Fitness/Learning/Travel
10. Milestone 9 — decisions/rolling state/PWA/data controls
11. Milestone 10 — production hardening

Stop after each milestone and report evidence. Do not batch multiple milestones merely to make the report look impressive.

## Required commands

Create scripts that support:

```bash
corepack enable
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm test:watch
pnpm test:db
pnpm test:integration
pnpm test:e2e
pnpm test:e2e:smoke
pnpm build
pnpm start
```

Supabase:

```bash
supabase start
supabase status
supabase db reset
supabase migration new <name>
supabase db diff --use-migra -f <name>
supabase test db
```

## Database migration order

Split `DATABASE_SCHEMA.sql` into timestamped migrations:

1. extensions and enums
2. profiles/preferences/life areas
3. inbox/goals/projects/tasks/dependencies/routines/completions
4. availability/energy/capacity
5. Calendar connections/calendars/sync/events/links
6. plans/priorities/proposals/approvals
7. missed commitments/recovery
8. home
9. fitness and learning
10. travel
11. opportunities schema, disabled and not surfaced
12. notifications/reviews/decisions/audit/mutations/jobs/rolling state
13. indexes/triggers
14. RLS and grants
15. safe read functions/views
16. pgTAP regression tests

After each slice, reset local DB and run tests. Do not apply the monolithic baseline directly to production.

## Environment variables

Use `ENVIRONMENT_VARIABLES.md`. Milestone 0 requires core Supabase placeholders only in local development and strict disabled feature flags. Calendar milestone requires real preview Google credentials. Never invent values or commit secrets.

## External credentials required

Before matching milestones can pass:

- Supabase preview and production projects
- Vercel team/project/domain
- Google Cloud OAuth clients for preview and production
- Google Calendar API enabled
- OAuth consent/support configuration
- Dedicated Google test Calendar/account
- Optional Sentry DSN/auth token
- Phase 2 only: cron secret, browser push credentials if architecture changes, and optional email provider credentials

Report exact credential blocker and owner action. Do not substitute demo mode and call it complete.

## Features that must remain behind approval

- Any Google Calendar create, update, move, split, or delete
- Any future email/message
- Any external form submission
- Any destructive bulk action
- Any future purchase or booking, which remains prohibited
- Any grant submission, prohibited
- Any trading order, prohibited

Phase 1 Calendar actions are proposals only. The UI must state that Google Calendar has not changed.

## Tests required before proceeding

At every milestone:

- Typecheck
- Lint
- Relevant unit/component tests
- Database/RLS tests when schema changes
- Integration tests for transactional workflows
- Playwright critical path
- Production build

Before Milestone 4 proceeds, Milestone 3 must include real Google Calendar evidence: connect, initial sync, repeat sync without duplicates, modify, delete, incremental sync, disconnect/reconnect behavior.

Before Phase 2 proceeds, every Phase 1 item in `ACCEPTANCE_CRITERIA.md` must pass and no Severity 1/2 defect may remain.

## Known risks

- Calendar cursor and duplicate handling
- OAuth verification delays
- timezone/all-day/DST correctness
- serverless interruption during sync
- RLS drift as schema grows
- stale proposal approval
- offline capture duplication
- sensitive logs and exports
- false affordability assumptions
- punitive recovery language
- framework security advisories

Use `RISK_REGISTER.md` and add new risks rather than burying them in chat.

## Deferred features

- Calendar writes and write reconciliation
- Background sync and Google push watches
- Browser/email delivery
- Weekly review automation
- Learned capacity and weight adjustment
- General import
- Opportunity ingestion, grants, travel deals, digests, and watchlists
- Full offline CRUD
- Shared household/coaching accounts
- Native mobile apps
- LLM explanation/classification provider

Schemas may support later work, but no visible control should imply a deferred feature is active.

## Prohibited shortcuts

- No mock arrays as production fallback
- No fake sync success
- No plaintext OAuth refresh tokens
- No service-role key in client code
- No disabling RLS to “make it work”
- No Calendar event dedupe by title/time
- No advancing sync cursor after partial failure
- No fixed event movement by planner
- No more than three dominant priorities
- No marking minimum completion as full
- No vague “learn trading” scheduled block
- No verified badge without evidence
- No dead buttons, empty menus, or false notifications
- No catch-all `any` or swallowed exceptions
- No direct provider call from browser with secret
- No claim of completion from screenshots alone
- No Phase 3 build before Phase 1 gate

## Definition of done

For the current milestone:

- Code runs from fresh clone.
- Data and behavior use the intended real dependency for that milestone.
- Persistence and authorization are proven.
- Loading, empty, error, and permission states exist.
- Tests pass.
- Build passes.
- Evidence is attached.
- Known limitations and blockers are explicit.
- Documentation and decision log are updated.

For Phase 1, use the complete release gate in `ACCEPTANCE_CRITERIA.md`.

## What must be reported back after implementation

Return one implementation report containing:

1. Milestone completed and exact scope
2. Repository URL, branch, and commit SHA
3. Deployed preview/production URL where applicable
4. Files added/changed grouped by domain
5. Database migrations applied in order
6. Environment variables required, with values redacted
7. External credentials still missing
8. Commands run and exact pass/fail summary
9. Unit, database, integration, E2E, build, accessibility, and security results
10. Real Google Calendar evidence when applicable
11. Screenshots/traces as supporting evidence, not sole proof
12. Open defects by severity
13. Known limitations
14. Risks added or changed
15. Rollback method
16. Recommended next milestone
17. Explicit statement of what was not implemented

Do not report “complete” when credentials, real-provider tests, production persistence, or acceptance evidence are missing.
