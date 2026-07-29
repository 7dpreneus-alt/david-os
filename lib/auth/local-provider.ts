import { cookies } from 'next/headers';
import { withAdmin } from '@/lib/db/session';
import { serverEnv } from '@/lib/env';
import { hashPassword, passwordIssues, verifyPassword } from './password';
import {
  SESSION_COOKIE_NAME,
  issueSessionToken,
  verifySessionToken,
} from './session-token';
import { AuthError, type AuthProvider, type AuthenticatedUser, type SignInResult } from './types';

/**
 * Local password-credential identity provider (DECISION_LOG D-016).
 *
 * Writes to the same `auth.users` table that Supabase Auth owns, so switching
 * `AUTH_PROVIDER` does not change any downstream authorization behavior. It is
 * refused at startup in preview and production (see lib/env.ts).
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface UserRow extends Record<string, unknown> {
  id: string;
  email: string | null;
  encrypted_password: string | null;
  raw_user_meta_data: { display_name?: string } | null;
}

function toUser(row: UserRow): AuthenticatedUser {
  return {
    id: row.id,
    email: row.email ?? '',
    displayName: row.raw_user_meta_data?.display_name ?? null,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function setSessionCookie(userId: string): Promise<void> {
  const env = serverEnv();
  const secret = env.AUTH_SESSION_SECRET;
  if (secret === undefined) {
    throw new AuthError('provider_unavailable', 'Local auth is not configured.');
  }
  const ttlSeconds = env.AUTH_SESSION_TTL_HOURS * 3600;
  const token = issueSessionToken(userId, secret, ttlSeconds);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: new URL(env.APP_URL).protocol === 'https:',
    path: '/',
    maxAge: ttlSeconds,
  });
}

export const localAuthProvider: AuthProvider = {
  name: 'local',

  async signUp(email, password, displayName) {
    const normalized = normalizeEmail(email);
    if (!EMAIL_PATTERN.test(normalized)) {
      throw new AuthError('invalid_email', 'Enter a valid email address.');
    }
    const issues = passwordIssues(password);
    if (issues.length > 0) {
      throw new AuthError('weak_password', issues.join(' '));
    }

    const encrypted = await hashPassword(password);
    const row = await withAdmin(async (db) => {
      const existing = await db.query<UserRow>(
        'select id from auth.users where email = $1',
        [normalized],
      );
      if (existing.rowCount > 0) {
        throw new AuthError('email_taken', 'An account with that email already exists.');
      }
      const inserted = await db.query<UserRow>(
        `insert into auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data)
         values ($1, $2, now(), $3)
         returning id, email, encrypted_password, raw_user_meta_data`,
        [normalized, encrypted, JSON.stringify(displayName ? { display_name: displayName } : {})],
      );
      const created = inserted.rows[0];
      if (created === undefined) {
        throw new AuthError('provider_unavailable', 'Account creation failed.');
      }
      return created;
    });

    await setSessionCookie(row.id);
    return { user: toUser(row) } satisfies SignInResult;
  },

  async signIn(email, password) {
    const normalized = normalizeEmail(email);
    const row = await withAdmin(async (db) => {
      const result = await db.query<UserRow>(
        'select id, email, encrypted_password, raw_user_meta_data from auth.users where email = $1',
        [normalized],
      );
      return result.rows[0] ?? null;
    });

    // Always run a verification so that a missing account and a wrong password
    // take comparable time and produce the same message.
    const stored = row?.encrypted_password ?? '';
    const ok = stored.length > 0 && (await verifyPassword(password, stored));
    if (row === null || !ok) {
      throw new AuthError('invalid_credentials', 'Email or password is incorrect.');
    }

    await withAdmin((db) =>
      db.query('update auth.users set last_sign_in_at = now() where id = $1', [row.id]),
    );
    await setSessionCookie(row.id);
    return { user: toUser(row) } satisfies SignInResult;
  },

  async signOut() {
    const store = await cookies();
    store.delete(SESSION_COOKIE_NAME);
  },

  async currentUser() {
    const env = serverEnv();
    const secret = env.AUTH_SESSION_SECRET;
    if (secret === undefined) return null;
    const store = await cookies();
    const token = store.get(SESSION_COOKIE_NAME)?.value;
    if (token === undefined) return null;
    const payload = verifySessionToken(token, secret);
    if (payload === null) return null;

    const row = await withAdmin(async (db) => {
      const result = await db.query<UserRow>(
        'select id, email, encrypted_password, raw_user_meta_data from auth.users where id = $1',
        [payload.sub],
      );
      return result.rows[0] ?? null;
    });
    return row === null ? null : toUser(row);
  },
};
