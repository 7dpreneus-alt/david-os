# QA Evidence

Every result below was produced by running the stated command in this
repository. Nothing here is inferred, and no test was deleted, skipped, or
weakened to produce a passing result.

**Environment**

| | |
|---|---|
| Date | 2026-07-29 |
| Branch | `claude/mission-control-os-build-zxfcto` |
| Node | v22.22.2 |
| pnpm | 10.20.0 |
| Next.js | 16.2.12 |
| PostgreSQL (local) | 16 |
| Supabase project | `wkgvjnwuuefbhtefjowx` (us-east-1) |
| Docker | **unavailable** — see DECISION_LOG D-018 |
| Egress to `*.supabase.co` | **blocked by policy (HTTP 403 on CONNECT)** — see §7 |

---

## 1. Typecheck

```console
$ pnpm typecheck
$ echo $?
0
```

`tsc --noEmit` with `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`,
and `noFallthroughCasesInSwitch`. No output means no errors.

## 2. Lint

```console
$ pnpm lint
$ echo $?
0
```

Zero errors and zero warnings across `app`, `components`, `domain`, `lib`,
`tests`, and `scripts`, including the project rules banning `any` and silent
`catch` blocks.

Two lint findings were fixed rather than suppressed during this work:

- `react-hooks/set-state-in-effect` in `task-row.tsx` — the editor's open state
  is now derived from `task.version` instead of being set inside an effect.
- A bare `catch {}` in `lib/env.ts`.

## 3. Unit tests

```console
$ pnpm test

 ✓ |unit| tests/unit/env.test.ts (14 tests) 20ms
 ✓ |unit| tests/unit/logging.test.ts (6 tests) 9ms
 ✓ |unit| tests/unit/auth.test.ts (11 tests) 2168ms
 ✓ |unit| tests/unit/priority-engine.test.ts (28 tests) 24ms

 Test Files  4 passed (4)
      Tests  59 passed (59)
   Duration  3.42s
```

What they cover:

| File | Count | Covers |
|---|---:|---|
| `priority-engine.test.ts` | 28 | Published weights, deadline normalization including the unverified-date cap at 40, the energy matrix cell by cell, calendar fit, every hard filter, the exact formula recomputed from component scores, user pins and pin expiry, determinism across repeated runs, stable UUID tie-breaking, the three-outcome cap, the low-confidence exclusion, the overload penalty ceiling, explanation contents, engine version stamping, and that ignore candidates never include consequential work |
| `auth.test.ts` | 11 | scrypt verification, plaintext never stored, unique salt per hash, malformed-hash rejection, minimum length, session round-trip, wrong-secret rejection, tampered-payload rejection, expiry, malformed tokens |
| `env.test.ts` | 14 | Flag defaults, strict-boolean parsing (`"1"` and `"yes"` rejected), startup failure without `DATABASE_URL`, calendar credentials required when the flag is on, redirect-URI equality, 32-byte key validation, write-requires-read, production https/localhost rules, `AUTH_PROVIDER=local` refused in preview and production, Supabase keys required, publishable ≠ service-role, and that no credential has a fake default |
| `logging.test.ts` | 6 | Redaction of credential-shaped keys at depth and inside arrays, redaction of user-content fields, non-sensitive scalars preserved, one JSON line per record, child-logger bindings redacted, level threshold |

### Two bugs found by these tests

1. **Priority tie-breaking returned `NaN`.** Comparing two tasks that both had no
   deadline computed `Infinity - Infinity`, which made the sort
   implementation-defined. Fixed with a finite sentinel.
2. **The published weight table sums to 98, not the 100 its header claims.** The
   values are reproduced verbatim and the discrepancy is recorded as
   DECISION_LOG D-017 rather than silently corrected.

## 4. Integration and RLS tests

```console
$ pnpm test:integration

 ✓ |integration| tests/integration/task-crud.test.ts (21 tests) 344ms
 ✓ |integration| tests/integration/rls.test.ts (9 tests) 122ms

 Test Files  2 passed (2)
      Tests  30 passed (30)
   Duration  976ms
```

These run against a real PostgreSQL 16 server with the full migration set
applied, as the `authenticated` role with `request.jwt.claims` set — the same
context Supabase applies. No SQL is mocked.

**RLS proofs (`rls.test.ts`)**

| Assertion | Result |
|---|---|
| Every public table except the migration ledger has RLS enabled | 0 tables without RLS |
| The `anon` role has no privileges on user data | 0 tables granted |
| User B cannot read user A's rows | B saw 0 rows; A saw its own |
| User B cannot insert a row owned by user A | rejected: `new row violates row-level security policy` |
| User B cannot update or delete user A's rows | 0 rows affected; A's data unchanged |
| Profiles are isolated by `id` | B saw only its own profile |
| `calendar_connections`, `audit_events`, `oauth_states` are unreadable by `authenticated` | rejected: `permission denied` |
| `approvals` is readable by its owner but not writable | select succeeded; insert rejected |
| Data written in one session is readable in a later one | verified |

