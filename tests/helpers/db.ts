import { randomUUID } from 'node:crypto';
import { applyMigrations } from '@/scripts/apply-migrations';
import { closePool, getPool } from '@/lib/db/pool';
import { withAdmin } from '@/lib/db/session';

/** Test helpers for creating isolated users against the real database. */

let migrated = false;

export async function ensureSchema(): Promise<void> {
  if (migrated) return;
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) throw new Error('DATABASE_URL is not set');
  await applyMigrations({
    connectionString,
    applyCompat: true,
    log: () => {},
  });
  migrated = true;
}

export interface TestUser {
  id: string;
  email: string;
}

/** Create a real `auth.users` row plus the profile records the app expects. */
export async function createTestUser(): Promise<TestUser> {
  const id = randomUUID();
  const email = `test-${id}@example.test`;
  await withAdmin(async (db) => {
    await db.query(
      `insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())`,
      [id, email],
    );
    await db.query(`insert into public.profiles (id) values ($1)`, [id]);
    await db.query(`insert into public.user_preferences (user_id) values ($1)`, [id]);
    await db.query(`insert into public.capacity_profiles (user_id) values ($1)`, [id]);
  });
  return { id, email };
}

/** Cascade-deletes everything the user owns. */
export async function deleteTestUser(userId: string): Promise<void> {
  await withAdmin((db) => db.query('delete from auth.users where id = $1', [userId]));
}

export async function shutdown(): Promise<void> {
  await closePool();
}

export { getPool };
