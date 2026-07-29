# API Contracts and User Commands

## 1. Conventions

Base path: `/api/v1`

All mutation requests require:

- Authenticated session
- `Idempotency-Key` header, UUID recommended
- `Content-Type: application/json`
- Zod validation

Standard success envelope:

```json
{
  "data": {},
  "warnings": [],
  "meta": {
    "requestId": "uuid",
    "asOf": "2026-07-28T21:00:00-04:00",
    "stateChanged": true
  }
}
```

Standard error envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request could not be applied.",
    "fieldErrors": {"estimatedMinutes": ["Must be greater than 0"]},
    "retryable": false,
    "requestId": "uuid"
  }
}
```

Error codes include `UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION_ERROR`, `VERSION_CONFLICT`, `IDEMPOTENCY_CONFLICT`, `NOT_FOUND`, `DEPENDENCY_BLOCKED`, `BUDGET_BLOCKED`, `NO_FEASIBLE_SLOT`, `PROPOSAL_STALE`, `APPROVAL_REQUIRED`, `PROVIDER_RECONNECT_REQUIRED`, `PROVIDER_RATE_LIMITED`, `SYNC_IN_PROGRESS`, and `INTERNAL_ERROR`.

## 2. Entity endpoints

### Inbox

- `POST /inbox`
- `GET /inbox`
- `PATCH /inbox/:id`
- `POST /inbox/:id/convert`
- `POST /inbox/:id/merge`
- `DELETE /inbox/:id` soft delete

### Tasks

- `POST /tasks`
- `GET /tasks`
- `GET /tasks/:id`
- `PATCH /tasks/:id` requires `version`
- `POST /tasks/:id/complete`
- `POST /tasks/:id/missed`
- `POST /tasks/:id/archive`

### Projects

- `POST /projects`
- `GET /projects`
- `GET /projects/:id`
- `PATCH /projects/:id`
- `POST /projects/:id/set-next-action`

### Planning

- `POST /plans/day`
- `POST /plans/day/rebuild`
- `GET /plans/day?date=YYYY-MM-DD`
- `GET /open-windows?start=&end=&timezone=`
- `POST /schedule-proposals`
- `GET /schedule-proposals/:id`
- `POST /schedule-proposals/:id/approve`
- `POST /schedule-proposals/:id/reject`

### Calendar

- `POST /calendar/google/connect`
- `GET /calendar/google/callback`
- `GET /calendar/connections`
- `GET /calendar/calendars`
- `PATCH /calendar/calendars/:id`
- `POST /calendar/sync`
- `GET /calendar/sync-runs/:id`
- `POST /calendar/disconnect`
- Phase 2: `POST /webhooks/google-calendar`

### Recovery

- `POST /recovery/evaluate`
- `GET /recovery/plans/:id`
- `POST /recovery/plans/:id/select`

### Domain modules

- `/home/rooms`, `/home/maintenance`, `/home/room-options`
- `/fitness/profile`, `/fitness/templates`, `/fitness/sessions`
- `/learning/sessions`
- `/travel/trips`, `/travel/trips/:id/items`
- Phase 3: `/opportunities`, `/opportunity-sources`

### Decisions and state

- `GET /decisions`
- `POST /decisions`
- `PATCH /decisions/:id/outcome`
- `POST /rolling-state/generate`
- `GET /rolling-state/latest`
- `POST /mutations/undo-last`

## 3. Command contracts

## Add task

**Required information:** title.  
**Optional:** project, area, dates, duration, energy, location, cost, dependencies, consequence, flexibility, minimum version, recovery window, definition of done.

**Behavior:** Create task in `ready` unless missing fields make it non-plannable; then still create but return clarification warnings and lower confidence.

**State changes:** task, audit, mutation history; optional dependency rows.

**Approval:** none for internal task. Calendar proposal is separate.

**Errors:** empty title, invalid duration/date, dependency cycle, inaccessible project.

## Add project

**Required:** title and desired outcome.  
**Behavior:** Create `proposed` or `active` project; flag missing next action.  
**State changes:** project and optional goal link.  
**Approval:** none.  
**Errors:** invalid budget/date or inaccessible goal.

## Add event

**Required:** title, start, end/date shape, timezone, target calendar or “internal proposal only.”

**Behavior:** Phase 1 creates a schedule proposal; it does not write Google Calendar. Phase 2 may execute after approval.

**State changes:** proposal and proposal item.  
**Approval:** always required for external Calendar write in initial policy.  
**Errors:** invalid timezone, end before start, conflict, no write scope, no write target.

## Sync calendar

**Required:** connected account and at least one selected calendar; optional calendar IDs.  
**Behavior:** Acquire lease, run initial/incremental sync, return run ID and current status.  
**State changes:** event mirror, sync state, audit.  
**Approval:** OAuth consent during connection; no approval for read sync.  
**Errors:** reconnect required, sync already running, provider rate limit, partial calendar failure.

## Plan my day

**Required:** local date; optional energy and constraints.  
**Behavior:** Load fixed events, available windows, tasks, capacity, priority snapshot; create a versioned internal day plan with at most three dominant outcomes.  
**State changes:** daily plan, items, priority snapshots.  
**Approval:** none until Calendar writes are proposed.  
**Errors:** stale calendar returns warning; no availability returns a no-feasible-plan result, not a 500.

## Rebuild today

**Required:** reason; optionally changed energy, work-late time, new fixed commitment.  
**Behavior:** Supersede active internal plan, preserve executed/fixed events, reevaluate misses and proposals, create new version.  
**Approval:** external writes remain pending.  
**Errors:** active execution conflict or invalid changed constraint.

## I missed my workout

**Required:** session/task resolution; root cause optional but requested.  
**Behavior:** Confirm/create miss, run fitness recovery adapter, return ranked options.  
**State changes:** missed commitment and recovery plan. Selecting an option is separate.  
**Approval:** required for resulting Calendar writes.  
**Errors:** ambiguous session, no configured template, missing duration; original record remains unchanged until selection.

## I missed this task

Same flow using domain adapter or generic recovery. Requires task ID and planned occurrence when ambiguous.

## I have low energy

**Required:** level, optional valid-until and reason.  
**Behavior:** Save check-in and preview affected plan. User may choose rebuild.  
**State changes:** energy check-in; plan changes only after rebuild command.  
**Approval:** none for internal rebuild; external proposals separate.  
**Errors:** invalid time or level.

## Work is running late

**Required:** expected end time or delay minutes.  
**Behavior:** Add temporary fixed/unavailable interval, identify displaced tasks, generate rebuild preview.  
**State changes:** availability exception and optional new plan after confirmation.  
**Approval:** moving Calendar events requires proposal approval.  
**Errors:** end time in past or ambiguous work event.

## Move this deadline

**Required:** entity ID, new deadline, reason.  
**Behavior:** Update internal deadline after consequence and dependency impact preview. Provider-owned event dates require a Calendar proposal instead.  
**State changes:** task/project/trip item version, decision/audit.  
**Approval:** internal change may require confirmation when it affects dependents; Calendar write always requires approval.  
**Errors:** new date violates parent deadline or dependency; user can override soft conflict with reason.

## What should I do now?

**Required:** current time; energy/location may use current state.  
**Behavior:** Return best feasible action plus explanation, duration, and excluded alternatives.  
**State changes:** none.  
**Errors:** stale source warning; no feasible action returns a useful no-action result.

## What should I ignore?

**Behavior:** Return candidates grouped as not today, defer, merge, archive, delegate, or clarify. No state changes until user selects an action.

## Red-team my day

**Behavior:** Analyze overload, missing buffers, impossible transitions, unverified assumptions, budget conflicts, protected-routine displacement, and stale data. Return findings by severity and proposed corrections. Does not modify state.

## Red-team my week

Same scope across seven days; additionally checks repeated overload, recovery debt, deadline clustering, and missing rest. No state changes.

## Show open time

**Required:** date range and timezone.  
**Behavior:** Return windows after fixed events, availability, buffers, and travel.  
**Errors:** stale Calendar warning and no-selected-calendar explanation.

## Plan laundry

**Required:** load count or unknown, need-by date optional, machine/access assumptions.  
**Behavior:** Create or update laundry task with active/passive phases and definition of done; propose windows.  
**Approval:** Calendar writes separate.  
**Errors:** missing machine availability becomes clarification, not invention.

## Reset a room

**Required:** room and desired state or cleaning zone.  
**Behavior:** Create scoped task from zone definition; offer full/minimum version.  
**Errors:** room not found; missing definition of done.

## Prepare for my trip

**Required:** trip ID.  
**Behavior:** Validate dates, generate readiness gaps and tasks for confirmed facts. Unverified dates produce confirmation actions instead of fake deadlines.  
**Approval:** no purchases/bookings; Calendar writes separate.

## Add an opportunity

**Required:** title and source reference or explicit manual note.  
**Behavior:** Store as unverified unless authoritative evidence is supplied and checked.  
**State changes:** opportunity and provenance.  
**Approval:** none to save; pursuit tasks require user decision.  
**Errors:** invalid URL or duplicate suggestion.

## Check grants

**Phase:** 3.  
**Required:** enabled authorized sources and user-confirmed eligibility filters.  
**Behavior:** Run source adapters, normalize, verify, dedupe, and return source-status report.  
**Errors:** source failure is explicit; no claim that no grants exist.

## Check travel deals

**Phase:** 3.  
**Required:** origin, destination or flexible region, dates, travelers, budget, baggage/lodging assumptions.  
**Behavior:** Query approved provider, timestamp and expire results quickly.  
**Approval:** no booking.  
**Errors:** incomplete search parameters or stale quote.

## Review pending approvals

**Behavior:** Return pending proposals ordered by expiration and consequence, with exact diffs. No state change.

## Explain this recommendation

**Required:** recommendation or snapshot ID.  
**Behavior:** Return component factors, hard filters, confidence, alternatives, trigger, and engine version. No state change.

## Undo the last change

**Required:** none, or entity filter.  
**Behavior:** Find latest user mutation with valid inverse and no dependent conflicting change; execute inverse transaction.  
**Approval:** external writes create a compensating proposal and require approval.  
**Errors:** not reversible, window expired, dependent changes exist, or provider state diverged.

## 4. Representative request schemas

### Create task

```json
{
  "title": "Pack wedding essentials",
  "lifeAreaId": "uuid",
  "dueAt": "2026-08-15T18:00:00-04:00",
  "dueTimezone": "America/New_York",
  "estimatedMinutes": 45,
  "minimumMinutes": 20,
  "energyRequirement": "low",
  "flexibility": "medium",
  "definitionOfDone": "Essentials are packed and missing items are listed",
  "source": "user"
}
```

### Generate day plan

```json
{
  "localDate": "2026-07-29",
  "timezone": "America/New_York",
  "energyLevel": "normal",
  "reason": "morning_plan"
}
```

### Select recovery option

```json
{
  "recoveryOptionId": "uuid",
  "rootCause": "unexpected_interruption",
  "rootCauseNote": "Work ran late"
}
```

## 5. Transaction rules

- Inbox conversion, recovery selection, approval decision, task completion, and undo are transactional.
- Provider call cannot participate in PostgreSQL transaction. Use an outbox/operation record and reconcile uncertain outcomes.
- State versions prevent lost updates.
- Idempotency responses are replayed only for the same user, route, and payload hash.
