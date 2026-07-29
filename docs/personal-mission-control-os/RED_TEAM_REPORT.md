# Independent Red-Team Review

## Review date

2026-07-28

## Scope

Adversarial review of product scope, data ownership, Calendar integration, priority and recovery logic, financial safeguards, Opportunity Radar, notifications, security, mobile use, poor connectivity, QA evidence, and claims of completion.

## Executive result

The original requested vision was viable but too broad to build safely as one release. The revised package is acceptable as an implementation architecture because it makes the daily core a strict Phase 1, moves external writes and notifications to Phase 2, and keeps Opportunity Radar in Phase 3.

Residual status: **Architecture ready for implementation; application not built.**

## Findings and revisions

### RT-01 Unnecessary scope could bury the daily core

**Finding:** Travel deals, grants, local events, AI tools, home deals, notifications, analytics, Calendar writes, and daily planning could become one giant build.

**Risk:** Months of work with no trustworthy daily loop.

**Revision:** Phase gates now prohibit Opportunity Radar before Phase 1 and require write/jobs/notification foundations before Phase 3. Roadmap uses vertical milestones.

### RT-02 Google Calendar could be treated as both task database and event source

**Finding:** Conflating event and task ownership would cause deletion, completion, and flexibility errors.

**Revision:** Data ownership table separates provider events from internal task intent. Links preserve both records.

### RT-03 Incremental sync cursor could advance after partial failure

**Finding:** This would silently miss events.

**Revision:** Cursor is committed only after the final successful page. HTTP 410 triggers controlled full resync. Sync lease and query-shape hash are stored.

### RT-04 Event retries could create duplicates

**Finding:** Title/time dedupe is insufficient, especially after a timeout.

**Revision:** Unique provider identity, stable operation UUID, private provider metadata where supported, database idempotency, and uncertain-outcome reconciliation are required.

### RT-05 Push notifications could be treated as guaranteed delivery

**Finding:** Google push messages may be missed and carry no event body.

**Revision:** Webhooks only mark sync-needed; periodic reconciliation remains mandatory. Channel renewal and overlap are documented.

### RT-06 Timezone model was a high-risk hidden dependency

**Finding:** UTC-only or manual offsets would break all-day events, travel, and DST.

**Revision:** UTC instants plus IANA timezone; all-day dates with exclusive end; dedicated DST test matrix.

### RT-07 Priority scoring risked fake precision

**Finding:** A decimal score could appear more objective than the underlying assumptions.

**Revision:** Hard feasibility filters precede scoring; confidence is explicit; explanations lead the UI; scores are mainly debug/audit data.

### RT-08 “What should I do now?” could recommend impossible work

**Finding:** Ranking without current-window feasibility would create bad advice.

**Revision:** Infeasible items are filtered before ranking. Current window, energy, location, resources, budget, and dependencies are hard inputs.

### RT-09 Missed-task recovery could simply reshuffle overload

**Finding:** Moving a missed task may silently displace another priority.

**Revision:** Every recovery option includes displaced-work analysis and recalculates capacity. Harmful options are excluded or penalized.

### RT-10 Discipline features could become punitive

**Finding:** Streaks and overdue counts can reward fake completion and create guilt.

**Revision:** Recovery rate, estimate accuracy, and meaningful completion are primary. Intentional skip is truthful; minimum completion is separate from full.

### RT-11 Financial recommendations lacked a live account source

**Finding:** The system could imply affordability without bank data.

**Revision:** Phase 1 uses only user-entered budget constraints. Unknown cost is null, not $0. No purchases or submissions are allowed.

### RT-12 Trading study could drift into execution

**Finding:** A study planner might create live-trading pressure.

**Revision:** Starter track is paper-only with a financial firewall. No brokerage integration or live-trade scheduling exists.

### RT-13 Fitness recovery could cross into medical guidance

**Finding:** Generating workouts from injury text could be unsafe.

