# Adaptive Priority Engine

## 1. Purpose

The priority engine ranks feasible work and explains tradeoffs. It is not a universal measure of human worth and it does not pretend that uncertain inputs create exact truth.

## 2. Pipeline

1. Load candidate tasks within the planning horizon.
2. Apply hard eligibility and feasibility filters.
3. Normalize factor inputs to 0–100.
4. Apply context-specific weights.
5. Apply confidence adjustment and penalties.
6. Apply override rules.
7. Tie-break deterministically.
8. Store a snapshot with component scores, rules version, and explanation.

## 3. Hard filters

A task is excluded from “do now” when any hard condition applies:

- Status is completed, canceled, archived, or deleted.
- Dependency is unresolved and no meaningful preparatory action exists.
- Required location or resource is unavailable.
- Estimated or minimum duration cannot fit the current window.
- User has explicitly blocked the task for the current period.
- Cost exceeds a hard budget constraint and no zero-cost/minimum option exists.
- Task conflicts with a fixed commitment.
- A safety constraint blocks the action.

Excluded tasks remain visible with reasons where relevant.

## 4. Factors and default weights

Weights total 100 before penalties. They are defaults, not permanent doctrine.

| Factor | Weight | Meaning |
|---|---:|---|
| Deadline proximity | 15 | How soon a real deadline arrives |
| Consequence of delay | 14 | Operational, relational, or contractual harm |
| Strategic value | 12 | Contribution to protected goals |
| Dependency impact | 8 | Work unblocked for other items |
| Health or safety impact | 10 | User-entered or rule-based essential impact |
| Financial impact | 8 | Cost avoided, bill risk, or budget relevance |
| Opportunity value | 4 | Time-sensitive upside; low in daily core |
| Momentum value | 5 | Benefit of maintaining meaningful continuity |
| Recovery urgency | 8 | Need to recover a missed commitment within policy |
| Energy compatibility | 5 | Match with current energy |
| Calendar fit | 6 | Clean fit in available window with buffers |
| Flexibility pressure | 3 | Low-flexibility items rise before flexible ones |
| Confidence | applied later | Reliability of input data |
| Effort/duration | penalty/fit | Cost, not a moral negative |
| Overload risk | penalty | Harm to total day or protected rest |

## 5. Normalization

### Deadline proximity

For a verified deadline:

- Overdue with consequence: 100
- Due within 24 hours: 95
- 2 days: 85
- 3–7 days: linearly 75 to 55
- 8–30 days: linearly 50 to 20
- More than 30 days: 10
- No deadline: 0 to 20 based on routine/review policy

Unverified dates cap this factor at 40.

### Consequence of delay

User-selected level mapped to score:

- negligible 5
- low 25
- moderate 50
- high 75
- severe 100

The UI requires a short reason for severe.

### Strategic value

Derived from links to protected goals and user weighting:

- no linked goal: 20 default
- ordinary goal: 50
- protected quarterly/weekly priority: 80
- explicit top outcome: 100

### Dependency impact

Use downstream unblocked work count and importance, capped at 100. Do not reward circular or inflated dependency chains.

### Health or safety impact

Only explicit user rules or configured categories may produce high values. An AI text classifier cannot independently label an item medically urgent.

### Financial impact

Use entered amounts and impact class. Unknown amount is not zero. Hard bill or loss deadline may score high; speculative upside is capped unless verified.

### Opportunity value

Uses verified fit and deadline. Unverified opportunity content is capped at 25 and cannot override core obligations.

### Momentum value

Uses meaningful recent consistency and the cost of restarting. A cosmetic streak is ignored.

### Recovery urgency

Based on recovery-window remaining, weekly frequency impact, and consequence of a second miss.

### Energy compatibility

A compatibility matrix compares task requirement and current energy:

| Current energy | Low task | Medium task | High task |
|---|---:|---:|---:|
| Very low | 100 | 35 | 0 |
| Low | 90 | 60 | 15 |
| Normal | 75 | 90 | 70 |
| High | 65 | 90 | 100 |
| Very high | 55 | 80 | 100 |

