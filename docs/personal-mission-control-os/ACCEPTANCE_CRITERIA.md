# Acceptance Criteria

## 1. Global definition of done

A feature is accepted only when:

- Production-intended code exists in the approved repository.
- Data persists across reload and authenticated devices.
- Authorization and error behavior are implemented.
- Loading, empty, error, and permission states work.
- Automated tests pass at the appropriate layers.
- Build succeeds.
- Observability exists without sensitive logging.
- Documentation and environment requirements are current.
- Known limitations are visible.
- No fake live data or silent fallback is used.

## 2. Phase 1 release gate

All items below are mandatory.

### Authentication and data

- User can sign in, sign out, refresh session, and recover from expiry.
- RLS prevents cross-account access.
- Core CRUD persists.
- Starter data is labeled, editable, and removable.
- No service-role or OAuth secret is shipped to client.

### Command Center

- Shows date/timezone and Calendar freshness.
- Shows confirmed events, committed tasks, open windows, top three outcomes, risks, recovery, approvals, and domain status.
- Shows one feasible now recommendation and one ignore recommendation or truthful empty result.
- Never displays more than three dominant outcomes.

### Inbox and registry

- Capture requires only text.
- Offline capture queues and saves once.
- Classification failure does not lose capture.
- Duplicate candidates are suggestions.
- Task fields support the required registry model.
- Active project without next action is marked stalled.

### Priority and capacity

- Scoring components, confidence, engine version, and explanation persist.
- Infeasible tasks cannot rank as do-now.
- Overcommitment warning quantifies excess load.
- Energy change affects recommendations only through a recorded check-in.

### Calendar read integration

- Real Google OAuth works on approved domain.
- Calendar selection works.
- Initial and incremental sync work.
- Repeated sync creates no duplicates.
- Deleted events reconcile.
- Invalid cursor triggers controlled full resync.
- Disconnect removes tokens.
- Stale/partial status is visible.

### Planning and approvals

- Fixed events remain fixed.
- Open windows include availability, buffers, and configured travel assumptions.
- Day plan is versioned and realistic.
- Unschedulable tasks remain unscheduled with reasons.
- Material Calendar changes remain proposals.
- Approval records exact diff and expires/stales safely.
- Phase 1 never claims a Google write occurred.

### Recovery

- Explicit missed-task commands work.
- Automatic miss detection is confirmable.
- Recovery engine supports required domains.
- Options show feasibility, displacement, energy, timing, cost, and weekly impact.
- Minimum completion is distinct from full.
- No feasible option is a valid result with explanation.

### Home

- Rooms, items, cleaning zones, maintenance, and follow-ups persist.
- Moisture concerns are tracked without medical/structural diagnosis.
- Second-bedroom options and scoring assumptions are editable and undecided by default.

### Fitness

- Weekly target, templates, equipment, windows, and sessions persist.
- Missed-session recovery works.
- Scheduling constraints can block options.
- Module does not diagnose or prescribe rehabilitation.

### Learning

- Session requires topic, source, objective, practice, evidence, and duration.
- Vague objectives are blocked from scheduling or sent to clarification.
- Completion records next action.

### Travel

- Trips and item categories persist.
- Unverified dates block active deadline automation.
- Confirmation numbers are masked.
- Houston starter trip is removable and not product logic.

### Decisions, state, and data controls

- Decision records include alternatives and revisit state.
- Rolling state includes as-of and source freshness.
- Rolling state excludes secrets and sensitive fields.
- Export works.
- Account deletion is verified, not merely hidden.
- Undo works for approved internal mutation classes.

### UX and reliability

- Critical flows pass at 360px and 390px.
- Keyboard and screen-reader basics pass.
- Cached state is labeled stale offline.
- No dead buttons, false success messages, or silent errors.
- Command Center useful render and capture response meet defined performance targets.

### QA and release

- Unit, component, database, integration, and E2E suites pass.
- Real Calendar evidence is attached.
- No Severity 1 or Severity 2 defect remains.
- Security advisory review is current.
- Backup and rollback drill is documented.

## 3. Phase 2 acceptance gate

- Calendar write operations are idempotent and approval-gated.
- Uncertain provider outcomes reconcile without duplicates.
- Background jobs use leases, retries, and dead-letter visibility.
- Push channels renew and periodic reconciliation covers missed notifications.
- Quiet hours, dedupe, caps, snooze, and delivery history pass tests.
- Weekly review metrics match underlying records.
- Capacity-learning suggestions require adequate data and approval.
- Import supports dry-run and conflict reporting.

## 4. Phase 3 acceptance gate

- Each source has documented authorization and terms review.
- Provenance and retrieval time are visible.
- Unverified content cannot trigger critical alerts.
- Duplicate clusters preserve conflicting source facts.
- Prompt-injection and unsafe-link tests pass.
- Financial compatibility uses user-entered budgets and unknown values correctly.
- No purchase, booking, message, grant submission, or Calendar write occurs from ingestion.
- Source failure is distinct from “no opportunities found.”

## 5. Rejection conditions

Reject the release if any of the following exists:

- Sample data silently replaces failed backend data.
- A Calendar sync cursor advances after partial failure.
- OAuth refresh token is plaintext or client-visible.
- A task or event can be duplicated by retry.
- A fixed event is moved by planning logic.
- More than three dominant priorities appear.
- A missed task is only marked overdue with no recovery evaluation.
- A notification claims delivery without provider evidence.
- An unverified opportunity is presented as confirmed.
- An external action bypasses approval.
- A feature status says implemented without tests and real-path evidence.
