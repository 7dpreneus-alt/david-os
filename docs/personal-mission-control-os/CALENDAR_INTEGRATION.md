# Google Calendar Integration

## 1. Scope by phase

### Phase 1

- OAuth connection
- Calendar list read
- Calendar selection
- Initial and incremental event synchronization
- Manual sync
- Local event mirror
- Open-window calculation
- Task-event linking
- Internal schedule proposals
- Approval workflow
- Disconnect and data deletion

### Phase 2

- Approved event create/update/delete
- Background sync
- Google push notification channels
- Channel renewal
- Delivery-failure monitoring

The deployed app uses its own Google Cloud project and OAuth credentials. ChatGPT, Google Calendar connectors, or developer workstation login do not power the deployed integration.

## 2. OAuth design

Use Google OAuth 2.0 authorization-code flow from server-controlled callback routes.

### Scopes

Request scopes incrementally:

**Read milestone**

- OpenID identity scopes required for account linking as configured
- Calendar list read scope
- Calendar events read-only scope

**Write milestone**

- Request the narrowest event write scope that supports approved event operations

Do not request broad Calendar ownership scopes when event-level scopes suffice. Store the exact granted scope set and show it in Settings.

### OAuth protections

- Generate cryptographically random `state` and bind it to the authenticated user and intended redirect.
- Use PKCE when supported by the chosen library and flow.
- Restrict redirect URIs exactly in Google Cloud.
- Use `access_type=offline` when a refresh token is needed.
- Do not log authorization codes, access tokens, or refresh tokens.
- Reject callback state reuse and expiration.
- Link a Google account only to the authenticated product account that initiated the flow.

## 3. Token handling

`calendar_connections` stores:

- Google subject/account identifier
- Granted scopes
- Access-token expiry
- Encrypted access token only if needed between requests
- Encrypted refresh token
- Encryption key version
- Connection state
- Last refresh error

Tokens are encrypted in the server before database insertion with authenticated encryption. The encryption key lives only in server environment variables. Key rotation decrypts with the recorded old version and re-encrypts with the active key.

The browser never receives a refresh token. The service-role key cannot be used by client bundles.

## 4. Calendar selection

After connection:

1. Fetch CalendarList.
2. Store provider calendar ID, summary, timezone, access role, primary flag, and selected flag.
3. Default-select the primary calendar only; ask before selecting others.
4. Read-only calendars can be synchronized but not chosen as write targets.
5. The user can pause synchronization per calendar without disconnecting the account.

## 5. Event mirror

Preserve:

- Provider event ID
- Calendar ID
- ETag
- `updated` timestamp
- Status
- Summary and description according to privacy settings
- Start/end or all-day dates
- Event timezone
- Recurrence rules
- Recurring master ID
- Original start time for instances
- Location
- Transparency/free-busy behavior
- Attendee response only when scope and privacy allow
- Creator/organizer identifiers in minimized form
- Deleted/canceled state
- Raw hash for change detection, not unrestricted raw payload retention

Unique identity:

```text
(user_id, connection_id, provider_calendar_id, provider_event_id, recurrence_instance_key)
```

For non-recurring events, `recurrence_instance_key` is an empty canonical value.

## 6. Initial synchronization

- Use a bounded historical window, initially 90 days past to 365 days future, configurable.
- Request pages until complete.
- Upsert each event transactionally in batches.
- Store `nextSyncToken` only after the final page and successful reconciliation.
- Mark the sync run successful with counts and duration.

Large calendars may process in batches, but the cursor advances only after all batches succeed.

## 7. Incremental synchronization

- Use the exact compatible query shape associated with the stored sync token.
- Process all pages using the same sync token plus page token.
- Incremental results include deleted events; reconcile them.
- Persist the replacement sync token only after the last page.
- On HTTP 410, mark the cursor invalid and perform a controlled full resync. Do not blindly append a second copy of events.

## 8. Sync concurrency and idempotency

- Acquire a database lease per external calendar.
- If a valid lease exists, return the active run rather than starting another.
- Webhook, manual, and cron triggers all converge on the same `requestSync` command.
- Upserts compare provider identity and revision fields.
- A sync run can be safely retried.
- A page retry cannot create duplicates.

