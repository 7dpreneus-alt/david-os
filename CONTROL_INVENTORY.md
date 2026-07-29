# Control Inventory

Every user-facing control in the shipped application, its handler, and its test
status. A control that is not in this list must not be in the build.

**Legend for status**

- **Verified** — covered by an automated test that exercises the control.
- **Manual** — exercised by hand during development; no automated coverage yet.

Test IDs refer to `tests/e2e/core-journey.spec.ts` (E2E),
`tests/integration/*.test.ts` (INT), and `tests/unit/*.test.ts` (UNIT).

---

## /login

| Control | Purpose | Handler | Data action | Permission | Success state | Error state | Test | Status |
|---|---|---|---|---|---|---|---|---|
| Email field | Identify the account | `AuthForm` controlled input | none | public | value accepted | field-level message | E2E auth | Verified |
| Password field | Authenticate | `AuthForm` controlled input | none | public | value accepted | field-level message | E2E auth | Verified |
| Sign in | Start a session | `signInAction` | verify credential, set session cookie, write `audit_events` | public | redirect to `/today` | inline "Email or password is incorrect." | E2E "wrong credentials produce a visible error" | Verified |
| Create one (link) | Go to sign-up | `next/link` | none | public | `/signup` renders | — | E2E nav link check | Verified |

## /signup

| Control | Purpose | Handler | Data action | Permission | Success state | Error state | Test | Status |
|---|---|---|---|---|---|---|---|---|
| Display name field | Optional name | controlled input | none | public | value accepted | — | — | Manual |
| Email field | Account identity | controlled input | none | public | value accepted | "Enter a valid email address." | E2E auth | Verified |
| Password field | Credential | controlled input | none | public | value accepted | "Use at least 12 characters." | E2E "short password is rejected" | Verified |
| Install starter data checkbox | Opt in to labelled sample records | form field read by `signUpAction` | `installStarterData` | public | starter rows created, all labelled | — | E2E starter data | Verified |
| Create account | Create the account | `signUpAction` | insert `auth.users`, `profiles`, `user_preferences`, `capacity_profiles`, `audit_events` | public | redirect to `/today` | field-level message; no account created | E2E auth | Verified |
| Sign in (link) | Go to login | `next/link` | none | public | `/login` renders | — | E2E nav link check | Verified |

## Application shell (all product routes)

| Control | Purpose | Handler | Data action | Permission | Success state | Error state | Test | Status |
|---|---|---|---|---|---|---|---|---|
| Desktop nav links (6) | Navigate | `next/link` | none | authenticated | target page renders 200, `aria-current="page"` on the active item | — | E2E "every primary navigation link resolves to a real page" | Verified |
| Mobile nav links (5) | Navigate | `next/link` | none | authenticated | as above | — | E2E mobile projects | Verified |
| Sign out | End the session | `signOutAction` | delete session cookie | authenticated | redirect to `/login`; protected routes bounce back | — | E2E "sign up, sign out, and sign back in" | Verified |
| Skip to main content | Keyboard bypass | anchor to `#main` | none | any | focus moves to main | — | — | Manual |

## /today — Command Center

| Control | Purpose | Handler | Data action | Permission | Success state | Error state | Test | Status |
|---|---|---|---|---|---|---|---|---|
| Source status list | Show freshness and what is unavailable | server render from `loadCommandCenter` | read-only | owner | each source shows ok / not connected / stale with a reason | source failure is named, page stays usable | E2E "Google Calendar is not connected" | Verified |
| Complete (per outcome) | Finish a dominant outcome | `completeFromTodayAction` | update `tasks`, insert `task_completion_events`, `mutation_history`, `audit_events` | owner | task leaves the outcome list | error toast; task unchanged | INT task-crud complete | Verified |
| Current energy select | Choose an energy level | form field | none until submitted | owner | value selected | — | E2E energy check-in | Verified |
| Reason field | Explain the energy level | form field | none until submitted | owner | value accepted | — | — | Manual |
| Record check-in | Persist the energy level | `recordEnergyAction` | insert `energy_checkins`, `audit_events` | owner | page shows "Recorded … as low" | error boundary | E2E energy check-in | Verified |
| Open inbox (link) | Go to `/inbox` | `next/link` | none | owner | `/inbox` renders | — | E2E nav | Verified |
| Open tasks (empty-state button) | Go to `/tasks` | `next/link` | none | owner | `/tasks` renders | — | — | Manual |

## /inbox

