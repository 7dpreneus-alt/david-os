# Implementation Decision Log

Architecture decisions D-001 to D-015 live in
`docs/personal-mission-control-os/DECISION_LOG.md` and are not repeated here.
This file records decisions made during implementation, including every place
the source documents conflicted with each other or with reality.

Template:

```text
ID:
Date:
Status: proposed | accepted | superseded | rejected
Decision:
Context:
Alternatives considered:
Reason:
Expected outcome:
Revisit trigger:
Related files:
```

---

## D-016 A local credential provider for development and CI

**Date:** 2026-07-29
**Status:** accepted

**Decision:** Ship two identity providers behind one interface. `AUTH_PROVIDER=supabase`
uses Supabase Auth and is the deployment default. `AUTH_PROVIDER=local` verifies
a scrypt password hash and issues an HMAC-signed, HttpOnly, SameSite=Lax cookie.
Both write to the same `auth.users` table. `lib/env.ts` rejects `local` in
preview and production.

**Context:** D-005 selects Supabase Auth. The build environment's egress policy
returns HTTP 403 on `CONNECT *.supabase.co:443`, and Docker is unavailable, so
neither the hosted Supabase Auth service nor the local Supabase stack (which
bundles GoTrue) could be reached. Without a working identity provider, no
authenticated behaviour could be built or tested at all.

**Alternatives considered:**

1. Build the Supabase provider only and ship it untested. Rejected: an entire
   milestone would rest on code that had never run, and every downstream feature
   would be equally unverified.
2. Stub authentication with a hard-coded user. Rejected outright — the brief
   prohibits fake login, and a stub would not exercise sessions, cookies, or the
   `auth.users` foreign keys that RLS depends on.
3. Substitute a different hosted identity vendor. Rejected: it adds a vendor and
   contradicts D-005 for a reason that is environmental, not architectural.

**Reason:** The local provider is a real credential check, not a bypass. Because
both providers produce the same user record in the same table, everything
downstream — RLS, repositories, routes, tests — is provider-agnostic, so
verification done through the local provider is meaningful evidence about the
shared code. The Supabase provider remains the deployment path and is written in
full.

**Expected outcome:** Authentication, sessions, and RLS are genuinely verified in
this environment; the Supabase-specific 120 lines remain the only unverified part
of the auth stack.

**Revisit trigger:** As soon as a reachable Supabase project is available, run
the E2E suite with `AUTH_PROVIDER=supabase` and record the result. The local
provider may then be restricted to CI only.

**Related files:** `lib/auth/*`, `lib/env.ts`, `tests/unit/auth.test.ts`

---

## D-017 The published priority weight table sums to 98, not 100

**Date:** 2026-07-29
**Status:** accepted

**Decision:** Reproduce the twelve factor weights from `PRIORITY_ENGINE.md` §4
exactly as published and leave the formula unchanged, even though the table's
own header says the weights total 100 while the listed values total 98.

**Context:** 15 + 14 + 12 + 8 + 10 + 8 + 4 + 5 + 8 + 5 + 6 + 3 = 98. A unit test
written against the documented claim caught this on the first run.

**Alternatives considered:**

1. Normalize by 100/98 so the maximum base score is 100. Rejected: it changes the
   documented formula `base_score = sum(weight_i * normalized_factor_i / 100)`.
2. Add the missing 2 points to some factor. Rejected: any choice of factor would
   be an unreviewed change to the product's priority semantics.

**Reason:** The weights define *relative* importance, which is what ranking
depends on, and relative importance is unaffected. Silently rescaling or
reallocating would be an improvisation on a source-of-truth document.

**Expected outcome:** Ranking behaves exactly as specified. The practical
maximum base score is 98 rather than 100 before overrides. `final_score` is still
clamped to 0–100 and still satisfies the database constraint.

**Revisit trigger:** The architecture owner should confirm whether the header or
the values are authoritative. If the intent was a 100-point scale, one factor's
weight needs an explicit +2 and this entry should be superseded.

