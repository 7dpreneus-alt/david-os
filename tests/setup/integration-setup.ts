import { config } from 'dotenv';
import { resolve } from 'node:path';

/**
 * Integration tests run against a real PostgreSQL database with the full
 * migration set applied — the same migrations that ship to Supabase. Nothing is
 * mocked at the SQL layer, so RLS behaviour under test is the behaviour that
 * ships.
 */
config({ path: resolve(process.cwd(), '.env.local'), quiet: true });

if (process.env.DATABASE_URL === undefined) {
  throw new Error(
    'DATABASE_URL is required for integration tests. Run `pnpm db:local:start` first.',
  );
}

process.env.NEXT_PUBLIC_APP_ENV = 'test';
process.env.LOG_LEVEL = 'error';
