# Product Requirements Document

## 1. Product summary

Personal Mission Control OS is a responsive PWA for managing commitments, tasks, projects, routines, capacity, recovery, home operations, fitness consistency, structured learning, travel preparation, decisions, and eventually high-fit external opportunities.

The first release must create daily value with real persistence and real Google Calendar read synchronization. It must not claim autonomous operation.

## 2. Goals

### Phase 1 goals

- Create and maintain a trusted registry of tasks, projects, goals, routines, milestones, and starter workflows.
- Read selected Google Calendars through the application’s own OAuth implementation.
- Identify open time using fixed events, buffers, travel assumptions, and user availability.
- Produce a daily plan with at most three dominant outcomes.
- Create internal scheduling proposals and require approval before material writes.
- Recover missed tasks with ranked, domain-aware alternatives.
- Track energy, capacity, completion, friction, and decision history.
- Work well on mobile and desktop.
- Deploy with authentication, RLS, tests, logs, error monitoring, migrations, and data controls.

### Later goals

- Phase 2: reliable calendar writes, background sync, notifications, weekly reviews, learned capacity, import/export, and analytics.
- Phase 3: verified, configurable opportunity ingestion and digests.

## 3. User roles

### Account owner

Can create, read, update, archive, export, and delete their own data; connect external services; approve external writes; configure quiet hours; and delete the account.

### System worker

A server-only role used for scheduled jobs and verified webhooks. It may access only the records required for a job and must write audit and job-run records. Service-role credentials never reach the client.

No shared household, coach, employer, or admin role is approved for Phase 1.

## 4. Functional requirements

## 4.1 Command Center

The Command Center must show:

- Current local date and timezone
- Last calendar sync status
- Today’s confirmed events
- Today’s committed tasks
- Open windows
- Top three outcomes
- At-risk commitments
- Recovery proposals
- Energy and capacity state
- Home, fitness, learning, and travel status summaries
- Upcoming deadlines
- Pending approvals
- Important opportunities when Phase 3 exists
- “What should I do now?”
- “What should I ignore?”

The system must not render a summary as current if calendar sync is stale beyond the user-configured threshold. It may show cached data with a visible stale label.

## 4.2 Inbox and rapid capture

Capture types: task, idea, purchase, errand, event, goal, opportunity, note, problem, habit, and trip requirement.

Required behavior:

- One text field is sufficient to save an inbox item.
- Optional type, date, duration, area, cost, and location may be supplied.
- Classification is a suggestion with confidence, never a silent fact.
- Potential duplicates are shown before conversion but do not block capture.
- Missing critical fields are represented as questions.
- Conversion to a task, project, event proposal, trip item, home item, or opportunity is transactional.
- Failed classification does not lose the captured text.

## 4.3 Task and project registry

Tasks support title, description, status, priority mode, dates, estimate, energy, location, cost, dependencies, consequences, recurrence, flexibility, minimum viable version, recovery policy, life area, calendar links, source, notes, last update, and definition of done.

Projects support outcomes, status, target date, budget, next action, milestones, linked goals, and health state. A project without a next action is marked stalled.

Deletion is soft by default. Permanent deletion is available through account data controls or explicit item purge.

## 4.4 Adaptive priority engine

The engine uses normalized factors and override rules defined in `PRIORITY_ENGINE.md`. It must:

- Store component scores and confidence.
- Recalculate after material changes.
- Distinguish hard constraints from ranking preferences.
- Never rank an infeasible task as “do now.”
- Explain why an item rose, fell, or was excluded.
- Permit a user pin or manual priority override with an expiration or explicit permanence.

## 4.5 Calendar and scheduling

Phase 1 requirements:

- Google OAuth connection through server routes
- Calendar list retrieval and user selection
- Initial and incremental read synchronization
- Deleted-event reconciliation
- Timezone-safe event storage
- Open-window calculation
- Task-to-event linking
- Internal schedule proposals
- Approval records
- Conflict checks at proposal creation and approval time
- Manual “sync now”
- Visible sync failures and reconnect actions
- Disconnect and deletion controls

Phase 1 does not need background sync or production calendar writes to pass the daily-core milestone, but the schema and API boundaries must support them without replacement.

## 4.6 Missed-task recovery

A task becomes recovery-eligible when its committed window ends without completion, when the user explicitly marks it missed, or when a calendar change displaces it.

The engine must:

- Evaluate remaining windows, duration, travel, resources, energy, constraints, frequency goals, dependencies, and overload.
- Produce full, substitute, minimum viable, later-window, and intentional-skip options where applicable.
- Exclude infeasible options.
- Identify displaced work caused by each option.
- Explain tradeoffs.
- Require approval for calendar changes.
- Record root cause and chosen option.

Domain adapters are required for fitness, laundry, cleaning, learning, packing, administration, shopping, and meal preparation. The shared core must also work for generic tasks.

## 4.7 Capacity and discipline

