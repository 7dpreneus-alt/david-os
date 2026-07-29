# User Stories

## Authentication and ownership

### US-AUTH-01 Sign in

As the account owner, I can sign in securely so my operational data is private.

**Acceptance scenarios**

- Given a valid account, when I authenticate, then a server-validated session is established and I reach the Command Center.
- Given an expired session, when I attempt a mutation, then the mutation is rejected and my unsaved form data remains available.
- Given a second user, when they query records owned by the first user, then RLS returns no rows and prevents writes.

### US-AUTH-02 Delete account

As the account owner, I can export and delete my account so I retain control of my data.

- Deletion requires recent authentication and typed confirmation.
- Calendar watches are stopped, tokens are revoked where possible, job leases are canceled, and owned data is deleted or irreversibly anonymized according to policy.
- The system produces a deletion receipt without exposing secrets.

## Command Center

### US-CC-01 Understand today

As the user, I can see fixed events, committed tasks, open windows, three outcomes, risks, and sync status so I know what is real.

- Stale calendar data is visibly labeled.
- More than three dominant outcomes cannot appear.
- Empty sections explain the next useful action rather than displaying dead space.

### US-CC-02 Know what to do now

As the user, I can request the best feasible next action.

- The result fits the current open window, energy, location, dependencies, and available resources.
- The result includes why it fits and why higher-scored tasks were excluded.
- When nothing meaningful fits, the system recommends rest, capture, or a small maintenance action rather than inventing urgency.

### US-CC-03 Know what to ignore

As the user, I can see low-value or infeasible work that should not consume attention today.

- Protected deadlines and safety-critical items are never placed on the ignore list.
- The explanation distinguishes defer, delegate, drop, and “not today.”

## Capture and registry

### US-CAP-01 Rapid capture

As the user, I can save a thought from my phone in under 15 seconds.

- Only text is required.
- The save succeeds even when classification fails.
- Offline capture is queued with a visible pending state and later syncs idempotently.

### US-CAP-02 Resolve ambiguity

As the user, I can review uncertain captures instead of having the system invent details.

- Missing date, duration, area, or intended type appears as a question.
- Duplicate suggestions show evidence and allow keep-both, merge, or dismiss.

### US-TASK-01 Define executable work

As the user, I can create a task with duration, energy, definition of done, and flexibility so planning is realistic.

- A task may be saved incomplete, but planning confidence drops and missing critical fields remain visible.
- Completing a task records completion type: full, minimum viable, partial, canceled, or delegated.

### US-PROJ-01 Maintain a next action

As the user, I can see whether a project has a clear next action.

- Active projects without an executable next action are marked stalled.
- The system does not auto-create the missing action without approval.

## Planning and calendar

### US-CAL-01 Connect Google Calendar

As the user, I can connect selected Google Calendars through OAuth.

- Consent describes requested scopes.
- The application stores no Google password.
- Disconnect is available from Settings.

### US-CAL-02 Synchronize events

As the user, I can sync my selected calendars and see accurate events.

- Repeated sync does not duplicate events.
- Deleted and canceled events reconcile.
- Invalid sync tokens trigger a controlled full resync.
- Partial failures show which calendar failed.

### US-PLAN-01 Plan my day

As the user, I can build a realistic day from events, tasks, capacity, and buffers.

- Fixed events never move.
- Flexible tasks may be proposed into open windows.
- Unschedulable items remain unscheduled with a reason.
- The plan reserves contingency capacity.

### US-PLAN-02 Approve schedule changes

As the user, I can inspect and approve or reject material changes before Calendar is changed.

- Approval shows before/after times and displaced work.
- The engine rechecks conflicts immediately before execution.
- A stale proposal requires regeneration.

### US-PLAN-03 Undo the last internal change

As the user, I can reverse a recent reversible mutation.

- Undo is implemented from a persisted inverse operation or version snapshot.
- External Calendar writes use a compensating proposal and approval, not a hidden rollback.

## Recovery

### US-REC-01 Recover a missed workout

As the user, I receive ranked full-gym, home substitute, minimum viable, later-window, or intentional-skip options.

- Options respect travel, equipment, energy, recovery constraints, weekly frequency, and overload.
- Unsafe or medically interpretive exercise advice is excluded.
- Choosing an option updates the task/session and creates required schedule proposals.

### US-REC-02 Recover a missed home task

