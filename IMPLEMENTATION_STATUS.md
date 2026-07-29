# Implementation Status

**Last updated:** 2026-07-29
**Branch:** `claude/mission-control-os-build-zxfcto`
**Phase:** 1 — Functional Daily Core (in progress)

Status vocabulary is defined in `docs/personal-mission-control-os/README.md`:

- **Implemented** — code, persistence, tests, error handling, and evidence exist.
- **Implemented but requires credentials** — code and tests exist; owner credentials are still required.
- **Partially implemented** — some of the specified behaviour exists; the gap is stated.
- **Deferred** — approved for a later phase and absent from current production paths.
- **Not started** — no code exists.
- **Blocked** — cannot proceed; the exact blocker is recorded.

A rendered screen is never evidence that a feature is implemented.

---

## 1. Summary

This session delivered the foundation (Milestone 0), authentication and the
database with row-level security (Milestone 1), inbox/task/project CRUD
(Milestone 2), and the deterministic priority engine with a real Command Center
(part of Milestone 5 in the architecture's numbering, pulled forward because it
is pure domain logic with no external dependency).

Google Calendar, planning proposals/approvals, the recovery engine, the
Home/Fitness/Learning/Travel modules, notifications, weekly review, and account
deletion are **not started**. They are listed below with that status rather than
being represented by placeholder screens or navigation entries.

---

## 2. Feature status

### Foundation

| Feature | Status | Notes |
|---|---|---|
| Next.js 16.2.12 + React 19.2 + strict TypeScript | Implemented | `tsc --noEmit` clean; `noUncheckedIndexedAccess` on. |
| ESLint + Prettier | Implemented | Flat config; `no-explicit-any` and a rule banning silent `catch` blocks. |
| Environment schema with safe flag defaults | Implemented | `lib/env.ts`, 14 unit tests. Every feature flag defaults to disabled except starter data. |
| `/system/status` | Implemented | Environment, build SHA, migration count, tables-without-RLS count, flag states. No secrets. |
| Structured JSON logging + correlation IDs | Implemented | `lib/logging/logger.ts`; redaction of tokens, secrets, and user content is unit-tested. |
| Global error boundary | Implemented | `app/global-error.tsx`. |
| Typed API error envelope | Implemented | `lib/http/errors.ts` + `lib/http/route.ts`, 17 error codes per `API_CONTRACTS.md`. |
| Security headers | Implemented | `next.config.ts`; CSP enforced in production, report-only elsewhere. |
| Vitest + Playwright scaffolding | Implemented | Unit, integration, and E2E projects all run. |
| GitHub Actions CI | Implemented | `.github/workflows/ci.yml`: audit, typecheck, lint, unit, database, build, E2E smoke. |
| pgTAP | **Deferred** | Docker is unavailable in the build sandbox, so the Supabase local stack (which ships pgTAP) cannot run. Database assertions are covered by the integration suite instead, running real SQL against real PostgreSQL as the `authenticated` role. See DECISION_LOG D-018. |

### Database

| Feature | Status | Notes |
|---|---|---|
| Schema split into ordered migrations | Implemented | 15 migrations in `supabase/migrations/`, matching the slice order in `AGENT_HANDOFF.md`. |
| Migration runner with checksums | Implemented | `scripts/apply-migrations.ts`; refuses to re-apply a modified migration. |
| RLS on every public table | Implemented | Verified by test: 0 public tables (excluding the migration ledger) lack RLS. |
| Cross-account isolation | Implemented | 9 integration tests prove read/insert/update/delete isolation and that sensitive tables reject the `authenticated` role. |
| Sensitive tables server-only | Implemented | `calendar_connections`, `oauth_states`, `audit_events`, `mutation_history`, `job_runs`, `notification_deliveries`, `opportunity_source_records`, `calendar_sync_states` have RLS with no authenticated policy and revoked grants. |
| Applied to hosted Supabase | Implemented | Applied to project `wkgvjnwuuefbhtefjowx` (us-east-1) through the Supabase management API. Verified there: **54 public tables, 0 without RLS, 0 without FORCE RLS, 181 policies, 0 tables granted to `anon`.** Supabase's own security advisors return no ERROR or WARN — only 8 INFO "RLS enabled, no policy" notices, which are exactly the server-only tables where that is the intended design. See QA_EVIDENCE.md. |

### Authentication