- Daily capacity is derived from open minutes, energy, fixed obligations, transition buffers, and user-configured load tolerance.
- The user can log energy as very low, low, normal, high, or very high with optional reason.
- Plans reserve a configurable contingency percentage.
- Overcommitment warnings compare committed estimated time with available capacity.
- Completion only counts when definition-of-done evidence is satisfied or the user explicitly confirms completion.
- Minimum viable versions are tracked separately from full completion.
- Miss root causes use controlled tags plus notes.
- Streaks require substantive completion and use grace rules; they are not the primary success metric.

## 4.8 Home operations

Required records:

- Rooms
- Home items
- Cleaning zones
- Maintenance records
- Purchase candidates
- Landlord/maintenance requests
- Room-use options and evaluations

The second-bedroom decision must compare workspace, workout room, guest room, rental room, and hybrid configurations across cost, income potential, privacy, lifestyle benefit, setup effort, flexibility, and reversibility. The system records weights and assumptions; it does not choose without user approval.

## 4.9 Fitness

The module manages scheduling and consistency, not health diagnosis.

It supports:

- Weekly frequency target
- Gym and home templates
- Duration and equipment
- Protected windows
- Minimum viable sessions
- Recovery requirements as user-entered constraints
- Completion history
- Missed-session recovery

Any pain, injury, or medical detail is treated as a user constraint and may reduce or block recommendations. The app must not generate rehabilitation claims.

## 4.10 Learning and trading study

Every study session requires:

- Topic
- Source
- Concrete objective
- Duration
- Practice activity
- Completion evidence
- Next action
- Review date

The UI rejects a session whose only objective is vague, such as “learn trading,” unless converted to an inbox item for clarification. Starter data uses paper-trading education and preserves the financial firewall: no rent, emergency, borrowed, or bill money.

## 4.11 Travel operations

Trips contain dates, timezone, bookings, lodging, transportation, events, packing, outfits, purchases, documents, deadlines, budget, confirmations, preparation tasks, and return reset.

Sensitive confirmation numbers are masked in list views and encrypted or isolated from browser-readable bulk queries.

Houston wedding data is inserted as editable starter data with unverified dates. No reminder becomes active until the dates are confirmed.

## 4.12 Opportunity Radar

Phase 3 only. See `OPPORTUNITY_RADAR.md`.

No opportunity may be shown as verified unless source, retrieval time, eligibility evidence, and deadline evidence are present. Retrieved content is untrusted input.

## 4.13 Notifications

Phase 1 includes in-app approval counts and system-status alerts. Phase 2 adds browser and optional email delivery.

Notifications must be actionable, deduplicated, rate-limited, quiet-hour aware, snoozable, and auditable. Failure to deliver must not be presented as delivery.

## 4.14 Weekly executive review

Phase 2 creates a review draft from persisted activity. The user approves final priorities. Metrics include wins, misses, recovery, overcommitment, time allocation, fitness, home, learning, travel, financial friction, opportunities, items to stop, and pending decisions.

## 4.15 Decision log and rolling state

Every material change may create a decision record containing context, alternatives, reason, expected outcome, actual outcome, and review date.

Rolling state is a compact JSON and Markdown snapshot containing current commitments, top outcomes, constraints, pending approvals, active risks, and recently changed decisions. It excludes secrets and full historical notes.

## 5. Required command behavior

Exact request and state-transition contracts are in `API_CONTRACTS.md`. All commands must:

- Validate the authenticated user.
- Validate input with Zod.
- Accept an idempotency key for mutations.
- Return a structured result and warnings.
- Record audit metadata.
- Never silently perform an external write.
- Return field-level errors without losing valid user input.

## 6. Nonfunctional requirements

### Security

- RLS on every exposed table and view
- No service-role key in browser code
- OAuth refresh tokens encrypted at application layer before storage
- CSRF-safe OAuth state and PKCE where supported
- Audit logs for external writes, token changes, approvals, exports, and deletion
- Rate limiting on auth, sync, capture, and webhook routes

### Reliability

- Idempotent sync, proposals, approvals, and jobs
- Transactional multi-record changes
- Retry with bounded exponential backoff
- Dead-letter state after retry exhaustion
- Stale-state indicators
- Backup and rollback procedures

### Performance

- Mobile Command Center useful content: p75 under 2.5 seconds after authentication on normal 4G
- Capture save acknowledgement: p75 under 700 ms when online
- Calendar sync runs asynchronously after request acknowledgement when data volume requires it
- Lists use pagination or bounded date windows

### Accessibility

- WCAG 2.2 AA target
- Keyboard navigation
- Visible focus
- 44px mobile touch targets where practical
- Screen-reader labels and live regions for async state
- Reduced-motion support

### Maintainability

- Domain logic outside React components
- Strict TypeScript; no untracked `any`
- Migrations are append-only after production release
- Feature flags for incomplete integrations
- Provider adapters behind interfaces

## 7. Analytics and privacy

Product analytics are opt-in or privacy-minimized. Never send task titles, notes, calendar event content, confirmation numbers, OAuth tokens, or opportunity documents to analytics. Operational logs use record IDs and event types, not personal content.

## 8. Release criteria

The application is not ready for Phase 2 until every Phase 1 acceptance criterion passes, production persistence is proven, a real Calendar account has been synchronized repeatedly without duplicates, mobile critical paths pass, and the red-team checklist has no unresolved critical finding.
