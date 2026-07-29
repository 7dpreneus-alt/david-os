#!/usr/bin/env tsx
/**
 * Apply ordered SQL migrations to a PostgreSQL database.
 *
 * Each file runs once, inside a transaction, and is recorded in
 * `public.schema_migrations`. Re-running is a no-op, so this is safe to call
 * from tests, CI, and local development.
 *
 * Usage:
 *   pnpm db:migrate                     # uses LOCAL_DATABASE_URL / DATABASE_URL
 *   pnpm db:migrate -- --compat         # also apply supabase/local/0000_supabase_compat.sql
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';

const ROOT = resolve(import.meta.dirname, '..');
const MIGRATIONS_DIR = resolve(ROOT, 'supabase/migrations');
const COMPAT_FILE = resolve(ROOT, 'supabase/local/0000_supabase_compat.sql');

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();
}

export interface ApplyOptions {
  connectionString: string;
  applyCompat: boolean;
  log?: (message: string) => void;
}

export async function applyMigrations(options: ApplyOptions): Promise<string[]> {
  const log = options.log ?? ((message: string) => process.stdout.write(`${message}\n`));
  const client = new Client({ connectionString: options.connectionString });
  await client.connect();
  const applied: string[] = [];
  try {
    if (options.applyCompat) {
      await client.query(readFileSync(COMPAT_FILE, 'utf8'));
      log('applied supabase/local/0000_supabase_compat.sql');
    }

    await client.query(`
      create table if not exists public.schema_migrations (
        version text primary key,
        checksum text not null,
        applied_at timestamptz not null default now()
      )
    `);

    const existing = await client.query<{ version: string; checksum: string }>(
      'select version, checksum from public.schema_migrations',
    );
    const byVersion = new Map(existing.rows.map((row) => [row.version, row.checksum]));

    for (const file of migrationFiles()) {
      const sql = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const previous = byVersion.get(file);
      if (previous !== undefined) {
        if (previous !== checksum) {
          throw new Error(
            `Migration ${file} was modified after it was applied. Create a new migration instead.`,
          );
        }
        continue;
      }
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query(
          'insert into public.schema_migrations(version, checksum) values ($1, $2)',
          [file, checksum],
        );
        await client.query('commit');
      } catch (error) {
        await client.query('rollback');
        throw new Error(`Migration ${file} failed: ${(error as Error).message}`, { cause: error });
      }
      applied.push(file);
      log(`applied ${file}`);
    }
  } finally {
    await client.end();
  }
  return applied;
}

async function main(): Promise<void> {
  const connectionString =
    process.env.MIGRATE_DATABASE_URL ??
    process.env.LOCAL_DATABASE_URL ??
    process.env.DIRECT_DATABASE_URL ??
    process.env.DATABASE_URL;
  if (!connectionString) {
    process.stderr.write(
      'No database URL. Set LOCAL_DATABASE_URL (local) or DIRECT_DATABASE_URL (hosted).\n',
    );
    process.exit(1);
  }
  const applyCompat =
    process.argv.includes('--compat') || process.env.APPLY_SUPABASE_COMPAT === 'true';
  const applied = await applyMigrations({ connectionString, applyCompat });
  process.stdout.write(
    applied.length === 0
      ? 'Database already up to date.\n'
      : `Applied ${applied.length} migration(s).\n`,
  );
}

const invokedDirectly = (process.argv[1] ?? '').endsWith('apply-migrations.ts');
if (invokedDirectly) {
  main().catch((error: unknown) => {
    process.stderr.write(`${(error as Error).message}\n`);
    process.exit(1);
  });
}