**CRUD and transaction proofs (`task-crud.test.ts`)** — 21 tests covering
creation from a title alone with the expected clarification warnings and reduced
confidence, full-specification confidence of 1.0, cross-user read isolation,
version bumping, `VERSION_CONFLICT` on a stale write, completion with its
completion event, minimum-viable completion recorded distinctly from full,
reopen, soft delete and restore, dependency cycle rejection, blocked-state
derivation and clearing, filtering and search, deterministic sort order with a
working direction flag, project stalled-state derivation, cross-user project
rejection, verbatim capture storage with a classification suggestion,
idempotent replay of a client capture id, transactional conversion, an untouched
capture after a failed conversion, and the audit plus inverse-operation records
written for a creation.

### Test corrected during this work

`sorts deterministically` originally compared PostgreSQL's ordering against
JavaScript's `localeCompare`, which use different collations. The database
ordering was correct; the assertion was wrong. It now asserts what matters —
that the order is stable across identical queries and that the direction flag
genuinely reverses it.

## 5. Production build

```console
$ pnpm build

▲ Next.js 16.2.12 (Turbopack)
✓ Compiled successfully in 5.7s
✓ Generating static pages (5/5)

Route (app)
┌ ƒ /                          ├ ƒ /projects
├ ○ /_not-found                ├ ƒ /settings
├ ƒ /api/v1/health             ├ ƒ /signup
├ ƒ /api/v1/inbox              ├ ƒ /system/status
├ ƒ /api/v1/tasks              ├ ƒ /tasks
├ ƒ /api/v1/tasks/[id]         └ ƒ /today
├ ƒ /api/v1/tasks/[id]/complete
├ ƒ /inbox
├ ƒ /login
```

TypeScript errors fail the build (`ignoreBuildErrors: false`).

## 6. Database migrations

### Local PostgreSQL 16

```console
$ pnpm db:migrate -- --compat
applied supabase/local/0000_supabase_compat.sql
applied 20260729000100_extensions_and_enums.sql
applied 20260729000200_profiles_preferences_life_areas.sql
applied 20260729000300_inbox_goals_projects_tasks.sql
applied 20260729000400_availability_energy_capacity.sql
applied 20260729000500_calendar.sql
applied 20260729000600_plans_priorities_proposals_approvals.sql
applied 20260729000700_missed_and_recovery.sql
applied 20260729000800_home.sql
applied 20260729000900_fitness_and_learning.sql
applied 20260729001000_travel.sql
applied 20260729001100_opportunities.sql
applied 20260729001200_notifications_reviews_decisions_audit.sql
applied 20260729001300_indexes_and_triggers.sql
applied 20260729001400_rls_and_grants.sql
applied 20260729001500_safe_read_views.sql
Applied 15 migration(s).
```

Re-running is a no-op, and the runner refuses to re-apply a modified migration.

### Hosted Supabase project `wkgvjnwuuefbhtefjowx`

The same schema was applied through the Supabase management API and verified in
place:

```sql
select
  (select count(*) from pg_tables where schemaname='public') as public_tables,
  ... as tables_without_rls,
  ... as tables_without_force_rls,
  (select count(*) from pg_policies where schemaname='public') as policies,
  ... as tables_granted_to_anon;
```

| Metric | Value |
|---|---:|
| Public tables | 54 |
| Tables without RLS | **0** |
| Tables without FORCE RLS | **0** |
| RLS policies | 181 |
| Tables granted to `anon` | **0** |

Supabase's own security advisors (`get_advisors`, type `security`):

- **0 ERROR**, **0 WARN**.
- 8 INFO notices, all `rls_enabled_no_policy`, on `audit_events`,
  `calendar_connections`, `calendar_sync_states`, `job_runs`,
  `mutation_history`, `notification_deliveries`, `oauth_states`, and
  `opportunity_source_records`.

Those eight are the intended design, not an oversight: `DATABASE_SCHEMA.sql`
and `SECURITY_AND_PRIVACY.md` §4 require these tables to have RLS enabled with
no authenticated policy so that only server code using the service role can
reach them. The integration suite asserts that the `authenticated` role is
refused on them.

## 7. End-to-end tests

Run with Playwright against a production build and the real database, across
three viewports: desktop, 360px, and 390px. Results are in §8.

Coverage: unauthenticated redirect; sign-up, sign-out, and sign-in with data
surviving the cycle; wrong-credential error with no session; short-password
rejection; the full task lifecycle (create, low-confidence badge, edit, complete,
reopen, confirm-then-delete); inline validation that prevents creation; search
and filter narrowing; capture and conversion; the three-outcome cap with real
scored tasks; the energy check-in; project stalled-state; preference
persistence across reload; starter-data install and removal; the truthful
Calendar and account-deletion statements; a real export download whose contents
are parsed and asserted; sign-out reachable at every viewport; no horizontal
scrolling at mobile widths; navigation `aria-current`; every navigation link
returning HTTP 200; every form control having an accessible name; the health
endpoint; `/system/status` reporting zero tables without RLS; and the typed
`UNAUTHENTICATED` error envelope.

