# Information Architecture

## Navigation model

### Primary mobile navigation

1. **Today** — Command Center
2. **Plan** — calendar, open time, day rebuild, proposals
3. **Capture** — rapid capture and inbox
4. **Areas** — tasks/projects plus Home, Fitness, Learning, Travel
5. **More** — approvals, reviews, decisions, notifications, settings

The mobile bar contains no more than five destinations. Capture may also use a persistent action button.

### Desktop navigation

- Today
- Inbox
- Tasks & Projects
- Calendar & Plan
- Home
- Fitness
- Learning
- Travel
- Opportunities, hidden until Phase 3 is enabled
- Reviews
- Decisions
- Settings

## Route map

```text
/
/login
/onboarding
/today
/inbox
/tasks
/tasks/:taskId
/projects
/projects/:projectId
/plan
/plan/open-time
/plan/proposals/:proposalId
/approvals
/home
/home/rooms/:roomId
/home/maintenance/:recordId
/fitness
/fitness/sessions/:sessionId
/learning
/learning/sessions/:sessionId
/travel
/travel/:tripId
/opportunities
/opportunities/:opportunityId
/reviews
/reviews/:reviewId
/decisions
/settings
/settings/profile
/settings/calendar
/settings/notifications
/settings/data
/system/status
```

Phase-disabled routes return a purposeful feature-disabled screen with the approved phase, prerequisites, and no interactive dead controls.

## Global interaction rules

- Every async action shows pending state and prevents accidental duplicate submission.
- Every mutation returns success, warning, or error with a durable resulting state.
- Destructive changes require confirmation and offer undo when technically safe.
- External writes show a provider icon, exact side effect, and approval requirement.
- Stale data is labeled at the component and page level.
- Starter data has a visible “Starter” badge and can be removed in one reviewed action.
- Time is displayed in the user’s selected timezone; source timezone appears in event details when different.

## Page contracts

## Today / Command Center

**Purpose:** Give the user the smallest trustworthy operational picture for the current day.

**Inputs:** Calendar events, daily plan, tasks, open windows, priority snapshot, energy check-in, capacity profile, recovery plans, approvals, domain summaries, sync state.

**Outputs:** Three outcomes, now recommendation, ignore recommendation, at-risk list, recovery actions, quick capture, sync/rebuild actions.

**State changes:** Energy check-in, task completion, recovery selection, plan generation, proposal approval navigation.

**Loading:** Skeleton only for actual loading regions; last known state may render with stale label.

**Empty:** Explain how to connect Calendar or add the first task. Do not manufacture a sample day.

**Error:** Show which source failed. Keep unaffected sections usable.

**Permissions:** Authenticated owner only.

**Acceptance:** The user can identify the next action, next fixed commitment, open time, and current risk without navigating elsewhere.

## Inbox

**Purpose:** Store and resolve captured items.

**Inputs:** Inbox records, classification suggestions, duplicate candidates.

**Outputs:** Convert, merge, archive, edit, or leave unresolved.

**State changes:** Transactional conversion to destination entity; source inbox item records conversion target.

**Loading:** Incremental list loading; capture remains available.

**Empty:** “Inbox clear” with capture prompt and no confetti.

**Error:** Failed conversion leaves original capture unchanged.

**Acceptance:** No capture is lost when classification or conversion fails.

## Tasks & Projects

**Purpose:** Maintain the execution registry.

**Inputs:** Tasks, projects, dependencies, milestones, filters, calendar links.

**Outputs:** Create/edit/archive, set next action, mark status, inspect schedule fit and recovery policy.

**State changes:** Versioned mutation with audit record.

**Loading:** Paginated or virtualized lists; detail may load separately.

**Empty:** Create task or project; optional starter import is clearly labeled.

**Error:** Field-level validation and conflict warning when record version changed.

**Acceptance:** Every active project can expose its next action or stalled reason.

## Calendar & Plan

**Purpose:** Show fixed commitments, open windows, internal planned blocks, and approval-gated proposals.

**Inputs:** Selected calendars, synchronized events, availability, buffers, travel assumptions, tasks, capacity, energy.

