import type { PoolClient } from 'pg';
import { getPool } from './pool';

/**
 * Role-scoped database sessions.
 *
 * `withUser` runs a callback inside a transaction where the PostgreSQL session
 * role is `authenticated` and `request.jwt.claims` carries the user's id. That
 * is the exact context the RLS policies in
 * supabase/migrations/20260729001400_rls_and_grants.sql are written against, so
 * a query that forgets its `user_id` filter still cannot read another user's
 * rows.
 *
 * `withService` runs as `service_role` (BYPASSRLS) and is reserved for the
 * sensitive tables that intentionally have no authenticated policy —
 * calendar_connections, oauth_states, audit_events, mutation_history,
 * approvals, job_runs. Callers must scope by user_id explicitly;
 * SECURITY_AND_PRIVACY.md §4 requires the ownership check even when RLS would
 * have covered it.
 */

export interface DbSession {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: T[]; rowCount: number }>;
}

function wrap(client: PoolClient): DbSession {
  return {
    async query<T extends Record<string, unknown> = Record<string, unknown>>(
      text: string,
      values?: readonly unknown[],
    ) {
      const result = await client.query(text, values ? [...values] : undefined);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
  };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(userId: string): void {
  if (!UUID_PATTERN.test(userId)) {
    throw new Error('userId must be a UUID');
  }
}

/**
 * Run `fn` in a transaction as the authenticated user. Commits on success and
 * rolls back on any thrown error.
 */
export async function withUser<T>(
  userId: string,
  fn: (db: DbSession) => Promise<T>,
): Promise<T> {
  assertUuid(userId);
  const client = await getPool().connect();
  try {
    await client.query('begin');
    await client.query('set local role authenticated');
    // Parameterized so the claims blob can never be concatenated into SQL.
    await client.query('select set_config($1, $2, true)', [
      'request.jwt.claims',
      JSON.stringify({ sub: userId, role: 'authenticated' }),
    ]);
    const result = await fn(wrap(client));
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback').catch((rollbackError: unknown) => {
      // Surface the rollback failure alongside the original error rather than
      // hiding it; the connection is discarded below either way.
      process.stderr.write(
        `${JSON.stringify({ level: 'error', msg: 'rollback_failed', err: String(rollbackError) })}\n`,
      );
    });
    throw error;
  } finally {
    // `set local` is scoped to the transaction, so the connection returns clean.
    client.release();
  }
}

/** Run `fn` in a transaction as `service_role`. Scope every query by user_id. */
export async function withService<T>(fn: (db: DbSession) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    await client.query('set local role service_role');
    const result = await fn(wrap(client));
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback').catch(() => {
      process.stderr.write(
        `${JSON.stringify({ level: 'error', msg: 'rollback_failed' })}\n`,
      );
    });
    throw error;
  } finally {
    client.release();
  }
}

/** Run `fn` with no role change (migrations, health checks). */
export async function withAdmin<T>(fn: (db: DbSession) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(wrap(client));
  } finally {
    client.release();
  }
}
