import { Pool, type PoolClient, type PoolConfig } from 'pg';

/**
 * PostgreSQL connection pool.
 *
 * The application talks to PostgreSQL directly (rather than through PostgREST)
 * so that multi-statement workflows — inbox conversion, recovery selection,
 * approval decisions, task completion, undo — can run in real transactions as
 * API_CONTRACTS.md §5 requires.
 *
 * Authorization is unchanged: every request runs as the `authenticated` role
 * with `request.jwt.claims` set, which is exactly the context Supabase's own
 * RLS policies are written against. See `lib/db/session.ts`.
 */

let pool: Pool | null = null;

function connectionString(): string {
  const value =
    process.env.DATABASE_URL ??
    process.env.LOCAL_DATABASE_URL ??
    process.env.DIRECT_DATABASE_URL;
  if (!value) {
    throw new Error(
      'DATABASE_URL is not set. The application cannot start without a database.',
    );
  }
  return value;
}

export function getPool(): Pool {
  if (pool === null) {
    const config: PoolConfig = {
      connectionString: connectionString(),
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    };
    // Hosted PostgreSQL (Supabase) requires TLS; local sockets must not.
    if (/supabase\.(co|com)/.test(config.connectionString ?? '')) {
      config.ssl = { rejectUnauthorized: true };
    }
    pool = new Pool(config);
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool !== null) {
    const current = pool;
    pool = null;
    await current.end();
  }
}

export type { PoolClient };
