# Implementation Roadmap

## Delivery policy

Build in vertical, testable milestones. A milestone is complete only after its user path works against real persistence, automated tests pass, the production build succeeds, and evidence is recorded. Do not build Phase 3 while Phase 1 defects remain.

## Phase 1 — Functional Daily Core

## Milestone 0: Repository, tooling, and guardrails

**Objective:** Create a reproducible project with no product features yet.

**Build**

- Initialize Next.js 16.2 patched stable, React 19.2, TypeScript strict, pnpm, Node 24.
- Configure ESLint, formatting, typecheck, Vitest, Testing Library, Playwright, Supabase CLI, pgTAP.
- Add environment validation and feature flags.
- Add structured logging, request IDs, global error boundary, health endpoint.
- Add GitHub Actions for install, audit, typecheck, lint, unit, database, build, and Playwright smoke.
- Add security headers in report-only CSP mode for preview.

**Exit evidence**

- Clean install from fresh clone.
- CI passes.
- `/system/status` identifies build SHA, environment, and disabled integrations without exposing secrets.
- Production build passes with no environment fallback to fake values.

## Milestone 1: Authentication, database, and RLS

**Objective:** Prove ownership and persistence before building the dashboard.

**Build**

- Supabase local and hosted projects.
- Apply initial schema migration in reviewed slices.
- Supabase Auth sign-in/out/session refresh.
- Profile and preferences onboarding.
- RLS policies and server access conventions.
- Audit and mutation-history helpers.
- Account export/deletion skeleton behind feature flag; no false success.

**Exit evidence**

- Two-user RLS tests prove isolation for each exposed table class.
- Browser refresh and second device retain profile/preferences.
- Expired session preserves form state and blocks mutation.
- Service-role key absent from browser bundle.

## Milestone 2: Inbox, tasks, projects, and rapid capture

**Objective:** Create the trustworthy execution registry.

**Build**

- Mobile capture composer with offline queue.
- Inbox list and conversion flow.
- Task/project CRUD, version conflict handling, soft delete, completion events.
- Dependencies, definitions of done, minimum viable versions, filters.
- Starter-data installation command, visibly labeled and removable.

**Exit evidence**

- Online and offline capture save once, not twice.
- Failed classification never loses raw text.
- Active project without next action is shown stalled.
- CRUD and reload persistence tests pass.

## Milestone 3: Google OAuth and real read synchronization

**Objective:** Read a real selected Google Calendar reliably.

**Build**

- Google Cloud OAuth configuration documentation.
- Connect/callback/disconnect routes.
- Encrypted refresh-token storage and key-version support.
- Calendar list and selection.
- Initial and incremental sync with leases, pagination, deletion reconciliation, 410 recovery, and sync status UI.

**Exit evidence**

- Real account connection in preview/production-approved domain.
- Repeated sync creates zero duplicate event rows.
- Modify and delete a test event in Google; local mirror reconciles.
- Token invalidation produces reconnect-required state.
- DST and all-day integration tests pass.

## Milestone 4: Manual calendar view and open-window engine

**Objective:** Show fixed commitments and trustworthy available time.

**Build**

- Mobile-first day/agenda view.
- Manual availability rules, buffers, protected rest, and travel assumptions.
- Open-window pure engine.
- Stale sync labels and partial failure behavior.
- Task-event linking without assuming flexibility.

**Exit evidence**

- Fixed events never appear draggable as internal tasks.
- Open-window tests cover overlap, all-day, travel buffer, cross-midnight, DST, and no-calendar mode.
- Calendar failure leaves task registry usable.

## Milestone 5: Priority engine and Command Center

**Objective:** Produce a useful daily operational picture.

**Build**

- Factor normalization, scoring, confidence, overrides, tie-breaking, snapshots.
- Energy check-in and capacity profile.
- Command Center with at most three outcomes, now/ignore recommendations, risks, open time, and sync status.
- Explanation detail.

**Exit evidence**

- Golden test fixtures produce stable rankings.
- Infeasible tasks cannot become “do now.”
- Low-confidence item cap works.
- 360px and 390px mobile critical paths pass.

## Milestone 6: Day planning, proposals, and approvals

**Objective:** Build realistic internal plans without unapproved external writes.

**Build**

- Versioned daily plans and plan items.
- Proposed task placement, splitting, buffers, contingency, and overload warnings.
- Proposal diff UI and approval records.
- Stale proposal detection and conflict recheck.
- “Plan my day,” “Rebuild today,” “Work is running late,” and “Move this deadline.”