**Revision:** The engine schedules only user-approved templates and treats health/pain constraints as blockers. No diagnosis or rehabilitation claims.

### RT-14 Second-bedroom optimization could overvalue rental income

**Finding:** Auto-selecting rental use could ignore privacy and lifestyle.

**Revision:** Five options use editable multi-factor weights and remain undecided. User approval and revisit date are required.

### RT-15 Houston dates are inconsistent

**Finding:** Prior context contained conflicting travel dates.

**Revision:** Starter trip has no active dates, is marked unverified, and begins with a confirmation task. No generated deadlines are allowed before confirmation.

### RT-16 Notification design could flood the user

**Finding:** Every risk, recovery, opportunity, and task could become an interruption.

**Revision:** Candidate events pass through policy, dedupe, grouping, quiet hours, and daily caps. Most opportunity content goes to digest.

### RT-17 Opportunity content creates prompt-injection risk

**Finding:** Retrieved pages can contain hostile instructions.

**Revision:** Provider adapters normalize untrusted data, strip active content, restrict model tools to read-only, and prohibit direct side effects. Injection corpus is required.

### RT-18 Broad web scraping was technically and legally unsafe

**Finding:** Sources differ in terms, rate limits, robots rules, and retention.

**Revision:** Source policy prefers official APIs/feeds and requires per-source authorization and terms review. Broad scraping is not approved.

### RT-19 Sensitive tables could be exposed through Supabase client access

**Finding:** Encrypted tokens, job payloads, deliveries, and raw provenance should not be generally queryable.

**Revision:** RLS is enabled, but sensitive tables receive no direct authenticated policies; server services expose safe status read models.

### RT-20 Offline editing scope was underestimated

**Finding:** Full offline CRUD creates merge and stale-approval problems.

**Revision:** Phase 1 offline support is limited to app shell, cached state, and queued rapid capture with idempotency.

### RT-21 Undo could falsely reverse external reality

**Finding:** An internal database rollback cannot guarantee a Google event is restored.

**Revision:** Internal reversible mutations use inverse history. External undo becomes a compensating proposal requiring approval and provider revalidation.

### RT-22 Serverless job execution could be mistaken for durability

**Finding:** Cron and functions can retry, overlap, or terminate.

**Revision:** Vercel Cron only triggers a durable Postgres job ledger with leases, idempotency, bounded retry, and dead-letter visibility.

### RT-23 Completion could be claimed from rendered UI

**Finding:** Coding agents often report screens rather than proof.

**Revision:** Global and phase acceptance gates require persistence, RLS, real provider evidence, automated tests, build, errors, and known limitations.

### RT-24 Poor-connectivity behavior was missing

**Finding:** Mobile capture may occur with unreliable service.

**Revision:** Explicit queued/syncing/saved states, last-state stale banner, and offline E2E tests were added.

### RT-25 Framework security posture needed current patch discipline

**Finding:** React Server Components and Next.js have had material advisories; pinning an old patch would be reckless.

**Revision:** Use patched stable Next.js 16.2 Active LTS line, React 19.2 patched releases, Node 24 LTS, dependency automation, and pre-release advisory review. No preview build.

## Remaining implementation risks

1. Google OAuth verification and provider account configuration may delay production.
2. Vercel and Supabase plan limits may require owner-approved paid tiers.
3. A custom PWA service worker must remain small and heavily tested.
4. Database schema should be split into reviewed migrations; the baseline SQL is not a substitute for migration discipline.
5. Calendar write reconciliation in Phase 2 remains the highest technical risk.
6. Opportunity-source legal and data-quality work may make some requested categories impractical.

## Final red-team gate

Proceed to implementation only under these rules:

- Start at Milestone 0.
- Do not build decorative Command Center data before persistence.
- Do not request Calendar write scope before read sync passes real tests.
- Do not enable external actions without approval and audit.
- Do not start Opportunity Radar before earlier phase gates.
- Report blockers and failed evidence plainly.
