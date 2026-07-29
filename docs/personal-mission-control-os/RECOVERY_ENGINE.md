# Missed-Task Recovery Engine

## 1. Purpose

A missed commitment is a planning event, not a dead-end status. The recovery engine finds the least harmful feasible response while preserving truth about what was missed.

## 2. Detection

A missed commitment is created when:

- A planned task window ends without a qualifying completion event.
- The user invokes “I missed this task” or “I missed my workout.”
- A synchronized calendar change displaces a linked task.
- A prerequisite failure makes the planned execution impossible.

Detection records the planned interval, actual state, source, and confidence. Automatic detection may ask for confirmation when completion data is absent.

## 3. Root-cause taxonomy

- avoidance
- bad_estimate
- unexpected_interruption
- low_energy
- missing_resource
- calendar_conflict
- financial_constraint
- deliberate_reprioritization
- travel_or_location
- provider_or_system_failure
- health_or_safety_constraint
- unknown

Root cause influences recommendations but does not alter historical completion truth.

## 4. Shared input snapshot

```typescript
interface RecoveryInput {
  task: TaskSnapshot;
  missedCommitment: MissedCommitmentSnapshot;
  now: string;
  planningTimezone: string;
  openWindows: TimeWindow[];
  fixedEvents: EventSnapshot[];
  currentEnergy: EnergyLevel;
  capacityRemainingMinutes: number;
  contingencyRemainingMinutes: number;
  availableResources: ResourceSnapshot[];
  locations: LocationSnapshot[];
  budgetConstraints: BudgetConstraint[];
  dependencies: DependencySnapshot[];
  weeklyTargets: WeeklyTargetSnapshot[];
  domainContext: HomeContext | FitnessContext | LearningContext | TravelContext | GenericContext;
}
```

## 5. Option families

1. **Full recovery today** — perform original task in a later feasible window.
2. **Equivalent substitute** — use a domain-approved alternative that preserves the intended outcome.
3. **Minimum viable version** — meaningful reduced scope with distinct completion status.
4. **Recovery-window move** — schedule within the allowed future window.
5. **Split recovery** — divide work when splitting is allowed and useful.
6. **Intentional skip** — record the miss, reason, and impact; adjust weekly expectations.
7. **Clarify/block** — no feasible option until missing information or resource is resolved.

The engine does not generate every family when inappropriate.

## 6. Feasibility gates

An option is infeasible when:

- It overlaps a fixed event.
- Required duration plus buffers cannot fit.
- Required resource, location, or funds are unavailable.
- A dependency remains blocked.
- It violates a user-entered safety constraint.
- It pushes daily committed load above the hard overload ceiling.
- It exceeds the recovery window.
- It requires an external write or purchase that is not approved.

## 7. Ranking

For each feasible option:

```text
recovery_value =
  25% outcome preservation
+ 20% schedule fit
+ 15% weekly target preservation
+ 10% energy compatibility
+ 10% dependency protection
+ 10% low displacement cost
+ 5% low financial cost
+ 5% confidence
```

Penalties:

- Up to 25 for harmful overload
- Up to 15 for excessive travel/transition
- Up to 15 for displacing a higher-consequence commitment
- Up to 10 for using most remaining contingency

Scores rank options; explanations and hard gates matter more than decimal differences.

## 8. Displaced-work analysis

For each proposed interval, recalculate the day plan and report:

- Tasks moved
- Tasks made unschedulable
- Contingency consumed
- Rest or meal buffers reduced
- New deadline risk
- Added cost or travel

An option that silently pushes another task off the day is invalid.

## 9. Domain adapters

### Fitness

Inputs:

- Original workout type and duration
- Gym travel time and user-entered operating constraints
- Home equipment
- Minimum workout template
- Current energy
- Weekly frequency target
- User-entered recovery and pain constraints

Options may include full gym session, equivalent home template, minimum viable session, recovery-window move, or intentional skip. The adapter does not invent exercises outside approved templates and does not diagnose pain.

### Laundry

Inputs:

- Load count
- Machine/location availability
- Active versus passive time
- Required supplies
- Need-by date

Options may split wash/dry/fold, use a minimum “start one essential load,” move folding separately, or reschedule within a clothing need-by window. The system must not count starting a machine as fully completed laundry.

### Cleaning

Inputs:

- Zone definition of done
- Current room state
- Supplies
- Full and minimum duration

Minimum version must have a concrete result such as clear surfaces, remove trash, and sanitize priority area—not “clean for two minutes.”

### Learning

Inputs:

- Objective, source, practice, evidence, review date

A substitute preserves the learning outcome, such as a 25-minute chart-review drill instead of a 60-minute lesson. Passive video watching cannot substitute for required practice unless the objective allows it.

### Packing and travel

Inputs:

- Confirmed trip dates
- Category dependencies
- Purchase lead times
- document deadlines

When dates are unverified, recovery options prioritize confirmation and inventory rather than creating false deadlines.

### Administrative work

Inputs:

- Office/provider hours entered or synchronized
- Required documents
- deadline and consequence

The engine may create a preparatory action when the external office is closed.

### Shopping and meal preparation

Inputs:

- Budget, store/resource availability, ingredient or item need-by date

No option may execute a purchase. Budget-incompatible options are blocked.

## 10. Recovery state changes

Selecting an option runs one transaction that:

- Creates `recovery_selection`.
- Updates the missed task status or creates a successor task.
- Creates schedule proposal items where required.
- Updates the daily plan version.
- Records the root cause.
- Records displaced items and warnings.
- Writes audit and decision links.

Calendar side effects remain separate pending approval.

## 11. Commands

### “I missed my workout”

1. Resolve the intended session from current day or ask the user to select when ambiguous.
2. Create or confirm missed commitment.
3. Load fitness adapter context.
4. Generate ranked options.
5. Present duration, location, equipment, displacement, and weekly impact.
6. Apply selected internal changes; create approval for Calendar write.

### “I missed this task”

Same shared flow using the task’s domain adapter or generic adapter.

### “Rebuild today”

Recalculate open windows and priorities, include active missed commitments, and generate a new daily plan version. Existing approved external events are fixed; unexecuted proposals may become stale.

## 12. Constructive pushback

The engine says no when recovery would create a worse plan. Example:

> A full gym session no longer fits without cutting the travel buffer before your fixed event and pushing packing past its deadline. The best recovery is the approved 25-minute home template, or moving the full session to tomorrow. Forcing the gym tonight is not a disciplined plan; it is schedule debt wearing sneakers.

## 13. Learning from misses, Phase 2

After sufficient observations, analyze:

- Estimate error by task type
- Miss rate by time of day
- Root-cause frequency
- Recovery choice effectiveness
- Repeated resource friction
- Overcommitment patterns

Recommendations remain suggestions. The system does not label the user lazy or infer a diagnosis.

## 14. Acceptance examples

### Missed morning workout

Given a missed 60-minute gym workout, 20 minutes travel each way, one 45-minute evening window, home equipment, low energy, and a weekly target at risk:

- Full gym today: infeasible.
- 35-minute home substitute: feasible but may exceed low-energy tolerance.
- 20-minute minimum template: feasible, lowest displacement.
- Full session tomorrow: feasible if weekly overload remains acceptable.
- Skip: feasible, records frequency impact.

### Missed laundry

Given two loads, 30 active minutes, 120 passive minutes, and 40 minutes before a fixed event:

- Complete all laundry: infeasible.
- Start essential load and schedule transfer/fold windows: feasible if machine access remains available.
- Minimum version “sort and start essential load”: partial, not complete.
- Move all work tomorrow: rank depends on clothing need-by date.