## 9. Deleted-event reconciliation

Provider-deleted or canceled events are marked `is_deleted=true`, store deletion time, and disappear from active planning. Internal links remain for history and can show “source event deleted.”

If an internally linked event disappears, the linked task returns to an unscheduled or attention-needed state; it is not auto-completed or deleted.

## 10. Timezone correctness

- Store UTC instants plus IANA timezone.
- Preserve all-day dates as dates.
- Treat Google all-day end dates as exclusive.
- Convert to the user home timezone only for daily grouping and display.
- Show source timezone for travel events.
- Recompute open windows using the timezone selected for the planning day.
- Test spring-forward, fall-back, cross-midnight, all-day, recurring, and travel cases.

## 11. Fixed versus flexible

Provider events are fixed by default. An event becomes flexible only when:

- The event was created by Mission Control and carries verified private metadata or a database link; or
- The user explicitly marks the linked event as flexible.

The UI never assumes that a Google event titled “Workout” is movable.

## 12. Proposals and approvals

A schedule proposal contains:

- Target calendar
- Operation: create, update, move, split, or delete
- Current provider state and ETag
- Proposed state
- Reason
- Affected tasks and events
- Conflicts
- Buffers and travel effect
- Expiration time
- Engine version

Before execution:

1. Confirm approval belongs to current user.
2. Refetch target event or free/busy state.
3. Compare ETag/current state.
4. Recheck conflict and policy rules.
5. If changed, mark proposal stale and require regeneration.
6. Execute with provider request ID or stored idempotency mapping.
7. Record provider result and update mirror.

## 13. Event creation idempotency

Mission Control generates a stable operation UUID and stores it before the provider call. Created events include a private extended property such as `pmcosOperationId` when supported. Before retrying an uncertain create, search by operation metadata or consult the stored provider event ID.

Never rely on event title and time as the deduplication key.

## 14. Conflict detection

Conflicts include:

- Overlap with fixed busy event
- Missing transition buffer
- Missing travel time between locations
- Outside configured availability
- Over daily capacity
- Event changed since proposal
- Write target permission lost
- Recurrence edit scope ambiguity

The user may override soft conflicts with a reason. Hard conflicts such as no permission or invalid time range cannot be overridden.

## 15. Rate limits and retries

- Classify 401/invalid grant as reconnect required.
- Use bounded exponential backoff with jitter for 403 usage limits, 429, and eligible 5xx responses.
- Respect `Retry-After` when present.
- Do not retry validation or permission failures indefinitely.
- Randomize background sync schedules rather than synchronizing every account at the exact same minute.
- Show a degraded sync state after retry exhaustion.

## 16. Push notifications, Phase 2

Google push messages indicate that a resource changed; they do not contain full event data. The webhook:

- Validates HTTPS route, channel ID, resource ID, and channel token.
- Accepts and returns quickly.
- Marks the calendar `sync_needed` or enqueues an idempotent sync job.
- Handles the initial `sync` state.
- Does not assume message numbers are sequential.
- Continues periodic reconciliation because push delivery is not guaranteed.

Watch channels expire and require explicit renewal with a new unique channel ID. Store expiration and renew before expiry with overlap. Disconnect stops channels where possible.

## 17. Disconnect and deletion

Disconnect action:

1. Requires recent authentication and confirmation.
2. Stops active watch channels where possible.
3. Revokes Google token where possible.
4. Deletes encrypted tokens immediately.
5. Marks connection disconnected.
6. Lets the user choose whether mirrored events are deleted immediately or retained as disconnected history for a limited period.
7. Removes selected write targets.
8. Records an audit event.

Account deletion always purges mirrored event content and connection metadata according to policy.

## 18. Required tests

- OAuth state mismatch and replay
- Refresh-token rotation and invalid grant
- Initial multi-page sync
- Incremental multi-page sync
- HTTP 410 full resync
- Deleted event
- Recurring master and modified instance
- All-day event exclusive end
- DST spring and fall
- Duplicate manual sync requests
- Webhook duplication and out-of-order messages
- Proposal stale ETag
- Create retry after network timeout
- Disconnect and token purge
