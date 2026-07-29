import { describe, expect, it } from 'vitest';
import { EnvironmentError, loadServerEnv } from '@/lib/env';

/** Environment validation rules — ENVIRONMENT_VARIABLES.md "Startup validation". */

type EnvSource = Record<string, string | undefined>;

const base: EnvSource = {
  APP_URL: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://postgres@localhost:5432/db',
  AUTH_PROVIDER: 'local',
  AUTH_SESSION_SECRET: 'x'.repeat(48),
};

const key32 = Buffer.alloc(32, 7).toString('base64');

function issuesFor(overrides: EnvSource): string[] {
  try {
    loadServerEnv({ ...base, ...overrides });
    return [];
  } catch (error) {
    if (error instanceof EnvironmentError) return error.issues;
    throw error;
  }
}

describe('feature flags', () => {
  it('default to disabled, except starter data', () => {
    const env = loadServerEnv(base);
    expect(env.FEATURE_CALENDAR_READ).toBe(false);
    expect(env.FEATURE_CALENDAR_WRITE).toBe(false);
    expect(env.FEATURE_OPPORTUNITY_RADAR).toBe(false);
    expect(env.FEATURE_ACCOUNT_DELETION).toBe(false);
    expect(env.FEATURE_STARTER_DATA).toBe(true);
  });

  it('are strict booleans — "1" and "yes" are rejected', () => {
    expect(issuesFor({ FEATURE_CALENDAR_READ: '1' })).not.toEqual([]);
    expect(issuesFor({ FEATURE_CALENDAR_READ: 'yes' })).not.toEqual([]);
    expect(issuesFor({ FEATURE_CALENDAR_READ: 'false' })).toEqual([]);
  });
});

describe('startup failures', () => {
  it('fails when DATABASE_URL is missing', () => {
    const issues = issuesFor({ DATABASE_URL: undefined });
    expect(issues.join(' ')).toMatch(/DATABASE_URL/);
  });

  it('fails when calendar read is enabled without its credentials', () => {
    const issues = issuesFor({ FEATURE_CALENDAR_READ: 'true' });
    expect(issues.join(' ')).toMatch(/GOOGLE_OAUTH_CLIENT_ID/);
    expect(issues.join(' ')).toMatch(/GOOGLE_OAUTH_CLIENT_SECRET/);
    expect(issues.join(' ')).toMatch(/TOKEN_ENCRYPTION_ACTIVE_VERSION/);
  });

  it('accepts calendar read when every credential is present and the redirect matches', () => {
    const issues = issuesFor({
      FEATURE_CALENDAR_READ: 'true',
      GOOGLE_OAUTH_CLIENT_ID: 'client-id',
      GOOGLE_OAUTH_CLIENT_SECRET: 'client-secret',
      GOOGLE_OAUTH_REDIRECT_URI: 'http://localhost:3000/api/v1/calendar/google/callback',
      GOOGLE_OAUTH_STATE_SECRET: 's'.repeat(48),
      TOKEN_ENCRYPTION_ACTIVE_VERSION: '1',
      TOKEN_ENCRYPTION_KEY_V1: key32,
    });
    expect(issues).toEqual([]);
  });

  it('rejects a redirect URI that does not match APP_URL', () => {
    const issues = issuesFor({
      FEATURE_CALENDAR_READ: 'true',
      GOOGLE_OAUTH_CLIENT_ID: 'client-id',
      GOOGLE_OAUTH_CLIENT_SECRET: 'client-secret',
      GOOGLE_OAUTH_REDIRECT_URI: 'https://evil.example/callback',
      GOOGLE_OAUTH_STATE_SECRET: 's'.repeat(48),
      TOKEN_ENCRYPTION_ACTIVE_VERSION: '1',
      TOKEN_ENCRYPTION_KEY_V1: key32,
    });
    expect(issues.join(' ')).toMatch(/GOOGLE_OAUTH_REDIRECT_URI must equal/);
  });

  it('rejects an encryption key that does not decode to 32 bytes', () => {
    const issues = issuesFor({
      FEATURE_CALENDAR_READ: 'true',
      GOOGLE_OAUTH_CLIENT_ID: 'client-id',
      GOOGLE_OAUTH_CLIENT_SECRET: 'client-secret',
      GOOGLE_OAUTH_REDIRECT_URI: 'http://localhost:3000/api/v1/calendar/google/callback',
      GOOGLE_OAUTH_STATE_SECRET: 's'.repeat(48),
      TOKEN_ENCRYPTION_ACTIVE_VERSION: '1',
      TOKEN_ENCRYPTION_KEY_V1: Buffer.alloc(16, 1).toString('base64'),
    });
    expect(issues.join(' ')).toMatch(/32 bytes/);
  });

  it('requires calendar read before calendar write', () => {
    const issues = issuesFor({ FEATURE_CALENDAR_WRITE: 'true' });
    expect(issues.join(' ')).toMatch(/FEATURE_CALENDAR_WRITE requires FEATURE_CALENDAR_READ/);
  });

  it('rejects http and localhost APP_URL in production', () => {
    const issues = issuesFor({
      NEXT_PUBLIC_APP_ENV: 'production',
      AUTH_PROVIDER: 'supabase',
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable',
      SUPABASE_SERVICE_ROLE_KEY: 'service',
    });
    expect(issues.join(' ')).toMatch(/https in production/);
    expect(issues.join(' ')).toMatch(/must not be localhost/);
  });

  it('refuses the local auth provider in preview and production', () => {
    expect(issuesFor({ NEXT_PUBLIC_APP_ENV: 'production' }).join(' ')).toMatch(
      /AUTH_PROVIDER=local is not permitted/,
    );
    expect(issuesFor({ NEXT_PUBLIC_APP_ENV: 'preview' }).join(' ')).toMatch(
      /AUTH_PROVIDER=local is not permitted/,
    );
  });

  it('requires a session secret for the local auth provider', () => {
    expect(issuesFor({ AUTH_SESSION_SECRET: undefined }).join(' ')).toMatch(
      /AUTH_SESSION_SECRET is required/,
    );
  });

  it('requires Supabase keys when the Supabase auth provider is selected', () => {
    const issues = issuesFor({ AUTH_PROVIDER: 'supabase' });
    expect(issues.join(' ')).toMatch(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(issues.join(' ')).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('rejects using the service-role key as the publishable key', () => {
    const issues = issuesFor({
      AUTH_PROVIDER: 'supabase',
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'same-key',
      SUPABASE_SERVICE_ROLE_KEY: 'same-key',
    });
    expect(issues.join(' ')).toMatch(/must not be the service-role key/);
  });

  it('supplies no fake credential defaults', () => {
    const env = loadServerEnv(base);
    expect(env.GOOGLE_OAUTH_CLIENT_ID).toBeUndefined();
    expect(env.GOOGLE_OAUTH_CLIENT_SECRET).toBeUndefined();
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(env.tokenEncryptionKeys.size).toBe(0);
  });
});