| Control | Purpose | Handler | Data action | Permission | Success state | Error state | Test | Status |
|---|---|---|---|---|---|---|---|---|
| Capture textarea | Enter raw text | controlled input | none | owner | value accepted | "Capture text is required." | E2E inbox | Verified |
| Capture | Save the capture | `captureAction` | insert `inbox_items` (idempotent on `client_capture_id`), `audit_events` | owner | item appears with its suggested type | error toast; nothing lost | E2E inbox, INT "replaying the same clientCaptureId" | Verified |
| Make task | Convert to a task | `convertAction` | transactional insert `tasks` + resolve `inbox_items` | owner | item leaves the inbox, task exists | capture untouched | E2E inbox, INT conversion | Verified |
| Make project | Convert to a project | `convertAction` | insert `projects` + resolve | owner | as above | as above | INT conversion | Verified |
| Make goal | Convert to a goal | `convertAction` | insert `goals` + resolve | owner | as above | as above | INT conversion | Verified |
| Make note | Resolve as a note | `convertAction` | resolve only | owner | as above | as above | INT conversion | Verified |
| Discard | Soft-delete the capture | `discardCaptureAction` | set `inbox_items.deleted_at` | owner | item disappears | error boundary | — | Manual |

## /tasks

| Control | Purpose | Handler | Data action | Permission | Success state | Error state | Test | Status |
|---|---|---|---|---|---|---|---|---|
| Task title field | Name the task | controlled input | none | owner | value accepted | "Title is required." | E2E task lifecycle | Verified |
| Add task | Create the task | `createTaskAction` | insert `tasks`, `task_dependencies`, `mutation_history`, `audit_events` | owner | task appears; warnings listed for missing fields | field errors inline; nothing created | E2E task lifecycle, INT create | Verified |
| Add planning details (toggle) | Reveal optional fields | local state | none | owner | fields expand; `aria-expanded` updates | — | E2E validation test | Verified |
| Estimated minutes | Duration | controlled input | none | owner | value accepted | range/consistency error | E2E validation test | Verified |
| Minimum viable minutes | Reduced-scope duration | controlled input | none | owner | value accepted | "Minimum duration cannot exceed the estimate." | E2E validation test | Verified |
| Due | Deadline | controlled input | none | owner | value accepted | "Enter a valid date and time." | — | Manual |
| Project select | Link to a project | controlled input | none | owner | value accepted | "Project not found." | E2E projects | Verified |
| Energy required select | Energy match | controlled input | none | owner | value accepted | — | — | Manual |
| Flexibility select | Movability | controlled input | none | owner | value accepted | — | — | Manual |
| Consequence of delay | Consequence weight | controlled input | none | owner | value accepted | severe requires a reason | UNIT schema | Verified |
| Reason for severe consequence | Justify a severe level | controlled input | none | owner | value accepted | required above 90 | UNIT schema | Verified |
| Location | Location constraint | controlled input | none | owner | value accepted | — | — | Manual |
| Definition of done | Completion criterion | controlled input | none | owner | value accepted | — | — | Manual |
| Search field + Apply search | Filter by text | URL params, server query | read-only | owner | list narrows; count updates | invalid query falls back to defaults | E2E search | Verified |
| Status select | Filter by status | URL params | read-only | owner | list narrows | as above | INT filtering | Verified |
| Project filter | Filter by project | URL params | read-only | owner | list narrows | as above | — | Manual |
| Sort by / Direction | Order the list | URL params, closed enum | read-only | owner | order changes deterministically | as above | INT "sorts deterministically" | Verified |
| Clear filters | Reset the view | router push | read-only | owner | full list returns | — | E2E search | Verified |
| Complete | Full completion | `completeTaskAction` | update `tasks`, insert completion event, resolve open misses | owner | status becomes completed | error toast | E2E task lifecycle | Verified |
| Minimum | Minimum-viable completion | `completeTaskAction` | as above with `completion_type='minimum_viable'` | owner | recorded distinctly from full | error toast | INT "minimum-viable completion" | Verified |
| Reopen | Undo completion | `reopenTaskAction` | update `tasks`, `mutation_history` | owner | status returns to ready | error toast | E2E task lifecycle | Verified |
| Edit (toggle) | Reveal the edit form | local state derived from `task.version` | none | owner | form expands | — | E2E task lifecycle | Verified |
| Save changes | Persist edits | `updateTaskAction` | update `tasks` with version check | owner | values persist, version bumps | `VERSION_CONFLICT` message | E2E task lifecycle, INT version conflict | Verified |
| Status select (edit) | Change status | part of the edit form | update `tasks` | owner | status changes | field error | — | Manual |
| Archive | Archive the task | `archiveTaskAction` | update status to archived | owner | leaves the default list | error boundary | — | Manual |
| Delete → Yes, delete | Soft-delete after confirming | `deleteTaskAction` | set `deleted_at`, write inverse operation | owner | row disappears; undo offered | error toast | E2E task lifecycle | Verified |
| Delete → Keep | Cancel the deletion | local state | none | owner | confirmation closes | — | — | Manual |
| Undo (toast) | Restore a deleted task | `restoreTaskAction` | clear `deleted_at` | owner | task returns | error toast | INT restore | Verified |

