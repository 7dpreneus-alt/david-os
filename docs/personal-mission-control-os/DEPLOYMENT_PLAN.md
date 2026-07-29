# Deployment Plan

## 1. Environments

### Local

- Supabase CLI stack
- Local Next.js server
- Synthetic seed data only
- Google OAuth local redirect client or dedicated development client
- No production credentials

### Preview

- Separate Supabase project or isolated preview strategy approved by owner
- Separate Google OAuth client and test users
- Vercel preview deployments
- Feature flags default off for external writes
- Test Calendar only

### Production

- Dedicated Supabase production project in owner-approved region
- Dedicated Google Cloud production project and verified consent/domain configuration
- Vercel production project/domain
- Error monitoring and operational alerts
- No starter data installed automatically

## 2. Provisioning order

1. Create repository and protect `main`.
2. Create Supabase local configuration.
3. Create Supabase preview project.
4. Create Vercel project linked to repository.
5. Configure preview environment variables.
6. Deploy base app with health/status route.
7. Create Google Cloud preview project, OAuth consent, test users, and exact redirect URI.
8. Implement and prove read sync.
9. Create production Supabase project after owner confirms org, region, and cost.
10. Create production Google Cloud project/credentials and complete any verification required.
11. Configure production Vercel environment and domain.
12. Run migration dry run and restore drill.
13. Deploy release candidate with feature flags off, then enable milestones deliberately.

## 3. Branch and release strategy

- `main` is releasable.
- Short-lived feature branches and pull requests.
- Required checks: dependency audit, typecheck, lint, unit, DB, build, E2E smoke.
- Production deploy uses tagged release and recorded commit SHA.
- Database migrations merge before code that requires them, using backward-compatible sequence when possible.

## 4. Migration strategy

### Initial order

1. Extensions and enums
2. Identity/preferences
3. Registry
4. Calendar mirror and sync state
5. Planning, priority, approvals
6. Recovery
7. Home, fitness, learning, travel
8. Notifications, decisions, audit, jobs, rolling state
9. Indexes and triggers
10. RLS policies and grants
11. Safe views/functions
12. pgTAP tests

The supplied `DATABASE_SCHEMA.sql` is a design baseline. The implementation engineer must split it into timestamped migrations with tests after each logical slice.

### Production rules

- Never edit an applied migration.
- Additive change before destructive change.
- Backfill in bounded batches.
- Add constraints as not-valid then validate when data volume warrants it.
- Create indexes concurrently where supported and necessary.
- Record migration duration and lock risk.

## 5. Seed and starter data

- `supabase/seed.sql` is local/test only.
- `STARTER_DATA.json` is imported through an authenticated, explicit onboarding command.
- Production deploy never auto-seeds personal starter records.
- Every imported starter row has source `starter` and installation batch ID.
- Removal operates by batch and preview diff.

## 6. Deployment pipeline

```text
Pull request
  -> install and lockfile verification
  -> dependency/security audit
  -> typecheck/lint/unit
  -> Supabase local start and migrations
  -> pgTAP/integration tests
  -> Next.js build
  -> Playwright smoke
  -> Vercel preview
  -> manual/automated acceptance evidence
  -> approved merge
  -> production migration
  -> production deploy with risky flags off
  -> smoke tests
  -> controlled flag enablement
```

## 7. Production release checklist

- Owner-approved Supabase org, region, and billing
- Owner-approved Vercel team/domain/tier
- Google OAuth consent and redirect URI verified
- Environment validation passes
- Encryption-key backup and rotation owners documented
- Migrations backed up and dry-run complete
- RLS test suite passes
- Client bundle secret scan passes
- Calendar real-account sync evidence passes
- CSP enforced
- Rate limits enabled
- Error scrubbing verified
- Export, disconnect, and deletion evidence attached
- No Severity 1 or 2 defect
- Rollback owner available

## 8. Rollback

### Application rollback

- Use Vercel previous stable deployment promotion.
- Disable affected feature flag first when possible.
- Confirm schema remains backward compatible.

### Database rollback

Prefer forward-fix migrations. Destructive rollback requires:

- Backup verified
- Data-loss analysis
- Explicit owner approval
- Maintenance window

Do not automatically reverse a migration that has transformed user data.

### Provider capability rollback

Independent kill switches:

- Calendar read
- Calendar write
- background jobs
- browser notifications
- email
- Opportunity Radar

Disabling writes must not disable read-only access to current internal data.

## 9. Backup and restore

- Enable Supabase production backups appropriate to plan.
- Before major migration, take and verify backup availability.
- Quarterly restore drill to isolated project once production is operational.
- Record recovery point and recovery time observations.
- OAuth secrets are not expected to be recoverable from a public export; database backup remains protected.

## 10. Monitoring after release

First-hour checks:

- Auth success/failure
- Database error rate
- Command Center latency
- Calendar sync success and duplicate constraint conflicts
- Server/client errors
- Feature-flag state

First-week checks:

- Stale Calendar rate
- Recovery plan generation failures
- Capture queue failures
- RLS/security alerts
- Notification volume when Phase 2 enabled
- Support diagnostics and user-reported confusion

## 11. Cost controls

Before provisioning or upgrading paid services, report:

- Current plan
- Required feature causing upgrade
- Monthly base cost
- Usage-based exposure
- Lower-cost alternative and tradeoff
- Owner approval

Do not silently place production on a tier that cannot meet cron, database, backup, or OAuth needs.

## 12. Domain and OAuth changes

Production domain changes require updating:

- `APP_URL`
- Google authorized origins and redirect URI
- Email links
- CSP origins
- webhook addresses
- PWA scope/start URL
- monitoring environment metadata

A domain migration is a release, not a settings tweak.