### Bugs found by these tests

1. **`/today` failed completely.** The Command Center joined
   `calendar_sync_states` inside a `withUser` transaction. That table is
   deliberately server-only, so PostgreSQL returned
   `permission denied for table calendar_sync_states` and the entire page fell
   through to the error boundary. Sync freshness is now read through the service
   role with an explicit `user_id` scope.
2. **Mobile users could not sign out.** The only sign-out control lived in the
   desktop sidebar, which is hidden below the `md` breakpoint. A Session panel
   was added to Settings, which is in the mobile navigation.
3. **The data export could be cancelled before it saved.** The object URL was
   revoked in the same tick as the anchor click. Revocation is now deferred.
4. **Two labels shared the accessible name "Project"** — the composer's project
   select and the filter's. The filter controls are now "Filter by project" and
   "Filter by status", which is clearer for screen-reader users as well.

## 8. End-to-end results

Full suite, 24 tests × 3 viewports (desktop, 360px, 390px) = 72 runs:

```console
$ pnpm test:e2e

  10 failed
  1 skipped
  61 passed (2.3m)
```

The 1 skip is by design: the horizontal-scroll check does not apply to the
desktop project.

The 10 failures were **6 distinct tests** repeated across viewports, and every
one was a defect in the test's own locator, not in the application. The error
messages show the application rendering the correct element in each case:

| Test | Cause | Fix |
|---|---|---|
| wrong credentials…; sign up, sign out…; sign out reachable at every viewport | After the mobile sign-out fix, `getByRole('button', {name: 'Sign out'})` matched both the sidebar's and Settings' buttons | Scope to `#main` |
| shows real data and never more than three dominant outcomes | `/Google Calendar is not connected/` matched both the source-status row and the open-time caption | `.first()` |
| search and status filters narrow the list; starter data installs… | The `taskList()` helper took the **last** `<ul>` on the page, which on mobile is the bottom navigation | Scope to `#main` |

After these locator fixes, all six were re-run across all three viewports:

```console
$ pnpm test:e2e -- -g "wrong credentials|sign up, sign out|three dominant outcomes|reachable at every viewport|starter data installs|search and status filters"

  18 passed (32.3s)
```

18 = 6 tests × 3 viewports. All green.

**Caveat, stated plainly:** the 61/72 figure is from the run *before* those
locator fixes. The fixes were verified by the targeted re-run above rather than
by a second full-suite run. The next agent should run `pnpm test:e2e` once to
confirm 71 passed / 1 skipped end to end, and should treat that as the number of
record until then.

## 9. Dependency audit

```console
$ pnpm audit --audit-level high --prod
No known vulnerabilities found
```

Five advisories were present on the first audit and were resolved by pinning
`postcss` to `^8.5.18` and `sharp` to `^0.35.0` through pnpm overrides, and by
removing the unused `@eslint/eslintrc` dependency.

One advisory remains in **development** dependencies only:
`eslint > minimatch@3 > brace-expansion` (GHSA-mh99-v99m-4gvg, DoS via
unbounded expansion). It has no compatible fix — the patched `brace-expansion`
major changed its export shape and breaks `minimatch@3`, which ESLint pins.
Attempting the override produced `TypeError: expand is not a function` and was
reverted. It is not reachable from any runtime code path. CI therefore gates on
`--prod`; `pnpm audit:all` shows the full set including this one.

## 10. What has NOT been verified

Stated explicitly so this document is not mistaken for a release sign-off.

1. **Supabase Auth has never executed.** The sandbox's egress policy returns
   HTTP 403 on `CONNECT *.supabase.co:443`, recorded by the proxy as a policy
   denial. `lib/auth/supabase-provider.ts` is the deployment default and is
   entirely unverified. All authentication verification above used the local
   credential provider (DECISION_LOG D-016), which shares every downstream code
   path but not the Supabase-specific calls. Schema work on the Supabase project
   went through the management API, which is a different channel.
2. **No deployment exists.** No Vercel project, no live URL, no production smoke
   test.
3. **No Google Calendar evidence of any kind**, because the integration is not
   built. No OAuth, no sync, no token encryption.
4. **No pgTAP**, because Docker is unavailable (D-018).
5. **No accessibility audit tool** (axe or similar) was run. The E2E suite checks
   accessible names, focus-visible styling, `aria-current`, and mobile overflow,
   which is a floor rather than an audit.
6. **No load, performance, or backup/restore drill.**
7. **Account deletion is untested because it does not exist.**
