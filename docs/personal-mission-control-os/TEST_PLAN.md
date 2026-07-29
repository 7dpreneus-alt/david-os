# Test Plan

## 1. Test strategy

Test the domain rules below the UI, authorization in the database, provider behavior at the integration boundary, and critical user paths in real browsers. Mocks are useful for failure simulation but cannot be the only proof of Google Calendar or production persistence.

## 2. Test layers

### Unit tests — Vitest

Targets:

- Priority factor normalization and tie-breaking
- Capacity and contingency calculations
- Open-window interval arithmetic
- Recovery option generation and ranking
- Timezone conversions and all-day rules
- Duplicate keys and hashes
- Notification policy, quiet hours, and grouping
- Rolling-state redaction
- Environment validation
- Command input schemas

Pure engines use frozen fixture snapshots and deterministic clocks.

### Component tests — Testing Library

Targets:

- Capture states: saving, queued, saved, failed
- Task form field errors and retained values
- Sync indicator states
- Proposal diff and disabled approval during revalidation
- Recovery option details
- Stale-data banners
- Mobile navigation
- Destructive confirmation and undo toast

Test accessible names and keyboard behavior, not internal implementation.

### Database tests — pgTAP

Targets:

- Required tables, columns, constraints, indexes
- RLS positive and negative cases
- Cross-user select/insert/update/delete denial
- Sensitive tables inaccessible to authenticated direct clients
- Unique external-event identity
- Dependency self-link prohibition
- One recovery selection per plan
- Idempotency uniqueness
- Triggered version increment and timestamps
- Deletion cascades and retention expectations

### Integration tests

Targets:

- Authenticated server route to Supabase with RLS
- Transactional inbox conversion
- Task completion plus audit/mutation history
- Recovery selection atomicity
- Proposal approval state transition
- Export redaction
- Account deletion orchestration
- Token encryption/decryption and key rotation

### Calendar adapter contract tests

Use a fake HTTP server for precise errors plus a dedicated Google test calendar for real verification.

Cases:

- OAuth callback success, state mismatch, expired state, replay
- Refresh success, rotated refresh token, invalid grant
- Initial one-page and multi-page sync
- Incremental one-page and multi-page sync
- HTTP 410 cursor invalidation and full resync
- 403/429/5xx retry classification
- Deleted/canceled event
- Recurring master and exception
- All-day event
- Event crossing midnight
- Duplicate sync trigger
- Write proposal stale ETag, Phase 2
- Create timeout with uncertain result, Phase 2
- Push duplicate/out-of-order/channel expiration, Phase 2

### End-to-end tests — Playwright

Critical Phase 1 journeys:

1. Sign in, create task, refresh, verify persistence.
2. Capture offline, reconnect, verify one inbox item.
3. Convert inbox item to task; original records conversion.
4. Connect Google test account, select calendar, sync.
5. Modify and delete test event in Google, sync, verify mirror.
6. Plan a day with fixed events, buffers, and three outcomes.
7. Create overcapacity day; see pushback.
8. Miss a workout; select home/minimum/later recovery.
9. Reset a room from a cleaning zone.
10. Create learning session; reject vague objective.
11. Import Houston starter trip; verify date-unconfirmed behavior.
12. Approve an internal proposal; verify no false Google write claim.
13. Generate rolling state; verify redaction and freshness.
14. Export data.
15. Disconnect Calendar and verify token purge status.
16. Delete test account and verify login/data removal.

Run Chromium, WebKit, and Firefox smoke; full critical mobile flows in WebKit mobile emulation and Chromium mobile.

## 3. Priority engine golden fixtures

Fixture classes:

- Hard deadline versus strategic work
- Low energy with high-energy task
- Short low-value task versus longer high-value fit
- Blocked dependency
- Budget-blocked purchase
- Protected routine with closing recovery window
- Unverified travel deadline
- User pin with expiration
- Equal scores and deterministic tie-break
- No feasible current task

Every engine-rule change requires reviewed fixture updates and decision-log entry.

## 4. Recovery fixtures

- Missed gym session with insufficient travel time
- Full home substitute available
- Minimum-only window
- Tomorrow overload makes move harmful
- Laundry active/passive split
- Cleaning missing supplies
- Learning session with practice requirement
- Packing with unverified trip date
- Administrative task outside entered office hours
- Budget-constrained shopping
- No feasible option
- Repeated miss and root-cause pattern

## 5. Timezone test matrix

- America/New_York spring forward
- America/New_York fall back
- All-day event around DST
- Houston travel timezone display
- Event created in another timezone
- User changes home timezone
- Open window crossing midnight
- Google exclusive all-day end date
- Recurring event with exception after timezone change

Use fixed IANA timezone data supplied by runtime; never hard-code offsets.

## 6. Security tests

- Cross-user RLS for all exposed tables
- Service-role secret scan in client build
- OAuth token never appears in logs or error payloads
- CSRF/OAuth state failures
- Idempotency replay with changed payload rejected
- Cron secret failure
- Webhook channel token failure
- XSS through task title and opportunity content
- Prompt-injection corpus
- Unsafe URL schemes
- CSV formula injection in export
- Rate-limit behavior
- Account deletion orphan scan
- CSP violation review

## 7. Notification tests, Phase 2

- Dedupe same event
- Material revision creates update
- Quiet-hours deferral
- Critical override only when configured
- Daily cap and grouping
- Snooze then resolved suppression
- Provider failure and retry
- Browser denied/unsupported
- Email bounce/complaint
- No approval action from notification without authentication

## 8. Performance tests

- Command Center p75 server response and useful render
- 1,000 tasks with filtered list
- 10,000 mirrored events over bounded windows
- Calendar sync page batching
- Rolling-state generation
- Job claim under concurrency
- Mobile offline cache size

Performance fixes must not weaken authorization or hide stale state.

## 9. Accessibility tests

Automated axe checks plus manual:

- Keyboard-only full critical path
- Screen-reader labels and dialog focus
- 200% zoom
- Reduced motion
- Color contrast
- Error summary navigation
- Timeline list alternative
- Touch target review on 360px width

Automated scans are not sufficient alone.

## 10. Poor-connectivity and resilience tests

- Offline app shell
- Cached state stale banner
- Offline capture queue
- Request timeout and retry
- Partial Calendar failure
- Server function termination during sync lease
- Job lease expiry, Phase 2
- Provider outage
- Database transient failure
- User double tap on mutation

## 11. Test data policy

- Local seed is synthetic and labeled.
- Preview uses dedicated test users and Google test calendar.
- Production smoke uses owner-approved test records with a cleanup plan.
- No production personal data is copied into CI.
- Each E2E test creates unique IDs and cleans up where safe.

## 12. CI gates

Pull request:

```bash
pnpm audit --prod
pnpm typecheck
pnpm lint
pnpm test
pnpm test:db
pnpm build
pnpm test:e2e:smoke
```

Release candidate adds full E2E, accessibility, dependency advisory review, migration dry run, and preview red-team checks.

## 13. Evidence package

For each milestone record:

- Commit SHA
- Migration versions
- Environment used
- Commands and results
- Screenshots or traces for critical paths
- Database assertions
- Real-provider evidence where required
- Known limitations
- Open defects by severity
- Rollback result or documented drill

A screenshot alone is never sufficient evidence.
