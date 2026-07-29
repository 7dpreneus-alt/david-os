# Environment Variables

## Rules

- Validate all variables at server startup with Zod.
- Production and preview use separate Supabase and Google projects.
- Never expose secrets through `NEXT_PUBLIC_` names.
- Do not provide fake defaults for credentials.
- Feature flags default to disabled when required credentials are absent.
- Secret rotation is documented and tested.

## Required in all deployed environments

| Variable | Scope | Purpose | Validation |
|---|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | client-safe | Product display name | Non-empty; default may be `Personal Mission Control OS` |
| `NEXT_PUBLIC_APP_ENV` | client-safe | `development`, `preview`, or `production` | Enum |
| `NEXT_PUBLIC_SUPABASE_URL` | client-safe | Supabase project URL | HTTPS URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client-safe | Supabase publishable/anon key | Non-empty; not service role |
| `APP_URL` | server | Canonical origin used for callbacks and links | HTTPS outside local development |
| `SUPABASE_SERVICE_ROLE_KEY` | server secret | Administrative server operations only | Non-empty; never client bundled |
| `DATABASE_URL` | server secret | Pooled application database connection if used | PostgreSQL URL |
| `DIRECT_DATABASE_URL` | migration secret | Direct connection for migrations and maintenance | PostgreSQL URL; not used by browser/runtime reads |
| `LOG_LEVEL` | server | Structured log threshold | `debug`, `info`, `warn`, `error` |

## Google Calendar, required for Calendar milestone

| Variable | Scope | Purpose | Validation |
|---|---|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | server secret/config | OAuth client identifier | Non-empty |
| `GOOGLE_OAUTH_CLIENT_SECRET` | server secret | OAuth client secret | Non-empty |
| `GOOGLE_OAUTH_REDIRECT_URI` | server config | Exact callback URI registered with Google | Must equal `${APP_URL}/api/v1/calendar/google/callback` unless route intentionally changed |
| `GOOGLE_OAUTH_STATE_SECRET` | server secret | Sign/encrypt OAuth state | At least 32 random bytes, encoded |
| `TOKEN_ENCRYPTION_ACTIVE_VERSION` | server config | Active token key version | Positive integer |
| `TOKEN_ENCRYPTION_KEY_V1` | server secret | 32-byte authenticated-encryption key | Base64 decode length exactly 32 bytes |

For key rotation add `TOKEN_ENCRYPTION_KEY_V2`, set active version to 2, retain V1 until every row is re-encrypted, then remove V1 after verification.

Do not encode scopes solely in environment variables. Keep approved scope constants in code and test them. Environment may provide a feature flag for write scope.

## Background jobs, Phase 2

| Variable | Scope | Purpose | Validation |
|---|---|---|---|
| `CRON_SECRET` | server secret | Authenticate Vercel Cron requests | At least 16 random characters; prefer 32+ bytes |
| `JOB_LEASE_SECONDS` | server config | Job lease length | Integer 30–900 |
| `JOB_MAX_ATTEMPTS` | server config | Default bounded retries | Integer 1–10 |
| `GOOGLE_WEBHOOK_BASE_URL` | server config | Public HTTPS webhook origin | HTTPS production URL |
| `GOOGLE_CHANNEL_TOKEN_SECRET` | server secret | Generate/verify watch-channel tokens | At least 32 random bytes |

## Error monitoring

| Variable | Scope | Purpose | Validation |
|---|---|---|---|
| `SENTRY_DSN` | server/client-safe only if configured intentionally | Error ingestion endpoint | URL; optional |
| `SENTRY_AUTH_TOKEN` | build secret | Release/source-map upload | Optional, server/build only |
| `SENTRY_ORG` | build config | Organization slug | Required when auth token enabled |
| `SENTRY_PROJECT` | build config | Project slug | Required when auth token enabled |

Before enabling, configure scrubbers and test that task titles, notes, Calendar content, tokens, and confirmations are excluded.

## Email notifications, optional Phase 2

| Variable | Scope | Purpose | Validation |
|---|---|---|---|
| `EMAIL_PROVIDER` | server config | `disabled` or `resend` initially | Enum |
| `RESEND_API_KEY` | server secret | Email API credential | Required only when provider is `resend` |
| `EMAIL_FROM` | server config | Verified sender | Valid mailbox on verified domain |
| `EMAIL_REPLY_TO` | server config | Reply address | Optional valid email |

## Feature flags

| Variable | Default | Meaning |
|---|---:|---|
| `FEATURE_CALENDAR_READ` | `false` | Enable connect and read sync only when credentials and tests exist |
| `FEATURE_CALENDAR_WRITE` | `false` | Phase 2; approval execution |
| `FEATURE_BACKGROUND_JOBS` | `false` | Phase 2 dispatcher and cron |
| `FEATURE_BROWSER_NOTIFICATIONS` | `false` | Phase 2 browser delivery |
| `FEATURE_EMAIL_NOTIFICATIONS` | `false` | Phase 2 provider delivery |
| `FEATURE_WEEKLY_REVIEW` | `false` | Phase 2 generated review |
| `FEATURE_OPPORTUNITY_RADAR` | `false` | Phase 3 only |
| `FEATURE_STARTER_DATA` | `true` | Allow explicit labeled starter installation |
| `FEATURE_ACCOUNT_DELETION` | `false` until tested | Must not appear enabled before end-to-end proof |

Flags are parsed as strict booleans. A feature route must return a typed disabled response when false.

## Local-only variables

- `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and related Supabase local configuration only if Supabase social login is separately used; do not confuse it with Calendar OAuth.
- `E2E_BASE_URL`
- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`
- `GOOGLE_TEST_CALENDAR_ID`
- Secure test-account credentials stored in CI secrets, never `.env.example`.

## `.env.example`

The repository may include names and safe descriptions but no secret-shaped example values. Use blank values and comments. Do not commit `.env.local`, provider JSON credentials, database dumps, or encryption keys.

## Startup validation behavior

- Missing core Supabase variables: fail startup/build clearly.
- Missing Calendar variables while feature disabled: start normally and show disabled status.
- Missing Calendar variables while feature enabled: fail startup.
- Invalid encryption key length: fail startup.
- Production `APP_URL` using HTTP or localhost: fail startup.
- Production with account deletion flag enabled but deletion tests not recorded: deployment checklist failure, enforced outside runtime.
