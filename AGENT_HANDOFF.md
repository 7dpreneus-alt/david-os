# Agent Handoff

Written for the next engineer. The architecture package's own handoff is at
`docs/personal-mission-control-os/AGENT_HANDOFF.md` and remains authoritative for
scope; this file records what actually exists.

---

## 1. Repository status

- **Branch:** `claude/mission-control-os-build-zxfcto`
- **Application root:** the repository root (`app/`, `components/`, `domain/`,
  `lib/`, `supabase/`, `tests/`, `scripts/`)
- **Unrelated pre-existing code:** `nextjs-version/` and `vite-version/` are a
  purchased shadcn dashboard template. They are untouched and excluded from the
  TypeScript project, ESLint, and the build. Their README is `TEMPLATE_README.md`.

Read `IMPLEMENTATION_STATUS.md` first. It is the only place that states what is
built, and it is deliberately blunt about what is not.

---

## 2. First commands to run

```bash
corepack enable
pnpm install
cp .env.example .env.local

pnpm db:local:start                     # prints a PostgreSQL URL
# copy that URL into .env.local as DATABASE_URL and LOCAL_DATABASE_URL,
# set AUTH_PROVIDER=local, and generate AUTH_SESSION_SECRET:
#   node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

pnpm db:migrate -- --compat
pnpm typecheck && pnpm lint && pnpm test && pnpm test:integration
pnpm build
pnpm dev
```

Then open http://localhost:3000/system/status and confirm the database is
reachable, 15 migrations are applied, and "Public tables without RLS" is 0.

For Playwright in a sandbox whose pre-installed Chromium build does not match the
`@playwright/test` version, set `E2E_CHROMIUM_PATH=/opt/pw-browsers/chromium`
before `pnpm test:e2e`.

---

## 3. Architecture decisions made during implementation

Recorded in full in `DECISION_LOG.md` (D-016 to D-025). The four that most affect
future work:

- **D-019 — direct PostgreSQL, not PostgREST.** Queries run through `pg` with
  `role = authenticated` and `request.jwt.claims` set per request, which
  reproduces PostgREST's authorization context exactly while allowing real
  multi-statement transactions. RLS remains the authoritative boundary and is
  proven by test. Keep it that way: never query with the service role where the
  user's own role would do.
- **D-016 — two identity providers.** Supabase Auth is the deployment default;
  a local scrypt/HMAC provider exists for development and CI because the build
  sandbox cannot reach `*.supabase.co`. The environment schema refuses `local` in
  preview and production. The Supabase provider is written but **unverified**.
- **D-018 — integration tests instead of pgTAP.** Docker is unavailable, so the
  Supabase local stack cannot run. Database behaviour is tested with real SQL
  against real PostgreSQL as the `authenticated` role.
- **D-017 — the published priority weight table sums to 98, not 100.** The values
  are reproduced verbatim. The architecture owner should confirm which is
  authoritative.

---

## 4. Database

15 migrations in `supabase/migrations/`, applied in filename order by
`scripts/apply-migrations.ts`, which records a SHA-256 checksum per file and
refuses to re-apply a modified migration. **Never edit an applied migration —
add a new one.**

`supabase/local/0000_supabase_compat.sql` is applied only to local and CI
databases (via `--compat`). It creates the `auth` schema, `auth.users`, the
`anon`/`authenticated`/`service_role` roles, and `auth.uid()`. A hosted Supabase
project already has all of it, so applying it there would fail.

Three tables were added beyond `DATABASE_SCHEMA.sql`, each with a recorded
reason: `oauth_states` (D-022), `user_preferences.sync_event_descriptions`
(D-023), and `public.schema_migrations` (the migration ledger).

---

## 5. Environment variables

`.env.example` lists every variable with a comment and no secret-shaped example
values. `lib/env.ts` validates all of them at startup and fails loudly rather
than degrading. Required to run at all: `APP_URL`, `DATABASE_URL`, and either
`AUTH_PROVIDER=local` with `AUTH_SESSION_SECRET`, or `AUTH_PROVIDER=supabase`
with the three Supabase keys.

---

## 6. Tests and their exact results

Commands, output, and timestamps are in `QA_EVIDENCE.md`. Summary at handoff:

| Suite | Command | Result |
|---|---|---|
| Typecheck | `pnpm typecheck` | pass, no output |
| Lint | `pnpm lint` | pass, 0 problems |
| Unit | `pnpm test` | 59 passed / 59 |
| Integration + RLS | `pnpm test:integration` | 30 passed / 30 |
| Build | `pnpm build` | pass, 15 routes |
| E2E | `pnpm test:e2e` | see QA_EVIDENCE.md |

No test was deleted or skipped to produce a green result. One test is
conditionally skipped by design: the horizontal-scroll check does not run on the
desktop project.

---

## 7. Bugs found and fixed during this work

- **Command Center crashed `/today` entirely.** It joined `calendar_sync_states`
  inside a `withUser` transaction, but that table is intentionally server-only
  (RLS with no authenticated policy, grants revoked), so PostgreSQL returned
  "permission denied" and the whole page failed. Sync freshness is now read
  through the service role with an explicit `user_id` scope. Found by E2E.
- **Priority tie-breaking returned `NaN`** when both compared tasks had no
  deadline (`Infinity - Infinity`), producing an unstable sort. Found by a unit
  test asserting stable UUID ordering.