| Feature | Status | Notes |
|---|---|---|
| Sign up / sign in / sign out | Implemented | Real credential verification; sessions are HttpOnly, SameSite=Lax, Secure over HTTPS. |
| Session expiry and rejection of tampered tokens | Implemented | 11 unit tests covering signature, tampering, and expiry. |
| Password hashing | Implemented | scrypt, N=2^16, unique salt per password, parameters embedded in the hash. |
| Supabase Auth provider | **Implemented but requires verification** | `lib/auth/supabase-provider.ts` is complete and is the deployment default. It could not be exercised in this sandbox because the egress policy blocks `*.supabase.co` (403 on CONNECT). It must be verified against a reachable Supabase project before release. |
| Local credential provider | Implemented | `lib/auth/local-provider.ts`, for development and CI only; `lib/env.ts` refuses `AUTH_PROVIDER=local` in preview and production. See DECISION_LOG D-016. |
| Email verification, MFA, password reset, rate limiting | **Not started** | Required by `SECURITY_AND_PRIVACY.md` §3 before production. |

### Inbox, tasks, projects

| Feature | Status | Notes |
|---|---|---|
| Capture with text only | Implemented | Classification is a suggestion with visible confidence; failure never loses the capture. |
| Offline-safe capture idempotency | **Partially implemented** | A client capture id makes a replayed submission return the original row (tested). The service worker that queues captures while offline is **not started**. |
| Duplicate candidates | Implemented | Exact case-insensitive title match, surfaced as a suggestion only. Fuzzy matching is deferred (needs `pg_trgm`). |
| Inbox → task/project/goal/note conversion | Implemented | Transactional; a failed conversion leaves the capture untouched (tested). |
| Task create / read / update / complete / reopen / archive / delete / restore | Implemented | Full E2E coverage. |
| Minimum-viable completion distinct from full | Implemented | Separate `completion_type`; tested. |
| Optimistic locking | Implemented | `PATCH` requires `version`; a stale write returns `VERSION_CONFLICT`. |
| Dependency cycle prevention | Implemented | Recursive reachability check before insert. |
| Blocked / stalled derivation | Implemented | `task_is_blocked()` and the `project_health` view; both security-invoker. |
| Filter / search / sort | Implemented | State lives in the URL; sort columns come from a closed enum. |
| Confirmation on destructive actions | Implemented | Two-step confirm on task and project delete, and on starter-data removal. |
| Undo | **Partially implemented** | Every mutation writes a `mutation_history` row with an inverse operation, and task delete offers an inline undo. The general `POST /mutations/undo-last` endpoint is **not started**. |
| Goals, life areas, routines, tags | **Partially implemented** | Tables, RLS, and starter-data seeding exist; there is no dedicated management UI. Tags are not in the schema at all. |

### Priority engine and Command Center

| Feature | Status | Notes |
|---|---|---|
| Deterministic scoring | Implemented | `domain/priority/engine.ts`, pure function, 28 unit tests. Same inputs always produce the same output. |
| Published weights and formula | Implemented | Weights reproduced verbatim; see DECISION_LOG D-017 for the 98-vs-100 discrepancy in the source table. |
| Hard filters | Implemented | Infeasible tasks can never rank as do-now (tested). |
| Confidence multiplier, effort and overload penalties, user pin | Implemented | Each is unit-tested against the published formula. |
| Deterministic tie-breaking | Implemented | Seven-level tie-break ending in stable UUID order. |
| Explanations | Implemented | Every score carries its component breakdown and prose derived from those numbers. |
| At most three dominant outcomes | Implemented | Enforced in the engine and asserted in E2E. |
| "What should I do now?" / "What should I ignore?" | Implemented | Truthful empty results when nothing qualifies. |
| Overcommitment warning | Implemented | Quantifies the excess in minutes. |
| Energy check-in | Implemented | Affects recommendations only through a recorded check-in. |
| Priority snapshot persistence | **Not started** | The `priority_snapshots` table exists and the engine emits everything needed, but scores are computed per request and not yet stored. `ACCEPTANCE_CRITERIA.md` requires persistence. |
| Open windows from real calendar data | **Not started** | Open time is currently derived from capacity settings and the remaining hours in the day. The UI states this explicitly rather than implying calendar awareness. |

### Google Calendar

