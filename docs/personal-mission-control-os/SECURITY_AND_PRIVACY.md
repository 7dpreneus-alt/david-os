# Security and Privacy

## 1. Security objective

Protect a highly personal operational dataset containing calendar details, routines, travel plans, financial constraints, home concerns, and decision history. Security is part of product correctness, not a deployment afterthought.

## 2. Threat model

Primary threats:

- Cross-account data access
- OAuth token theft
- Session hijacking
- CSRF and OAuth callback manipulation
- Calendar duplicate or unauthorized writes
- Background-job replay
- Prompt injection from opportunity content
- Sensitive data leakage into logs, analytics, browser caches, or notifications
- Malicious links and attachments
- Accidental destructive bulk actions
- Dependency and framework vulnerabilities
- Service-role key exposure
- Insecure exports and account deletion gaps
- Lost or stale provider synchronization presented as truth

## 3. Authentication

- Use Supabase Auth with secure, HTTP-only, same-site cookies through supported server-side helpers.
- Enforce email verification according to deployment policy.
- Support optional MFA when available; require recent authentication for account deletion, OAuth disconnect, export, and future high-risk actions.
- Rotate sessions on privilege-sensitive changes.
- Rate-limit sign-in, password reset, OAuth initiation, and callback failures.
- Do not reveal whether an account exists in password-reset responses.

## 4. Authorization

- Every user-owned table includes `user_id` and RLS.
- Every exposed view uses security-invoker behavior or is accessed only through server routes.
- Sensitive tables have RLS enabled with no direct authenticated policy; server services authenticate the user and scope queries explicitly.
- Service-role access is isolated to server code and scheduled jobs.
- Domain services check ownership even when RLS is expected to protect the query.
- Automated tests include negative cross-user reads and writes.

## 5. OAuth security

- Least-privilege Calendar scopes, requested incrementally.
- Exact redirect URI allowlist.
- Random, single-use OAuth state bound to user and return path.
- PKCE when supported.
- Refresh tokens encrypted with authenticated encryption before storage.
- Encryption keys remain server-only and are versioned for rotation.
- Tokens are redacted from logs and error tools.
- Disconnect revokes where possible and deletes tokens immediately.
- Provider unauthorized/invalid-grant errors move the connection to reconnect-required; no endless retries.

## 6. Secret management

### Vercel environment

Use sensitive environment variables for:

- Supabase service-role key
- Database direct URL
- Google client secret
- token-encryption keys
- cron secret
- webhook signing/channel secrets
- error-monitoring auth token
- email provider key

Environment variables are separated by development, preview, and production. Preview never uses production OAuth credentials or production database.

### Supabase Vault

Vault may hold secrets used directly by database functions or webhooks. Access to decrypted views is restricted to server roles. Application OAuth tokens remain encrypted per user and are not placed in a globally readable secret name.

## 7. Data minimization

- Store only Calendar fields needed for planning and display.
- Provide a privacy setting to omit event descriptions from the mirror.
- Mask provider email and trip confirmation numbers in list views.
- Avoid storing raw opportunity pages unless required; prefer normalized facts plus content hash.
- Rolling state exports exclude secrets, deleted content, full event descriptions, and sensitive confirmations.
- Logs contain IDs and error classes, not personal titles or notes.

## 8. Encryption

- TLS for all network traffic.
- Provider and hosting encryption at rest.
- Application-layer authenticated encryption for OAuth refresh tokens and highly sensitive trip details.
- Separate encryption-key version stored with ciphertext.
- Rotation procedure tested before production launch.
- Do not implement custom cryptographic algorithms; use a maintained library and random nonces.

## 9. Input and output security

- Zod validation at every external boundary.
- Parameterized queries or typed Supabase calls; no string-built user SQL.
- React output escaping plus explicit sanitization for any rendered external HTML.
- URL allow/deny checks and safe link attributes.
- Maximum lengths and payload-size limits.
- MIME and content validation for future uploads.
- Spreadsheet-formula neutralization in exports where CSV is offered.

