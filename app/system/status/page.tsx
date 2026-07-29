import type { Metadata } from 'next';
import { FEATURE_FLAG_NAMES, serverEnv } from '@/lib/env';
import { withAdmin } from '@/lib/db/session';
import { Badge, Card, CardTitle } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'System status' };
export const dynamic = 'force-dynamic';

/**
 * /system/status — AGENT_HANDOFF.md Milestone 0 item 4.
 *
 * Shows environment, build SHA, feature status, and database reachability.
 * It deliberately prints no secret, no key material, and no user content.
 */
export default async function SystemStatusPage() {
  const env = serverEnv();

  const database = await withAdmin(async (db) => {
    const version = await db.query<{ server_version: string }>('show server_version');
    const migrations = await db.query<{ version: string; applied_at: Date }>(
      'select version, applied_at from public.schema_migrations order by version',
    );
    const rls = await db.query<{ unprotected: string }>(
      `select count(*)::text as unprotected
         from pg_tables t
        where t.schemaname = 'public'
          and t.tablename <> 'schema_migrations'
          and not exists (
            select 1 from pg_class c
             join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relname = t.tablename and c.relrowsecurity
          )`,
    );
    return {
      reachable: true as const,
      serverVersion: version.rows[0]?.server_version ?? 'unknown',
      migrationCount: migrations.rows.length,
      latestMigration: migrations.rows[migrations.rows.length - 1]?.version ?? 'none',
      tablesWithoutRls: Number(rls.rows[0]?.unprotected ?? -1),
    };
  }).catch((error: unknown) => ({
    reachable: false as const,
    error: error instanceof Error ? error.name : 'UnknownError',
  }));

  return (
    <main id="main" className="mx-auto w-full max-w-2xl space-y-4 px-4 py-8">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">System status</h1>
        <p className="mt-1 text-sm text-text-muted">
          Configuration and dependency state. No secrets or user content appear here.
        </p>
      </header>

      <Card>
        <CardTitle>Environment</CardTitle>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-text-muted">App environment</dt>
          <dd className="font-mono text-xs">{env.NEXT_PUBLIC_APP_ENV}</dd>
          <dt className="text-text-muted">Build SHA</dt>
          <dd className="font-mono text-xs break-all">{env.BUILD_SHA}</dd>
          <dt className="text-text-muted">Identity provider</dt>
          <dd className="font-mono text-xs">{env.AUTH_PROVIDER}</dd>
          <dt className="text-text-muted">Log level</dt>
          <dd className="font-mono text-xs">{env.LOG_LEVEL}</dd>
        </dl>
      </Card>

      <Card>
        <CardTitle>Database</CardTitle>
        {database.reachable ? (
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-text-muted">Status</dt>
            <dd>
              <Badge tone="positive">reachable</Badge>
            </dd>
            <dt className="text-text-muted">PostgreSQL</dt>
            <dd className="font-mono text-xs">{database.serverVersion}</dd>
            <dt className="text-text-muted">Migrations applied</dt>
            <dd className="font-mono text-xs">{database.migrationCount}</dd>
            <dt className="text-text-muted">Latest migration</dt>
            <dd className="font-mono text-xs break-all">{database.latestMigration}</dd>
            <dt className="text-text-muted">Public tables without RLS</dt>
            <dd>
              <Badge tone={database.tablesWithoutRls === 0 ? 'positive' : 'danger'}>
                {database.tablesWithoutRls}
              </Badge>
            </dd>
          </dl>
        ) : (
          <div className="mt-2">
            <Badge tone="danger">unreachable</Badge>
            <p className="mt-2 text-sm text-text-muted">
              The database could not be queried ({database.error}). The application cannot
              serve data in this state.
            </p>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Feature flags</CardTitle>
        <ul className="mt-2 space-y-1">
          {FEATURE_FLAG_NAMES.map((flag) => (
            <li key={flag} className="flex items-center justify-between gap-2 text-sm">
              <span className="font-mono text-xs">{flag}</span>
              <Badge tone={env[flag] ? 'positive' : 'neutral'}>
                {env[flag] ? 'enabled' : 'disabled'}
              </Badge>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-text-muted">
          A disabled flag means the feature has no active code path, not that it is hidden.
        </p>
      </Card>
    </main>
  );
}