## /projects

| Control | Purpose | Handler | Data action | Permission | Success state | Error state | Test | Status |
|---|---|---|---|---|---|---|---|---|
| Project title / Desired outcome | Define the project | controlled inputs | none | owner | values accepted | field errors | E2E projects | Verified |
| Status / Target date | Project metadata | controlled inputs | none | owner | values accepted | field errors | — | Manual |
| Create project | Create it | `createProjectAction` | insert `projects`, `audit_events` | owner | project appears, marked stalled until it has a next action | field errors | E2E projects, INT stalled | Verified |
| View tasks | Filter tasks by project | `next/link` | read-only | owner | `/tasks?projectId=…` renders | — | E2E projects | Verified |
| Delete → Yes, delete | Soft-delete after confirming | `deleteProjectAction` | set `deleted_at`, detach tasks | owner | project disappears, tasks survive | error boundary | — | Manual |
| Go to inbox (empty state) | Navigate | `next/link` | none | owner | `/inbox` renders | — | — | Manual |

## /settings

| Control | Purpose | Handler | Data action | Permission | Success state | Error state | Test | Status |
|---|---|---|---|---|---|---|---|---|
| Display name | Profile name | controlled input | none | owner | value accepted | field error | E2E preferences | Verified |
| Home timezone | Planning timezone | controlled select | none | owner | value accepted | IANA validation error | — | Manual |
| Weekday / weekend capacity | Daily capacity | controlled inputs | none | owner | values accepted | range errors | E2E preferences | Verified |
| Planning horizon, transition buffer, travel buffer, contingency, hard load ceiling | Planning parameters | controlled inputs | none | owner | values accepted | range errors | — | Manual |
| Mirror event descriptions | Privacy setting | checkbox | none | owner | value accepted | — | — | Manual |
| Save settings | Persist preferences | `savePreferencesAction` | update `profiles`, `user_preferences`, `capacity_profiles` | owner | "Settings saved."; values survive reload | field errors inline | E2E preferences | Verified |
| Install starter data | Add labelled sample records | `installStarterDataAction` | insert across 10 tables with `source='starter'` | owner | badge becomes "Installed" | error boundary | E2E starter data | Verified |
| Remove all starter data → Yes, remove | Remove them after confirming | `removeStarterDataAction` | delete `source='starter'` rows | owner | badge becomes "Not installed"; rows gone | error boundary | E2E starter data | Verified |
| Download export | Export owned data | `generateExportAction` | read 25 tables, write `audit_events` | owner | JSON file downloads with schema version | error toast | E2E export | Verified |

Settings also renders two **read-only status panels** with no controls: Google
Calendar ("Not connected", with the flag value and a statement that the
application has never written to Google Calendar) and Account deletion
("Disabled", stating the feature is not implemented). Neither offers a button,
because neither action exists.

## /system/status

Read-only. No controls. Shows environment, build SHA, identity provider, log
level, database reachability, PostgreSQL version, migration count, latest
migration, the count of public tables without RLS, and every feature flag.
Covered by E2E "system status shows the migration count and zero tables without RLS".

## API routes

| Route | Method | Auth | Idempotency-Key | Test |
|---|---|---|---|---|
| `/api/v1/health` | GET | public | no | E2E health |
| `/api/v1/tasks` | GET | required | no | E2E "unauthenticated API requests return the typed error envelope" |
| `/api/v1/tasks` | POST | required | required | E2E idempotency-key check |
| `/api/v1/tasks/[id]` | GET / PATCH / DELETE | required | required for mutations | INT via the repository |
| `/api/v1/tasks/[id]/complete` | POST | required | required | INT via the repository |
| `/api/v1/inbox` | GET / POST | required | no (uses `clientCaptureId`) | INT via the repository |
