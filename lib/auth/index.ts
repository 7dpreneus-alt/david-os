import { serverEnv } from '@/lib/env';
import { withAdmin } from '@/lib/db/session';
import { localAuthProvider } from './local-provider';
import { supabaseAuthProvider } from './supabase-provider';
import { unauthenticated } from '@/lib/http/errors';
import type { AuthProvider, AuthenticatedUser } from './types';

export * from './types';

export function authProvider(): AuthProvider {
  return serverEnv().AUTH_PROVIDER === 'local' ? localAuthProvider : supabaseAuthProvider;
}

/** Current user, or null when unauthenticated. */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  return authProvider().currentUser();
}

/**
 * Current user, or throw `UNAUTHENTICATED`. Every protected route and server
 * action starts here.
 */
export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (user === null) {
    throw unauthenticated();
  }
  return user;
}

/**
 * Create the `profiles` / `user_preferences` / `capacity_profiles` rows a new
 * account needs. Idempotent, so it is safe to call on every sign-in.
 */
export async function ensureAccountRecords(
  user: AuthenticatedUser,
): Promise<void> {
  await withAdmin(async (db) => {
    await db.query(
      `insert into public.profiles (id, display_name) values ($1, $2)
       on conflict (id) do nothing`,
      [user.id, user.displayName],
    );
    await db.query(
      `insert into public.user_preferences (user_id) values ($1)
       on conflict (user_id) do nothing`,
      [user.id],
    );
    await db.query(
      `insert into public.capacity_profiles (user_id) values ($1)
       on conflict (user_id) do nothing`,
      [user.id],
    );
  });
}