**Exit evidence**

- Plan never moves fixed events.
- Overcapacity day returns pushback and alternatives.
- Approval does not falsely claim Google Calendar changed in Phase 1.
- Concurrent task edit creates version conflict rather than lost update.

## Milestone 7: Missed-task recovery core

**Objective:** Make missed commitments recoverable.

**Build**

- Miss detection/confirmation.
- Shared recovery engine and root-cause taxonomy.
- Generic, fitness, laundry, cleaning, learning, packing, admin, shopping, and meal-prep adapters.
- Ranked recovery UI, displacement analysis, selection transaction.

**Exit evidence**

- Every fixture yields feasible options or a truthful no-feasible-option result.
- Selection updates task/recovery/plan atomically.
- Minimum completion is not counted as full.
- Calendar-changing results remain proposals.

## Milestone 8: Home, Fitness, Learning, and Travel workflows

**Objective:** Prove reusable domain specialization.

**Build**

- Room, item, zone, maintenance, and room-use comparison.
- Fitness profile, approved workout templates, sessions, protected windows.
- Learning sessions with objective, practice, evidence, and next action.
- Trips and trip items with unverified-date behavior and masked confirmations.
- Editable Houston starter trip.

**Exit evidence**

- Second-bedroom options remain undecided by default.
- Vague learning objective is rejected or captured for clarification.
- Unverified trip dates cannot create active deadline automation.
- Fitness UI contains no diagnostic claims.

## Milestone 9: Decision log, rolling state, PWA, and data controls

**Objective:** Make context durable and mobile use resilient.

**Build**

- Decision records and outcomes.
- Rolling state JSON/Markdown generator.
- PWA manifest, app shell, cached last daily state, offline capture queue.
- Starter-data removal.
- Export implementation.
- Calendar disconnect.
- Account deletion end-to-end.
- Undo for approved internal mutation classes.

**Exit evidence**

- Rolling state excludes secrets and includes freshness warnings.
- Offline capture reconciles once after reconnect.
- Account deletion test verifies owned rows and tokens are removed.
- External side effects are never silently undone.

## Milestone 10: Production hardening and launch gate

**Objective:** Prove the system works in production.

**Build**

- Error monitoring release integration.
- CSP enforcement.
- Rate limiting.
- Backup, restore, rollback, and incident runbooks.
- Production domain and OAuth verification.
- Performance and accessibility fixes.
- Final red-team rerun.

**Exit evidence**

- Full Phase 1 acceptance suite passes against production-like environment.
- Real production login, task persistence, Calendar sync, plan, recovery, export, disconnect, and deletion evidence.
- No Severity 1 or 2 defects.
- Known limitations published.

## Phase 2 — Intelligence and Automation

### Milestone 11: Calendar write synchronization

- Create/update/move/split/delete through approval execution.
- Provider operation IDs, ETag revalidation, uncertain-outcome reconciliation.
- Compensating proposals for undo.

### Milestone 12: Background sync and job platform

- Vercel Cron protected endpoint.
- Durable job ledger, leases, retry/backoff, dead-letter handling.
- Google push channels and renewal.
- Periodic reconciliation.

### Milestone 13: Notifications

- In-app delivery engine, browser permission and service-worker delivery.
- Optional email adapter after provider decision.
- Quiet hours, grouping, rate caps, snooze, delivery history.

### Milestone 14: Weekly review and capacity learning

- Weekly metrics and pattern analysis.
- Suggested estimate/capacity changes after sufficient evidence.
- User approval for model adjustments.

### Milestone 15: Import/export and analytics hardening

- Supported CSV/JSON imports with dry-run and conflict report.
- Expanded exports.
- Privacy-safe operational analytics.

## Phase 3 — Opportunity Radar

### Milestone 16: Source framework and one approved category

- Source policy registry, adapter contract, provenance, sanitization, verification, dedupe.
- Start with one source/category selected by the owner.

### Milestone 17: Grants

- Official grant sources, eligibility mapping, verification, review workflow.

### Milestone 18: Travel deals

- Authorized provider, total-cost assumptions, short expiration, recheck workflow.

### Milestone 19: Digests and watchlists

- Tiered opportunity notifications, watch updates, source health.

## Sequence rules

- Do not combine Milestones 1–3 into a single giant agent run.
- Do not build the Command Center against sample arrays before persistence.
- Do not enable Calendar write scope until read sync is proven.
- Do not add an LLM dependency before deterministic engines pass tests.
- Do not start Opportunity Radar because the dashboard “looks finished.”