## 10. Prompt-injection defense

Opportunity and imported content is data, never authority.

- Model prompts delimit retrieved content and instruct that it cannot change system rules.
- Retrieved text cannot select tools, scopes, recipients, or external actions.
- Model tools are allowlisted and read-only for opportunity analysis.
- Sensitive context is minimized before model calls.
- Structured normalization occurs before scoring.
- Any suggested external action becomes an internal proposal requiring user approval.
- Injection test corpus includes requests to reveal secrets, ignore rules, message third parties, purchase, submit forms, and rewrite deadlines.

## 11. External-write controls

Initial policy:

- No Calendar write without explicit approval.
- No messages without explicit approval.
- No purchases or bookings.
- No grant submissions.
- No trading orders.
- No destructive bulk action without confirmation.

Approval records contain exact diff and expire. Execution revalidates current state to prevent time-of-check/time-of-use errors.

## 12. Idempotency and replay protection

- Every mutation accepts a user-scoped idempotency key.
- Provider writes store operation UUID and provider identity.
- Cron endpoints require `CRON_SECRET` and create unique job runs.
- Google webhook channel IDs and tokens are validated.
- OAuth state is single-use.
- Signed links include purpose, subject, nonce, and expiration.

## 13. Audit logging

Audit events are append-only and record:

- Authentication-sensitive actions
- Calendar connect/disconnect
- Token refresh status without token value
- External write approval and execution
- Export and account deletion
- Feature-flag change
- Job dead letter
- Security setting change

Audit metadata is minimized. Users can inspect a human-readable security activity view.

## 14. Privacy controls

Settings must provide:

- Calendar scope and selected calendars
- Description-sync preference
- Notification privacy level
- Starter-data removal
- Data export
- Calendar disconnect and mirror-retention choice
- Account deletion
- Opportunity-source disclosure
- Analytics consent state

## 15. Export

Export contains JSON and optional CSV files organized by entity. It includes schema version and generated time. Secrets and encrypted blobs are excluded. The export artifact uses a short-lived signed download and is automatically deleted from temporary storage.

## 16. Account deletion

Deletion workflow:

1. Require recent authentication and explicit typed confirmation.
2. Freeze new background jobs.
3. Stop Calendar watch channels.
4. Attempt provider token revocation.
5. Delete OAuth tokens.
6. Delete or anonymize owned data in dependency-safe order.
7. Invalidate sessions.
8. Delete temporary exports.
9. Record a minimal deletion receipt separate from personal content where legally permitted.
10. Verify no orphan records remain.

Failure is visible and retryable; the UI does not claim deletion succeeded before completion.

## 17. Dependency and supply-chain security

- Lockfile committed.
- Dependabot or Renovate configured.
- CI runs vulnerability audit, typecheck, tests, and build.
- Next.js and React security advisories are reviewed before release; patched stable releases are mandatory.
- No preview/canary dependencies in production.
- Third-party packages require active maintenance, license review, and necessity.
- Avoid a large PWA plugin when a small audited service worker is sufficient.

## 18. Security headers

Configure at minimum:

- Content-Security-Policy, with nonces or hashes and narrow external origins
- Strict-Transport-Security
- X-Content-Type-Options: nosniff
- Referrer-Policy
- Permissions-Policy
- Frame-ancestors through CSP
- Secure cookie attributes

CSP rollout begins in report-only mode in preview, then enforced before production acceptance.

## 19. Incident response

- Severity classification and owner
- Ability to disable Calendar writes, jobs, email, browser push, and Opportunity Radar independently
- Token and key rotation runbook
- User notification template reviewed by legal/owner if needed
- Preserve security logs without personal content
- Post-incident root cause and regression test

## 20. Security acceptance gate

No production release with:

- Missing RLS on an exposed relation
- Cross-user test failure
- Client-visible service-role or OAuth secret
- Unencrypted refresh tokens
- Unbounded webhook or cron replay
- External write bypassing approval
- Critical dependency advisory
- Account deletion that only hides the UI record
