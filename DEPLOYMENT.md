# Deployment

How to get a working URL for Personal Mission Control OS on Vercel.

Everything except two secrets is already done: the Supabase project exists and
the full schema is applied to it. You supply the database password and the
service-role key, because neither is retrievable through the Supabase management
API.

---

## 1. What already exists

| Thing | Status |
|---|---|
| Supabase project | `mission-control-os`, ref `wkgvjnwuuefbhtefjowx`, region `us-east-1` |
| Database schema | **Applied.** 54 tables, 181 RLS policies, 0 tables without RLS, 0 grants to `anon` |
| Code | Pushed to `claude/mission-control-os-build-zxfcto` |
| Production build | Verified against the exact env block below |

No migration step is needed for the first deploy.

---

## 2. Import the repository

In Vercel: **Add New → Project → Import** `7dpreneus-alt/david-os`.

| Setting | Value |
|---|---|
| Root Directory | `./` — the repository root. **Not** `nextjs-version/`; that is an unrelated template. |
| Framework Preset | Next.js (auto-detected) |
| Build Command | default (`next build`) |
| Install Command | default — pnpm is detected from `pnpm-lock.yaml` |
| Node.js Version | 22.x |
| Branch | `claude/mission-control-os-build-zxfcto` |

---

## 3. Environment variables

Add these under **Settings → Environment Variables**, scoped to **Production**
and **Preview**. Copy the block verbatim, then fill the two marked `← YOU`.

```
NEXT_PUBLIC_APP_ENV=production
APP_URL=https://<your-vercel-domain>
LOG_LEVEL=info

AUTH_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://wkgvjnwuuefbhtefjowx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_8qmWOBzaCXYet9NanDyvIA_8v2g2Yat

DATABASE_URL=                  ← YOU
SUPABASE_SERVICE_ROLE_KEY=     ← YOU

FEATURE_STARTER_DATA=true
FEATURE_CALENDAR_READ=false
FEATURE_CALENDAR_WRITE=false
FEATURE_ACCOUNT_DELETION=false
```

### Where the two secrets come from

- **`DATABASE_URL`** — Supabase → your project → **Project Settings → Database
  → Connection string → Transaction pooler**. Use the pooled URI (port `6543`),
  and replace `[YOUR-PASSWORD]` with the database password. Mark it
  **Sensitive** in Vercel.
- **`SUPABASE_SERVICE_ROLE_KEY`** — **Project Settings → API Keys →
  `service_role`**. Mark it **Sensitive**. This key bypasses RLS; it must never
  appear in a `NEXT_PUBLIC_` variable or reach the browser.

### Things that will fail the build on purpose

`lib/env.ts` validates at startup and refuses to run degraded:

- `APP_URL` on http or localhost while `NEXT_PUBLIC_APP_ENV=production`.
- `AUTH_PROVIDER=local` in preview or production.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` equal to the service-role key.
- Any missing Supabase variable while `AUTH_PROVIDER=supabase`.
- `FEATURE_CALENDAR_READ=true` without every Google credential.

A clear error naming the variable is the intended behaviour, not a bug.

---

## 4. After the first deploy

1. Open `https://<your-domain>/system/status`. Expect: database **reachable**,
   PostgreSQL 17, identity provider `supabase`, and **Public tables without RLS: 0**.
2. Open `/signup` and create an account.

**Step 2 is the real test.** The Supabase Auth path has never executed — the
build sandbox's egress policy blocks `*.supabase.co`, so all authentication was
verified through the local credential provider, which shares every downstream
code path but not the Supabase calls themselves. See `DECISION_LOG.md` D-016 and
`QA_EVIDENCE.md` §10.

If sign-up fails, likely causes in order:

- Supabase Auth requires email confirmation by default. Either confirm the email
  or turn off confirmation in **Authentication → Providers → Email** while
  testing.
- `DATABASE_URL` pointing at the direct connection (port `5432`) rather than the
  pooler (`6543`). Serverless needs the pooler.
- The service-role key pasted into the wrong variable.

---

## 5. Not configured, by design

| Feature | Why |
|---|---|
| Google Calendar | Not built. Needs `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_STATE_SECRET`, `TOKEN_ENCRYPTION_KEY_V1`, and a redirect URI of exactly `${APP_URL}/api/v1/calendar/google/callback`. |
| Background jobs / cron | Phase 2. |
| Browser and email notifications | Phase 2. |
| Account deletion | Not implemented; the flag stays false and Settings says so. |
| Sentry | Optional. Configure scrubbers before enabling — task titles, notes, and calendar content must not be sent. |

---

## 6. Rollback

Vercel keeps every deployment. To roll back, promote the previous deployment
from the project's Deployments tab.

The database has no destructive migrations in this release — every migration is
additive (`create table if not exists`, `create index if not exists`), so a code
rollback needs no schema rollback.