**Related files:** `domain/priority/engine.ts`, `tests/unit/priority-engine.test.ts`

---

## D-018 Integration tests against real PostgreSQL instead of pgTAP

**Date:** 2026-07-29
**Status:** accepted

**Decision:** Cover database behaviour — RLS isolation, constraints, triggers,
transactional workflows — with a Vitest integration suite that executes real SQL
against a real PostgreSQL 16 server as the `authenticated` role, rather than with
pgTAP.

**Context:** The approved stack lists pgTAP, which the architecture expects to
run via `supabase test db`. That requires the Supabase local stack, which
requires Docker. The Docker daemon is not available in this environment.

**Alternatives considered:**

1. Skip database testing until Docker is available. Rejected: RLS is the primary
   security control and shipping it unverified is not acceptable.
2. Compile and install pgTAP from source. Rejected: it adds a build dependency
   and a bespoke CI path for a benefit the integration suite already delivers.

**Reason:** What matters is that the assertions run against the real schema under
the real role with the real policies. The integration suite does that, and it can
call the application's own repository functions, so it tests the shipped code
path rather than SQL written twice.

**Expected outcome:** 30 integration tests, including 9 dedicated RLS proofs, run
in CI against a PostgreSQL 16 service container.

**Revisit trigger:** If Docker becomes available, add pgTAP for schema-level
assertions that are awkward from the application layer. The integration suite
should stay regardless.

**Related files:** `tests/integration/*`, `.github/workflows/ci.yml`

---

## D-019 Direct PostgreSQL access rather than PostgREST

**Date:** 2026-07-29
**Status:** accepted

**Decision:** Query PostgreSQL directly with `pg`, setting `role = authenticated`
and `request.jwt.claims` per request, instead of going through Supabase's
PostgREST endpoint via `supabase-js`.

**Context:** `API_CONTRACTS.md` §5 requires that inbox conversion, recovery
selection, approval decisions, task completion, and undo be transactional.
PostgREST cannot span multiple statements in one transaction; doing so requires
moving each workflow into a PL/pgSQL function.

**Alternatives considered:**

1. `supabase-js` plus PL/pgSQL functions for every transactional workflow.
   Rejected: it splits domain logic between TypeScript and SQL, makes the
   priority and recovery engines much harder to unit test, and moves validation
   away from Zod.
2. `supabase-js` with best-effort multi-request writes. Rejected: it cannot
   satisfy the transactional requirement, and partial writes are exactly the
   class of bug the acceptance criteria reject.

**Reason:** Setting the role and JWT claims reproduces PostgREST's authorization
context exactly, so RLS remains the authoritative boundary — this is verified by
test, including a proof that a forged `user_id` insert is rejected. In exchange
we get real transactions and one implementation of each mutation shared by the
REST routes and the server actions.

**Expected outcome:** Same authorization guarantees, real transactions, and the
same code path in local development and in deployment.

**Revisit trigger:** If Supabase adds transactional multi-statement support, or
if connection-pool limits become a problem on serverless.

**Related files:** `lib/db/session.ts`, `lib/db/pool.ts`, `tests/integration/rls.test.ts`

---

## D-020 Navigation lists only routes that are built

**Date:** 2026-07-29
**Status:** accepted

**Decision:** The desktop navigation shows six destinations (Today, Inbox, Tasks,
Projects, Settings, System status) instead of the twelve in
`INFORMATION_ARCHITECTURE.md`. Each remaining destination is added when its module
lands.

**Context:** The architecture defines twelve destinations. Seven of them
(Plan, Approvals, Home, Fitness, Learning, Travel, Decisions) have schema and RLS
but no working screen in this build.

**Alternatives considered:** Ship all twelve with "coming soon" pages. Rejected
explicitly — `AGENT_HANDOFF.md` prohibits dead buttons and unimplemented
navigation items, and the brief prohibits "coming soon" pages inside the accepted
Phase 1 navigation.

**Reason:** A navigation item that leads nowhere is a false claim about the
product's capability.