| Feature | Status | Notes |
|---|---|---|
| Everything in `CALENDAR_INTEGRATION.md` | **Not started** | Tables, RLS, the `oauth_states` table, and `FEATURE_CALENDAR_READ` validation exist. No OAuth route, no sync, no token encryption code. The Settings page says "Not connected" and states plainly that the application has never written to Google Calendar. Requires `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_STATE_SECRET`, and `TOKEN_ENCRYPTION_KEY_V1`. |

### Planning, approvals, recovery

| Feature | Status | Notes |
|---|---|---|
| Day plan generation and versioning | **Not started** | Tables exist. |
| Schedule proposals and approvals | **Not started** | Tables exist; the Command Center shows the real pending count, which is zero. |
| Missed-commitment detection and recovery engine | **Not started** | Tables exist; the Command Center shows the real open-miss count and links to this file for status. |

### Domain modules

| Feature | Status | Notes |
|---|---|---|
| Home, Fitness, Learning, Travel | **Partially implemented** | Full schema, RLS, and starter data (rooms, cleaning zones, a monitoring-only maintenance record, room-use options, workout templates, a learning session, and the Houston trip with unverified dates). No UI. |
| Decisions, weekly review, rolling state | **Not started** | Tables exist. |
| Data export | Implemented | Real rows, schema version, explicit exclusion list; secrets and encrypted blobs are never read. E2E asserts the downloaded file. |
| Starter data install and removal | Implemented | Labelled everywhere, removable in one confirmed action. |
| Account deletion | **Not started** | `FEATURE_ACCOUNT_DELETION` is false and the Settings page says the feature is not implemented rather than showing a control that would not delete data. |

### Notifications

| Feature | Status | Notes |
|---|---|---|
| In-app centre, preferences, quiet hours, dedupe, snooze, delivery log | **Not started** | Tables exist. Starter data explicitly forces browser and email channels to disabled so no record implies a delivery capability that does not exist. |

### Opportunity Radar

| Feature | Status | Notes |
|---|---|---|
| Everything | **Deferred to Phase 3** | Schema exists with every source defaulting to unauthorized and disabled. `FEATURE_OPPORTUNITY_RADAR` is false. No ingestion code exists, and no navigation entry references it. |

---

## 3. Credentials still required

| Credential | Needed for | Consequence while missing |
|---|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET` | Calendar connection | Calendar milestone cannot start. |
| `GOOGLE_OAUTH_STATE_SECRET` | OAuth state signing | Same. |
| `TOKEN_ENCRYPTION_KEY_V1` (32 random bytes, base64) | Refresh-token encryption | Same. |
| A reachable Supabase project (URL, publishable key, service-role key, `DATABASE_URL`) | Supabase Auth verification and deployment | The Supabase auth provider is unverified; see §4. |
| Vercel team/project/domain | Deployment | Nothing is deployed. |
| Google test calendar/account | Calendar evidence | No real calendar evidence can be produced. |

---

## 4. Known limitations and blockers

1. **The Supabase auth path is unverified.** The build sandbox's egress policy
   returns 403 on `CONNECT *.supabase.co:443`, so the application could not reach
   the Supabase Auth or REST endpoints. The migrations were still applied to the
   real project through the Supabase management API, and all runtime verification
   used local PostgreSQL with the identical schema, roles, and RLS policies.
   Sign-up, sign-in, and session handling must be re-verified against a reachable
   Supabase project before release.
2. **No deployment exists.** No Vercel project was created and no URL is live.
3. **pgTAP is not used.** Docker is unavailable, so `supabase start` cannot run.
   Database behaviour is covered by the integration suite instead.
4. **Open time is not calendar-aware.** It is derived from capacity settings, and
   the UI says so.
5. **Priority snapshots are not persisted.**
6. **No service worker / PWA.** Offline capture queuing is not implemented.
7. **Auth hardening is incomplete**: no email verification, password reset, MFA,
   or rate limiting.
8. **The desktop navigation lists six destinations, not twelve.** Only routes
   that are built appear; adding the rest before they work would create dead
   navigation items.

---

## 5. Next milestone

**Google Calendar read integration** (`AGENT_HANDOFF.md` Milestone 3), because
every remaining planning feature depends on real fixed commitments and real open
windows. It cannot be completed without the Google credentials listed in §3, but
the full integration path, token encryption, mocked provider tests, and the
disconnected state can be built and tested before those arrive.

Before that, two smaller items close real gaps in what already ships:
persisting priority snapshots, and a rate limit on sign-in.