This factor does not make low-value busywork important; it only helps rank otherwise useful feasible work.

### Calendar fit

- Fits full duration plus buffers with no fragmentation: 100
- Fits with acceptable split: 75
- Only minimum viable version fits: 55
- Fits but consumes contingency below minimum: 25
- Does not fit: hard exclusion

### Flexibility pressure

Low-flexibility tasks score higher as viable windows disappear. Highly flexible tasks stay lower unless other factors dominate.

## 6. Formula

For eligible task `t`:

```text
base_score = sum(weight_i * normalized_factor_i / 100)
confidence_multiplier = 0.70 + (0.30 * confidence)
score_before_overrides = base_score * confidence_multiplier
final_score = clamp(score_before_overrides - effort_penalty - overload_penalty + override_adjustment, 0, 100)
```

Confidence ranges 0 to 1. The floor avoids completely erasing important but incomplete tasks; the UI clearly shows low confidence.

### Effort penalty

Effort is not simply “long is bad.” Apply 0–8 points based on duration relative to the current window and cognitive switching cost. A high-value long task may still rank first when it fits.

### Overload penalty

Apply 0–25 points when scheduling the task would consume contingency, displace protected rest, create excessive transitions, or push committed load beyond capacity.

## 7. Overrides

### Hard overrides

- Safety-critical user-entered item with verified deadline may rank first.
- Fixed event preparation with a near-term hard deadline may rank first.
- A task cannot override a fixed event or unavailable resource.
- Financial hard-stop prevents incompatible purchase or paid activity.

### User pin

A user pin adds up to 20 points or assigns a top-outcome slot. Pins require an expiration date or explicit permanent status. The explanation states that the user overrode the model.

### Protected routine

Protected routines receive a recovery and flexibility boost, not guaranteed first place. The engine still avoids harmful overload.

### Low-confidence cap

A task with confidence below 0.4 cannot become an automatic top-three outcome unless a hard override or user pin applies.

## 8. Tie-breaking

Within 2 score points:

1. Harder verified deadline
2. Greater consequence of delay
3. Unblocks more protected work
4. Better fit in the current window
5. Lower context-switch cost from current location/activity
6. Older last meaningful progress date
7. Stable UUID ordering for deterministic output

## 9. Recalculation triggers

- Calendar event added, moved, or deleted
- Task created, completed, missed, blocked, or unblocked
- Deadline or duration changed
- Energy check-in changed
- Work running late command
- Budget constraint changed
- Travel date or booking state changed
- Dependency state changed
- Recovery option selected
- User pin added or expired
- Day plan rebuilt

Debounce repeated low-impact changes, but recompute immediately for calendar conflicts and explicit commands.

## 10. Explanations

Every ranked result stores:

- Final score rounded to one decimal for debugging, not marketed as scientific certainty
- Top positive factors
- Penalties
- Hard constraints checked
- Confidence and missing data
- Why nearby alternatives ranked lower
- Engine version and generated time

Example:

> Pack wedding essentials is ranked first because the verified trip deadline is close, several later tasks depend on knowing what is missing, and it fits the 45-minute open window. The gym workout scored similarly but requires travel and would collide with the next fixed event. Confidence is medium because the trip dates still need confirmation.

## 11. “What should I ignore?”

Candidates are tasks that are:

- Low score and high flexibility
- Duplicates
- Blocked without an available next action
- Budget-incompatible
- Premature relative to dependencies
- Cosmetic work displacing protected priorities
- Unverified opportunity noise

Output uses actions: not today, defer to date, archive, merge, delegate, or clarify. Essential tasks cannot be silently dropped.

## 12. Calibration

Phase 1 uses fixed defaults plus user configuration. Phase 2 may suggest weight changes after at least four weeks and sufficient samples. Suggested changes require approval and show before/after ranking examples.
