# Personal Mission Control OS

A secure, mobile-first personal operations system that turns responsibilities,
goals, routines, calendar commitments, constraints, and recovery choices into an
understandable daily operating plan.

It is not a generic to-do app and it is not an autonomous life manager. It keeps
operational truth, proposes realistic actions, explains its reasoning, and
requires explicit approval before any material external write.

> **Current state:** Phase 1 is partially built. Authentication, the database
> with row-level security, inbox/task/project CRUD, the deterministic priority
> engine, and the Command Center work end to end. Google Calendar, planning
> proposals, the recovery engine, and the domain modules are **not built yet**.
>
> Read **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** before assuming
> any feature exists, and **[QA_EVIDENCE.md](./QA_EVIDENCE.md)** for exact test
> commands and results.

---

## Quick start

Requirements: Node.js 20.19+ (22 recommended), pnpm 10, and PostgreSQL 16 — either
a local server or a Supabase project.

```bash
corepack enable
pnpm install
cp .env.example .env.local
```

### Option A — local PostgreSQL (no Docker required)

```bash
pnpm db:local:start          # starts a PostgreSQL server and prints its URL
# put that URL in .env.local as DATABASE_URL and LOCAL_DATABASE_URL
pnpm db:migrate -- --compat  # applies the Supabase compatibility layer + migrations
pnpm dev
```

`--compat` installs the `auth` schema, the `anon`/`authenticated`/`service_role`
roles, and `auth.uid()` — the parts of Supabase the application schema depends
on. A hosted Supabase project already has all of these, so omit the flag there.

Set `AUTH_PROVIDER=local` and a random `AUTH_SESSION_SECRET` for local work:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

### Option B — Supabase

```bash
# .env.local
DATABASE_URL=<pooled connection string from Supabase → Project Settings → Database>
DIRECT_DATABASE_URL=<direct connection string>
AUTH_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=<project URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
SUPABASE_SERVICE_ROLE_KEY=<service-role key>   # server only, never bundled
```

```bash
MIGRATE_DATABASE_URL="$DIRECT_DATABASE_URL" pnpm db:migrate
pnpm dev
```

Open http://localhost:3000. Create an account, then visit
http://localhost:3000/system/status to confirm the database is reachable, the
migrations are applied, and no public table is missing RLS.

---

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm typecheck` | `tsc --noEmit`, strict mode |
| `pnpm lint` | ESLint |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:watch` | Unit tests in watch mode |
| `pnpm test:integration` | Integration and RLS tests against a real database |
| `pnpm test:db` | Database-focused subset of the integration suite |
| `pnpm test:e2e` | Playwright, all viewports |
| `pnpm test:e2e:smoke` | Playwright, `@smoke` tests only |
| `pnpm db:local:start` / `:stop` / `:reset` | Local PostgreSQL lifecycle |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm seed:starter` | Install labelled starter data for a user |
| `pnpm audit` | Dependency vulnerability audit |

---

## Architecture

```text
app/
  (auth)/          sign-in, sign-up, and their server actions
  (product)/       the protected shell: today, inbox, tasks, projects, settings
  api/v1/          REST endpoints with the typed envelope from API_CONTRACTS.md
  system/status/   environment, migrations, RLS, and feature-flag diagnostics
components/        UI primitives and feature components (presentation only)
domain/            priority engine, task repository, planning, starter data, export
lib/
  auth/            identity providers, password hashing, session tokens
  db/              connection pool and role-scoped sessions
  http/            error envelope and route wrapper
  logging/         structured JSON logs with redaction
  validation/      shared Zod primitives
supabase/
  migrations/      15 ordered SQL migrations
  local/           Supabase compatibility layer for plain PostgreSQL
tests/
  unit/            pure logic: priority engine, auth, env, logging
  integration/     real SQL: RLS isolation, CRUD, transactions
  e2e/             Playwright user journeys at desktop, 360px, and 390px
scripts/           database lifecycle, migrations, seeding
docs/personal-mission-control-os/   the source-of-truth architecture package
```

Domain logic never imports UI code.

### How authorization works

The application connects to PostgreSQL directly rather than through PostgREST, so
transactional workflows (inbox conversion, task completion, recovery selection)
run in real transactions. Authorization is unchanged: every request runs inside
`withUser()`, which opens a transaction, sets the session role to `authenticated`,
and sets `request.jwt.claims` to the signed-in user. Those are exactly the
conditions the RLS policies in
`supabase/migrations/20260729001400_rls_and_grants.sql` are written against, so a
query that forgets its `user_id` filter still cannot read another user's rows.
`tests/integration/rls.test.ts` proves this against a real database.

Sensitive tables — `calendar_connections`, `oauth_states`, `audit_events`,
`mutation_history`, `job_runs`, and others — have RLS enabled with **no**
authenticated policy and revoked grants. Only server code using the service role
can touch them, and it always scopes by `user_id` explicitly.

### Identity providers

`AUTH_PROVIDER=supabase` is the deployment default (DECISION_LOG D-005).
`AUTH_PROVIDER=local` is a real scrypt-and-HMAC credential provider for
development and CI, used because the build sandbox cannot reach Supabase Auth
(D-016). Both write to the same `auth.users` table, so nothing downstream
changes. `lib/env.ts` refuses `local` in preview and production.

---

## What this application will not do

- It never writes to Google Calendar without an explicit, reviewed approval, and
  in Phase 1 it does not write to Google Calendar at all.
- It never makes a purchase, booking, grant submission, or trading order.
- It never sends a message on your behalf.
- It never presents sample data as if it were live. Starter data carries a
  visible **Starter** badge and can be removed in one confirmed action.
- It never claims a notification was delivered without provider evidence.
- It does not diagnose medical, structural, or financial conditions. The fitness
  and home modules manage scheduling and follow-ups only.

---

## Documentation

| File | Contents |
|---|---|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | How to deploy to Vercel, and the two secrets you must supply |
| [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) | Per-feature status, credentials required, known limitations |
| [QA_EVIDENCE.md](./QA_EVIDENCE.md) | Exact commands run and their results |
| [CONTROL_INVENTORY.md](./CONTROL_INVENTORY.md) | Every user-facing control, its handler, and its test |
| [AGENT_HANDOFF.md](./AGENT_HANDOFF.md) | Instructions for the next engineer |
| [CHANGELOG.md](./CHANGELOG.md) | What changed |
| [DECISION_LOG.md](./DECISION_LOG.md) | Implementation decisions and spec conflicts |
| `docs/personal-mission-control-os/` | The source-of-truth architecture package |

---

## About the rest of this repository

`nextjs-version/` and `vite-version/` are a pre-existing, unrelated shadcn
dashboard template that was already in this repository; its documentation is in
[TEMPLATE_README.md](./TEMPLATE_README.md). Mission Control does not use them,
and they are excluded from the TypeScript project, ESLint, and the build.

## Licence

See [License.md](./License.md).
