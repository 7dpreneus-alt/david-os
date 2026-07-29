# Design System

## 1. Experience principles

- Calm before clever
- Three priorities, not thirty
- State is visible
- Actions are reversible where practical
- External side effects look different from internal edits
- Warnings explain consequences without scolding
- Mobile paths require fewer taps than desktop decoration requires pixels

## 2. Visual foundation

### Typography

Use a system or licensed variable sans font with strong mobile legibility. Default body size is 16px. Secondary metadata does not fall below 13px. Numeric time and score displays use tabular figures.

Scale:

- Display: 32/38
- Page title: 26/32
- Section title: 20/26
- Body: 16/24
- Secondary: 14/20
- Compact metadata: 13/18

### Spacing

4px base grid. Common spacing: 4, 8, 12, 16, 20, 24, 32, 40. Mobile page gutters: 16px. Desktop content width is constrained; do not stretch operational lists across a television.

### Shape and elevation

- Radius: 10px for controls, 14px for surfaces, pill only for compact status.
- Use borders and spacing before shadow.
- Modal elevation is reserved for blocking decisions and approvals.

### Color roles

Do not hard-code semantic meaning to brand hue alone.

- Canvas
- Surface
- Elevated surface
- Primary text
- Secondary text
- Border
- Accent/action
- Success
- Warning
- Critical
- Info
- Fixed Calendar event
- Internal planned task
- Proposed change
- Stale/unknown

Each semantic pair must pass WCAG contrast. Status uses icon/text in addition to color.

## 3. Main screen hierarchy

Order:

1. Date, timezone, sync state, and energy quick check
2. “Do now” recommendation
3. Top three outcomes
4. Next fixed commitment and open window
5. At-risk and recovery items
6. Domain status strip: Home, Fitness, Learning, Travel
7. Pending approvals
8. Secondary deadlines and opportunities

Do not render every module as an equally loud card. Use one main surface and compact sections.

## 4. Core components

### Status badge

Values: confirmed, proposed, stale, blocked, unverified, starter, requires credentials, deferred, failed. Badge always has accessible text.

### Sync indicator

Shows provider, last success, current run, selected-calendar count, and error action. Never use a green dot without timestamp.

### Outcome row

Contains rank 1–3, title, reason, time fit, and action. It does not expose a fake precision score by default.

### Now recommendation

Shows action, expected duration, location, why now, what to ignore, and one primary button. Secondary action opens explanation.

### Open-window strip

Timeline of fixed event, buffers, available window, and proposals. Fixed and proposed states are visually distinct and keyboard inspectable.

### Proposal diff

Before/after time, timezone, affected task/event, displaced work, conflicts, expiration, approve/reject. Approval button remains disabled while revalidation is pending.

### Recovery option

Rank, option type, duration, location, weekly effect, displacement, warnings, and selection action. Infeasible options may be shown collapsed with reason.

### Capture composer

One-line entry with optional type button. Enter saves; expanded fields are progressive. Offline state is explicit: queued, syncing, saved, or failed.

### Empty state

Contains truth, next action, and optional starter-data import. No decorative illustration is required.

### Error state

States what failed, what remains safe, last known success, retry action, and support diagnostic ID.

## 5. Forms

- Labels above fields, not placeholder-only.
- Keep typed value after validation failure.
- Use appropriate mobile keyboards.
- Dates show timezone impact.
- Unknown is a valid value where the domain permits it.
- Costs distinguish unknown from $0.
- Duration has quick presets plus exact entry.
- Destructive buttons are not adjacent to routine save actions.

## 6. Mobile interactions

- Bottom navigation has five items maximum.
- Primary actions are thumb reachable.
- Drag-and-drop is optional enhancement; every operation has a non-drag alternative.
- Swipe actions require confirmation or undo and are never the only path.
- Calendar day view supports vertical scroll without horizontal precision dragging as a requirement.
- Capture is usable one-handed.

## 7. Desktop interactions

- Keyboard shortcuts: capture, search, plan day, open approvals, mark complete, undo.
- Command palette lists only implemented commands.
- Split views may show registry and detail, but mobile maintains full capability.
- Hover is supplementary, never required.

## 8. Accessibility

Target WCAG 2.2 AA.

- Logical heading structure
- Visible focus indicator
- Skip link
- Semantic buttons and links
- Dialog focus trap and return
- Live region for save/sync result
- Error summary linked to fields
- 44px touch targets where practical
- Reduced-motion mode
- No timer-only interaction without extension
- Charts have textual equivalents
- Timeline content is available as a list

## 9. Motion

Motion is brief and functional:

- 120–180 ms state transitions
- No springy celebration for routine completion
- Reduced-motion removes nonessential movement
- Loading skeletons do not shimmer aggressively
- Plan rebuild shows changed rows, not a theatrical full-page animation

## 10. Content style

Direct, specific, nonjudgmental.

Good:

> Today is over capacity by 75 minutes. Move the bedroom reset, shrink the workout, or accept that packing becomes at risk.

Bad:

> You’re falling behind! Complete more tasks to save your streak.

## 11. System-status language

- “Calendar last synced 18 minutes ago.”
- “Calendar data may be stale. Planning used the last successful sync.”
- “Proposed; Google Calendar has not changed.”
- “Approved, but execution failed. Your Google event is unchanged.”
- “Starter data; remove or edit.”

## 12. Loading, empty, error, and permission matrix

Every feature ticket must include all four states. Permission states include unauthenticated, authenticated without provider connection, connected without scope, and connected without resource access.

## 13. Responsive acceptance

Critical paths are tested at:

- 360×800
- 390×844
- 430×932
- 768×1024
- 1280×800
- 1440×900

No horizontal page scroll, clipped dialogs, inaccessible bottom actions, or desktop-only hover controls.