As the user, I can recover laundry, cleaning, shopping, packing, or meal preparation without destroying the rest of the day.

- The system identifies prerequisites such as washer availability, store hours entered by the user, or needed supplies.
- A minimum viable version is meaningful, not a fake check-in.

### US-REC-03 Document intentional skip

As the user, I can intentionally skip a routine with a reason.

- The skip does not count as completed.
- The weekly plan and frequency forecast update.
- Repeated skips surface a pattern without moralizing language.

## Capacity and discipline

### US-CAPACITY-01 Report low energy

As the user, I can report low energy and rebuild the plan.

- High-energy tasks are not recommended unless safety or deadline overrides require them.
- The system proposes smaller versions, rest, or lower-energy work.
- Consequences of deferral remain visible.

### US-CAPACITY-02 Detect overload

As the user, I receive pushback when committed work exceeds realistic capacity.

- The warning quantifies committed versus available time.
- It proposes what to shrink, move, or drop.
- The user may override with a documented reason.

### US-CAPACITY-03 Learn estimation patterns

As the user, I can compare estimated and actual time.

- Phase 1 records data; Phase 2 may recommend estimate adjustments after sufficient samples.
- One unusual task does not rewrite the default estimate.

## Home

### US-HOME-01 Plan cleaning by zone

As the user, I can reset the bathroom, floor, bedroom, kitchen, or general areas with a definition of done.

- The plan considers duration, supplies, room state, and energy.
- Completion may store notes or optional evidence.

### US-HOME-02 Track moisture follow-up

As the user, I can record a humidity or moisture concern, actions taken, next inspection, and landlord communication.

- The system manages follow-up timing and records; it does not diagnose mold or structural safety.
- Urgent safety language directs the user to appropriate professional help without claiming certainty.

### US-HOME-03 Evaluate second-bedroom use

As the user, I can compare room configurations using explicit weights.

- All five starter options are editable.
- Assumptions and scores are visible.
- The system records the final decision and revisit date.

## Fitness

### US-FIT-01 Protect workout windows

As the user, I can reserve realistic gym or home workout windows.

- Travel and transition time are included.
- Protected windows may be displaced only through explicit approval or emergency override.

### US-FIT-02 Complete minimum viable workout

As the user, I can complete a meaningful reduced session when the full plan does not fit.

- The result is recorded as minimum viable, not full.
- Weekly frequency and training minutes update truthfully.

## Learning and trading study

### US-LEARN-01 Create an outcome-based study session

As the user, I can create a study block with a concrete deliverable.

- Vague objectives are flagged.
- Completion evidence and next action are required to close the session as full completion.

### US-LEARN-02 Enforce financial firewall

As the user, I can keep paper-trading education separate from money needed for bills and emergencies.

- The system never recommends live trading based solely on session completion.
- Live-trading gates are informational constraints and require explicit owner decisions outside automated scheduling.

## Travel

### US-TRAVEL-01 Prepare for a trip

As the user, I can see booking, packing, outfit, purchase, document, budget, event, and return-reset status.

- Unverified dates prevent active deadline scheduling.
- Confirmation numbers are masked in summaries.
- Tasks link to the trip and remain normal tasks for planning and recovery.

### US-TRAVEL-02 Manage budget-conscious purchases

As the user, I can record a purchase candidate with target budget, need-by date, and alternatives.

- The system does not buy anything.
- A recommendation exceeding the entered budget is blocked or explicitly marked incompatible.

## Opportunity Radar

### US-OPP-01 Review a verified opportunity

As the user, I can see source, retrieval date, eligibility evidence, deadline, cost, value, effort, fit, confidence, and recommendation.

- Unverified opportunities cannot trigger critical alerts.
- Duplicate opportunities merge provenance without hiding conflicting details.

### US-OPP-02 Control noise

As the user, I can set category frequency, quiet hours, watchlists, and silence rules.

- Dismissed items do not reappear unless materially changed.
- Notification caps apply across channels.

## Decisions and state

### US-DEC-01 Explain a recommendation

As the user, I can inspect inputs, constraints, scores, alternatives, and trigger events.

- Explanations contain no invented certainty.
- The version of the rules engine is stored.

### US-STATE-01 Export rolling state

As the user, I can export a compact current-state summary for another assistant.

- Secrets, full calendar descriptions, private confirmation numbers, and deleted records are excluded.
- The export contains an `as_of` timestamp and stale-source warnings.