Both are the reason to keep the suites honest rather than convenient.

---

## 8. Security notes for the next audit

Highest-risk areas, in order:

1. **The Supabase auth path has never executed.** `lib/auth/supabase-provider.ts`
   is the deployment default and is entirely unverified. Verify it first.
2. **Auth hardening is missing.** No email verification, no password reset, no
   MFA, and no rate limiting on sign-in or sign-up. `SECURITY_AND_PRIVACY.md` §3
   requires all of these before production.
3. **CSP allows `'unsafe-inline'` for scripts** because Next.js injects inline
   bootstrap scripts. Moving to a nonce-based policy is outstanding.
4. **`withService` bypasses RLS by design.** Every call site must scope by
   `user_id` explicitly. There are currently four; review each one when adding
   more.
5. **Log redaction is deny-by-key-name.** `lib/logging/logger.ts` redacts keys
   matching a pattern list. A new field with an unexpected name could leak. The
   list is unit-tested; extend it when adding fields.
6. **No account deletion.** The flag is false and the UI says so, but the
   requirement remains open.

---

## 9. What to build next, and why

**Google Calendar read integration** (`CALENDAR_INTEGRATION.md`, architecture
Milestone 3). Every remaining planning feature — open windows, day plans,
proposals, conflict detection, and most recovery options — depends on real fixed
commitments. Building planning before calendar means building it against
capacity estimates and then rebuilding it.

It is blocked on credentials (§10), but most of it is not: the OAuth route with
signed single-use state and PKCE, AES-256-GCM token encryption with versioned
keys, the calendar list and selection UI, sync-token handling including the HTTP
410 full-resync path, deleted-event reconciliation, disconnect with token purge,
and the whole mocked-provider test suite can all be built and tested now. Only
the live OAuth handshake needs real credentials.

Two smaller items close real gaps in what already ships and are worth doing
first because they are quick:

1. **Persist priority snapshots.** The engine already produces every field
   `priority_snapshots` needs; nothing writes them. `ACCEPTANCE_CRITERIA.md`
   requires the scores, confidence, engine version, and explanation to persist.
2. **Rate-limit sign-in and sign-up.** Required by `SECURITY_AND_PRIVACY.md` §3
   and currently absent.

---

## 10. Credentials and external setup still required

| What | Needed for | Who provides it |
|---|---|---|
| Google Cloud project with the Calendar API enabled | Calendar milestone | Owner |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | OAuth | Owner |
| Redirect URI registered as `${APP_URL}/api/v1/calendar/google/callback` | OAuth | Owner |
| `GOOGLE_OAUTH_STATE_SECRET` (32+ random bytes) | State signing | Generate |
| `TOKEN_ENCRYPTION_KEY_V1` (base64 of exactly 32 bytes) | Refresh-token encryption | Generate |
| A dedicated Google test calendar/account | Calendar evidence | Owner |
| Supabase project keys and `DATABASE_URL` | Supabase auth verification, deployment | A project exists (`wkgvjnwuuefbhtefjowx`); migrations are not applied to it yet |
| Vercel team, project, domain | Deployment | Owner |

Generate the two secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"  # state secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # encryption key
```

---

## 11. Deployment status

**Nothing is deployed.** No Vercel project was created and no URL is live. The
build succeeds locally and in CI, but a production smoke test, backup drill, and
rollback drill have not been performed.

---

## 12. Prohibited regressions

Do not undo any of the following. Each is enforced by a test, a lint rule, or a
database policy, and each corresponds to an explicit rule in the source
documents.

1. **Never disable or weaken RLS**, and never remove `force row level security`.
   A test asserts that zero public tables lack RLS.
2. **Never give the `authenticated` role a policy on a sensitive table** —
   `calendar_connections`, `calendar_sync_states`, `oauth_states`,
   `audit_events`, `mutation_history`, `job_runs`,
   `notification_deliveries`, `opportunity_source_records`.
3. **Never show more than three dominant outcomes.** Enforced in the engine and
   asserted in E2E (D-015).
4. **Never add a navigation item for a route that is not built** (D-020). An E2E
   test walks every navigation link and requires HTTP 200.
5. **Never present sample data as real.** Starter rows carry `source='starter'`,
   render a Starter badge, and are removable in one confirmed action.
6. **Never claim a Google Calendar write occurred.** Phase 1 does not write to
   Google Calendar; the Settings page and Command Center say so explicitly.
7. **Never record a minimum-viable completion as a full one.**
8. **Never use `any`, and never write a silent `catch`.** Both are lint errors.
9. **Never log user content or credentials.** Redaction is unit-tested; extend
   the pattern list rather than bypassing it.
10. **Never remove the `version` check on task updates.** Lost updates are the
    exact failure the acceptance criteria reject.
11. **Never let a sync cursor advance after a partial failure** when the calendar
    milestone lands.
12. **Never delete or skip a failing test to make a report green.**

---

## 13. What was not implemented

Stated plainly so it cannot be mistaken for done: Google Calendar (all of it),
day planning, schedule proposals, approvals, the missed-task recovery engine, the
Home/Fitness/Learning/Travel screens, the notification centre, weekly review,
rolling state export, account deletion, the PWA service worker and offline
capture queue, undo beyond task delete, goal and life-area management UI, tags,
and Opportunity Radar.

Phase 1 is **not** complete and this build must not be described as such.
