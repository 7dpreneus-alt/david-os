/**
 * Identity provider abstraction.
 *
 * DECISION_LOG D-005 selects Supabase Auth for deployment. D-016 adds a local
 * password-credential provider for development and CI, where the Supabase Auth
 * service is unreachable. Both providers produce the same `AuthenticatedUser`
 * and both write to the same `auth.users` table, so every downstream layer —
 * RLS, repositories, routes — is identical regardless of provider.
 *
 * Neither provider fakes a session: `local` verifies a scrypt password hash and
 * issues an HMAC-signed, HttpOnly, SameSite=Lax cookie.
 */

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface SignInResult {
  user: AuthenticatedUser;
}

export type AuthFailureReason =
  | 'invalid_credentials'
  | 'email_taken'
  | 'weak_password'
  | 'invalid_email'
  | 'provider_unavailable';

export class AuthError extends Error {
  public readonly reason: AuthFailureReason;

  constructor(reason: AuthFailureReason, message: string) {
    super(message);
    this.name = 'AuthError';
    this.reason = reason;
  }
}

export interface AuthProvider {
  readonly name: 'supabase' | 'local';
  signUp(email: string, password: string, displayName?: string): Promise<SignInResult>;
  signIn(email: string, password: string): Promise<SignInResult>;
  signOut(): Promise<void>;
  /** Returns the current user, or null when there is no valid session. */
  currentUser(): Promise<AuthenticatedUser | null>;
}
