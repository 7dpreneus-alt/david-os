# Changelog

All notable changes to Personal Mission Control OS. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added — Milestone 0: repository, tooling, and guardrails

- Next.js 16.2.12 application at the repository root with React 19.2 and
  TypeScript in strict mode (`noUncheckedIndexedAccess`, `noImplicitOverride`,
  `noFallthroughCasesInSwitch`).
- Environment schema (`lib/env.ts`) validating every variable with Zod. Feature
  flags are strict booleans defaulting to disabled; enabling a feature without
  its credentials fails startup; production rejects an http or localhost
  `APP_URL`; token-encryption keys must decode to exactly 32 bytes.
- `/system/status` showing environment, build SHA, identity provider, database
  reachability, PostgreSQL version, migration count, the number of public tables
  missing RLS, and every feature-flag state — with no secrets.
- Structured JSON logging with correlation IDs and recursive redaction of
  credentials and user content (`lib/logging/logger.ts`).
- Typed API error envelope with the 17 error codes from `API_CONTRACTS.md`, plus
  a route wrapper providing auth, validation, idempotency keys, and request
  logging (`lib/http/`).
- Global error boundary that reports failure truthfully and offers a real retry.
- Security headers: CSP (enforced in production, report-only elsewhere), HSTS,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and
  `frame-ancestors 'none'`.
- Vitest projects for unit and integration tests, Playwright for E2E at desktop,
  360px, and 390px viewports.
- GitHub Actions CI: dependency audit, typecheck, lint, unit tests, migrations,
  integration tests, build, and an E2E job with a PostgreSQL service container.
- `scripts/local-postgres.ts` and `scripts/apply-migrations.ts` so the project
  runs from a fresh clone without Docker.

### Added — Milestone 1: authentication, database, and RLS

- The baseline schema split into 15 ordered migrations following the slice order
  in `AGENT_HANDOFF.md`, with a checksummed migration runner that refuses to
  re-apply a modified migration.
- Row-level security on every public table, `force row level security` so the
  table owner is not exempt, and owner-only policies for user-owned tables.
- Sensitive tables (`calendar_connections`, `calendar_sync_states`,
  `oauth_states`, `audit_events`, `mutation_history`, `job_runs`,
  `notification_deliveries`, `opportunity_source_records`) with RLS enabled, no
  authenticated policy, and revoked grants — reachable only by server code using
  the service role.
- Role-scoped database sessions (`lib/db/session.ts`): `withUser` runs inside a
  transaction as the `authenticated` role with `request.jwt.claims` set, so RLS
  is the authoritative boundary for every application query.
- Two identity providers behind one interface: Supabase Auth (deployment
  default) and a local scrypt/HMAC credential provider for development and CI,
  which the environment schema refuses in preview and production.
- Sign-up, sign-in, sign-out, protected application shell, and responsive
  navigation.
- Settings: profile, timezone, buffers, contingency, capacity, hard load
  ceiling, and the event-description privacy preference.

### Added — Milestone 2: inbox, tasks, and projects

- Inbox capture requiring only text, with rule-based classification presented as
  a suggestion with visible confidence, duplicate candidates as suggestions, and
  a client capture id that makes a replayed submission idempotent.
- Transactional conversion of a capture into a task, project, goal, or note; a
  failed conversion leaves the capture untouched.
- Full task CRUD: create, read, update, complete, minimum-viable complete,
  reopen, archive, soft delete, and restore — with optimistic locking, dependency
  cycle prevention, blocked-state derivation, filters, search, sorting, and
  confirmation on destructive actions.
- Projects with a required desired outcome and derived stalled state via the
  `project_health` security-invoker view.
- Every mutation writes an audit event and a `mutation_history` row carrying an
  inverse operation; task deletion offers an inline undo.
- REST endpoints under `/api/v1` sharing one implementation with the server
  actions behind the UI.

### Added — priority engine and Command Center

- Deterministic priority engine (`domain/priority/engine.ts`) implementing
  `PRIORITY_ENGINE.md`: hard filters, twelve weighted factors, the energy
  compatibility matrix, calendar fit, confidence multiplier, effort and overload
  penalties, user pins, seven-level tie-breaking, and a prose explanation derived
  from the same numbers as the score. It performs no I/O and reads no clock.
- "What should I do now?" and "What should I ignore?", both returning truthful
  empty results.
- Command Center showing real source freshness, at most three dominant outcomes,
  open time, overcommitment in minutes, at-risk work, and real inbox, missed, and
  approval counts.
- Energy check-in that affects recommendations only through a recorded check-in.

### Added — data controls

- Starter-data installation from `STARTER_DATA.json`, labelled `source='starter'`
  everywhere and removable in one confirmed action. Notification channels that do
  not exist are forced off, and the Houston trip keeps null, unverified dates.
- Data export producing real rows with a schema version and an explicit
  exclusion list; OAuth tokens, encrypted trip details, and the audit log are
  never read.

### Fixed

- Command Center no longer queries `calendar_sync_states` as the `authenticated`
  role. That table is intentionally server-only, so the query failed with
  "permission denied" and broke `/today` entirely. Sync freshness is now read
  through the service role with an explicit `user_id` scope. Caught by E2E.
- Priority tie-breaking returned `NaN` when comparing two tasks that both had no
  deadline, producing an unstable sort. A finite sentinel is used instead.
  Caught by a unit test.

### Documented

- `IMPLEMENTATION_STATUS.md`, `QA_EVIDENCE.md`, `CONTROL_INVENTORY.md`,
  `AGENT_HANDOFF.md`, `DECISION_LOG.md` (D-016 to D-025), `README.md`, and
  `.env.example`.
- The published priority weight table sums to 98 rather than the 100 its header
  claims. The values are reproduced verbatim and the discrepancy is recorded as
  D-017 rather than silently corrected.

### Not implemented in this release

Google Calendar integration, day planning, schedule proposals and approvals, the
missed-task recovery engine, the Home/Fitness/Learning/Travel screens, the
notification centre, weekly review, rolling state, account deletion, and the PWA
service worker. Each is listed with its exact status in
`IMPLEMENTATION_STATUS.md`. None of them is represented by a placeholder screen
or a navigation entry.

### Repository note

The pre-existing shadcn dashboard template in `nextjs-version/` and
`vite-version/` is untouched and excluded from the TypeScript project, ESLint,
and the build. Its documentation moved from `README.md` to `TEMPLATE_README.md`.
