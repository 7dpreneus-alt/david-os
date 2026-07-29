# Product Vision

## Vision

Personal Mission Control OS gives one person a reliable operational picture of life: what is fixed, what is flexible, what matters now, what can wait, what was missed, and how to recover without wrecking the rest of the week.

The product succeeds when it reduces cognitive load while increasing honest execution. It should make commitments more realistic, not merely more visible.

## Product promise

At any moment, the user can ask:

- What is already committed?
- What can actually fit?
- What should I do now?
- What should I ignore?
- What changed?
- Why did the plan change?
- What is the least harmful recovery choice?

The answer must be grounded in persisted data, current calendar state, stated constraints, and transparent rules.

## Core outcomes

1. **Operational truth:** Calendar events, tasks, deadlines, routines, approvals, energy, and capacity are represented with explicit confidence and source.
2. **Realistic execution:** Plans fit available time, include buffers, and respect energy, location, cost, dependencies, and protected commitments.
3. **Fast recovery:** Missed work creates ranked recovery options rather than shame-colored overdue piles.
4. **Controlled adaptation:** Material changes create proposals and approvals before external writes.
5. **Calm focus:** The main screen limits dominant priorities to three and actively identifies low-value work to ignore.
6. **Durable context:** Decision history and rolling state let future assistants understand current reality without replaying entire conversations.

## Primary user

The initial user is a busy adult balancing a full-time operations role, home upkeep, fitness, structured trading education, travel preparation, financial constraints, and business or professional opportunities. The architecture supports more users later, but Phase 1 optimizes for a single account and fast daily use.

## Product principles

### Truth before convenience

Unverified dates, durations, prices, events, and opportunities stay unverified. The system asks for missing facts or lowers confidence; it does not invent them.

### Proposals before side effects

Creating an internal suggestion is different from changing Google Calendar, sending a message, submitting a grant, or buying an item. External side effects remain approval-gated until the user deliberately changes policy in a later phase.

### Deterministic core, optional language layer

Priority, scheduling, capacity, and recovery logic must work without a language model. A model may summarize or explain structured results, but cannot be the only place business rules exist.

### Recovery over punishment

The system measures recovery rate, estimation accuracy, and root causes. It does not preserve streaks through meaningless check-ins or punish intentional reprioritization.

### Small coherent product

Phase 1 does not attempt automated grant discovery, flight shopping, bank sync, meal planning, social messaging, or autonomous agents. It creates a dependable daily operating loop first.

### Explainability

Every recommendation stores its inputs, score components, constraints, alternatives, and reason. “AI says so” is not an explanation.

## Non-goals

- Medical diagnosis, rehabilitation prescription, or clinical fitness guidance
- Brokerage integration or trading execution
- Automatic purchases or financial transfers
- Automatic grant applications
- Automatic external messages
- Full email inbox management
- General-purpose note-taking replacement
- Broad web scraping
- Social feed, public profile, or competitive leaderboard
- Autonomous rescheduling of fixed commitments in Phase 1
- A digital twin that claims to know facts not supplied or synchronized

## Daily operating loop

1. Sync or review today’s calendar.
2. Confirm energy and unusual constraints.
3. Generate no more than three dominant outcomes.
4. Place committed tasks into open windows or leave them unscheduled with a reason.
5. Execute from “What should I do now?”
6. Capture interruptions and new commitments quickly.
7. Recover missed items using ranked options.
8. Record decisions and close the day with changed assumptions preserved.

## Weekly operating loop

1. Review wins, misses, recovery choices, time estimates, and friction.
2. Compare planned versus completed time by life area.
3. Protect next week’s fixed commitments and essential routines.
4. Remove, defer, or shrink low-value work.
5. Confirm travel, financial, and home risks.
6. Approve the next week’s protected priorities.

## Success measures

Phase 1 targets are behavioral and operational, not vanity metrics:

- At least 90% of user-created tasks persist after refresh and cross-device login; the real target is 100%, with any loss treated as a critical defect.
- Calendar read synchronization completes without duplicate internal events across repeated syncs.
- At least 80% of generated daily plans fit all hard calendar constraints and user-provided availability without manual repair.
- Every missed-task flow produces at least one feasible option or a clear “no safe fit” explanation.
- Every material schedule proposal has an approval state and audit trail.
- The user can capture an item on mobile in under 15 seconds at the median.
- The Command Center reaches useful content in under 2.5 seconds at the 75th percentile on a typical mobile connection after initial load.
- Weekly recovery rate and estimation error trend improve over four review cycles.
- Notification rate remains below configured caps and duplicates are suppressed.

## Product maturity test

A mature Personal Mission Control OS does not merely display more data. It makes fewer, better recommendations; catches bad assumptions; shows its work; and remains useful when the day goes sideways.