**Outputs:** Sync, open-time view, day plan, schedule proposal, split-task proposal, rebuild.

**State changes:** Internal plan and proposal records; no external write without approved Phase 2 execution path.

**Loading:** Calendar shell renders with date range while events load. Sync job status streams or polls.

**Empty:** Connect a calendar or configure manual availability.

**Error:** Partial calendar failures identify the affected calendar and last successful sync.

**Permission:** Calendar OAuth scopes and selected-calendar access are visible.

**Acceptance:** Fixed events cannot be dragged as if editable internal tasks. Proposed changes are visually distinct.

## Approval detail

**Purpose:** Make material side effects reviewable.

**Inputs:** Proposal diff, conflicts, affected entities, reason, expiration, current provider state.

**Outputs:** Approve, reject, request regeneration.

**State changes:** Approval record; execution only after current-state revalidation.

**Loading:** Approval body and fresh conflict check are separate states.

**Error:** Stale proposal cannot be approved; user is offered regeneration.

**Acceptance:** The user sees exactly what will change before approval.

## Home

**Purpose:** Manage rooms, cleaning zones, items, maintenance, purchasing, and room decisions.

**Inputs:** Room registry, tasks, maintenance records, item registry, budget constraints.

**Outputs:** Zone reset plan, maintenance follow-up, purchase priority, room-use comparison.

**Empty:** Add rooms manually or import starter room names.

**Error:** Failed task creation does not lose maintenance notes.

**Acceptance:** A maintenance concern has status, next follow-up, and history.

## Fitness

**Purpose:** Manage workout consistency and recovery.

**Inputs:** Frequency target, workout templates, equipment, locations, protected windows, energy, constraints, history.

**Outputs:** Schedule proposal, session completion, missed-session recovery.

**Empty:** Configure weekly target and at least one home or gym template.

**Safety:** A persistent note states that scheduling support is not medical guidance. Pain-related constraints can block a recommendation.

**Acceptance:** A missed session can produce feasible ranked options without counting a minimum session as full.

## Learning

**Purpose:** Turn learning goals into concrete sessions.

**Inputs:** Topic, source, objective, practice, duration, evidence, review date.

**Outputs:** Session task, completion evidence, next action.

**Empty:** Create an outcome-based session; show examples as instructional text, not saved data.

**Acceptance:** Vague sessions are flagged before scheduling.

## Travel

**Purpose:** Coordinate trip preparation and return reset.

**Inputs:** Dates, timezone, bookings, packing, outfits, purchases, budget, events, documents, deadlines.

**Outputs:** Readiness status, preparation plan, purchase decisions, packing progress.

**Empty:** Add a trip or import clearly labeled Houston starter data.

**Error:** Unverified dates block deadline automation and show what needs confirmation.

**Acceptance:** Trip readiness distinguishes unknown, not started, in progress, blocked, and complete.

## Opportunities

**Purpose:** Review verified external opportunities without noise.

**Phase:** Hidden until Phase 3 feature flag is enabled.

**Inputs:** Provider adapter results, provenance, verification, scoring, decisions.

**Outputs:** Pursue, review, watch, dismiss, follow-up.

**Error:** Source failure never generates stale “new” opportunities.

**Acceptance:** Every displayed opportunity shows source and verification state.

## Decisions

**Purpose:** Preserve important choices and outcomes.

**Inputs:** Decision records and linked entities.

**Outputs:** Revisit, add outcome, export.

**Acceptance:** Recommendation-driven material changes link to a decision or audit entry.

## Settings

Sections:

- Profile and timezone
- Availability, buffers, capacity, and quiet hours
- Calendar connection and selected calendars
- Notification channels and caps
- Data export, starter-data removal, and account deletion
- Feature status and system diagnostics

Settings must expose current integration status rather than burying failures.

## Component contract template

Every implementation ticket for a visible control must include:

```text
Purpose:
User trigger:
Required input:
Data source:
Mutation or output:
Pending behavior:
Empty behavior:
Error behavior:
Permission/approval behavior:
Analytics event without personal content:
Acceptance test:
```

A control without this contract should not enter the build.