**Expected outcome:** Every visible destination returns HTTP 200 and renders real
data. An E2E test walks every navigation link and asserts this.

**Revisit trigger:** Each module landing restores its destination.

**Related files:** `components/app-nav.tsx`, `tests/e2e/core-journey.spec.ts`

---

## D-021 Starter data never enables a channel the product cannot deliver

**Date:** 2026-07-29
**Status:** accepted

**Decision:** When installing `STARTER_DATA.json`, force `browser_enabled` and
`email_enabled` to false on every `notification_preferences` row regardless of the
file's contents, and leave the Houston trip's dates null with
`date_verification = 'unverified'`.

**Context:** Starter data describes notification categories, and Phase 1 has no
browser or email delivery. A preference row saying a channel is enabled would
imply a capability that does not exist.

**Reason:** `ACCEPTANCE_CRITERIA.md` rejects any notification that claims delivery
without provider evidence, and D-011 requires the Houston dates to stay
unverified so no false deadline can be generated.

**Expected outcome:** No starter record implies an unimplemented capability.

**Related files:** `domain/starter/install.ts`

---

## D-022 `oauth_states` added to the schema

**Date:** 2026-07-29
**Status:** accepted

**Decision:** Add a table not present in `DATABASE_SCHEMA.sql`, storing a hash of
each OAuth `state` value, the encrypted PKCE code verifier, the return path, an
expiry, and a consumed-at timestamp. It has RLS enabled with no authenticated
policy and all grants revoked.

**Context:** `CALENDAR_INTEGRATION.md` §2 and `SECURITY_AND_PRIVACY.md` §12
require single-use OAuth state bound to the user, plus PKCE. The baseline schema
has nowhere to persist either.

**Reason:** A cookie alone cannot prove single use across a server restart or a
replayed callback. Storing a hash rather than the value means a database reader
cannot replay a live state.

**Expected outcome:** The callback route can reject reuse and expiry when the
Calendar milestone is built.

**Related files:** `supabase/migrations/20260729000500_calendar.sql`

---

## D-023 `user_preferences.sync_event_descriptions` added

**Date:** 2026-07-29
**Status:** accepted

**Decision:** Add a boolean column, defaulting to false, controlling whether
calendar event descriptions are mirrored.

**Context:** `SECURITY_AND_PRIVACY.md` §7 requires "a privacy setting to omit
event descriptions from the mirror" and §14 lists a description-sync preference,
but the baseline schema has no column for it.

**Reason:** Defaulting to false is the data-minimizing choice; the user opts in.

**Related files:** `supabase/migrations/20260729000200_profiles_preferences_life_areas.sql`,
`app/(product)/settings/page.tsx`

---

## D-024 `force row level security` on every protected table

**Date:** 2026-07-29
**Status:** accepted

**Decision:** Apply `force row level security` in addition to
`enable row level security`.

**Context:** `enable` alone does not apply policies to the table owner. The
application's migration and admin connections authenticate as the owning role.

**Reason:** Defence in depth: a query that forgets to switch roles is then still
subject to policy, instead of silently seeing every row. `service_role` retains
`BYPASSRLS`, so the deliberate server-side path is unaffected — which the
integration tests confirm.

**Related files:** `supabase/migrations/20260729001400_rls_and_grants.sql`

---

## D-025 Duplicate detection uses exact title matching

**Date:** 2026-07-29
**Status:** accepted

**Decision:** Suggest duplicate candidates by case-insensitive exact title match
rather than trigram similarity.

**Context:** `ACCEPTANCE_CRITERIA.md` requires duplicate candidates to be
suggestions. Fuzzy matching needs the `pg_trgm` extension.

**Reason:** Adding an extension for a Phase 1 suggestion is not justified yet, and
a failed `similarity()` call would have to be swallowed — which is prohibited.
Exact matching is honest about what it detects.

**Expected outcome:** Fewer suggestions, no false confidence, no swallowed errors.

**Revisit trigger:** Enable `pg_trgm` when fuzzy matching is worth the dependency.

**Related files:** `domain/tasks/repository.ts`
