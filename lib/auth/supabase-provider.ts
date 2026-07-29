import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/env';
import { withAdmin } from '@/lib/db/session';
import { AuthError, type AuthProvider, type AuthenticatedUser } from './types';

/**
 * Supabase Auth identity provider (DECISION_LOG D-005) — the deployment path.
 *
 * Sessions are stored in HTTP-only cookies through @supabase/ssr. The user
 * record lives in `auth.users`, which is the same table the application's
 * foreign keys and RLS policies reference, so the rest of the system is
 * provider-agnostic.
 *
 * NOTE: this provider has not been exercised end to end in the build sandbox
 * because the sandbox's egress policy blocks *.supabase.co. See
 * IMPLEMENTATION_STATUS.md — it is "implemented but requires verification
 * against a reachable Supabase project".
 */
async function client(): Promise<SupabaseClient> {
  const env = serverEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url === undefined || key === undefined) {
    throw new AuthError('provider_unavailable', 'Supabase Auth is not configured.');
  }
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          store.set(name, value, options);
        }
      },
    },
  });
}

/**
 * Supabase Auth creates the `auth.users` row; the application still needs a
 * `public.profiles` row. `ensureProfile` is idempotent and runs on every
 * successful authentication.
 */
async function ensureProfile(userId: string, displayName: string | null): Promise<void> {
  await withAdmin(async (db) => {
    await db.query(
      `insert into public.profiles (id, display_name)
       values ($1, $2)
       on conflict (id) do nothing`,
      [userId, displayName],
    );
    await db.query(
      `insert into public.user_preferences (user_id) values ($1)
       on conflict (user_id) do nothing`,
      [userId],
    );
  });
}

export const supabaseAuthProvider: AuthProvider = {
  name: 'supabase',

  async signUp(email, password, displayName) {
    const supabase = await client();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: displayName ? { display_name: displayName } : {} },
    });
    if (error !== null) {
      const reason = /already registered|already exists/i.test(error.message)
        ? 'email_taken'
        : 'invalid_credentials';
      throw new AuthError(reason, error.message);
    }
    if (data.user === null) {
      throw new AuthError('provider_unavailable', 'Sign-up did not return a user.');
    }
    await ensureProfile(data.user.id, displayName ?? null);
    return {
      user: {
        id: data.user.id,
        email: data.user.email ?? email,
        displayName: displayName ?? null,
      },
    };
  },

  async signIn(email, password) {
    const supabase = await client();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error !== null || data.user === null) {
      // Do not distinguish "no such account" from "wrong password".
      throw new AuthError('invalid_credentials', 'Email or password is incorrect.');
    }
    const displayName =
      typeof data.user.user_metadata?.display_name === 'string'
        ? data.user.user_metadata.display_name
        : null;
    await ensureProfile(data.user.id, displayName);
    return {
      user: { id: data.user.id, email: data.user.email ?? email, displayName },
    };
  },

  async signOut() {
    const supabase = await client();
    const { error } = await supabase.auth.signOut();
    if (error !== null) {
      throw new AuthError('provider_unavailable', error.message);
    }
  },

  async currentUser(): Promise<AuthenticatedUser | null> {
    const supabase = await client();
    // getUser() revalidates the JWT with the Auth server; getSession() does not.
    const { data, error } = await supabase.auth.getUser();
    if (error !== null || data.user === null) return null;
    const displayName =
      typeof data.user.user_metadata?.display_name === 'string'
        ? data.user.user_metadata.display_name
        : null;
    return { id: data.user.id, email: data.user.email ?? '', displayName };
  },
};
