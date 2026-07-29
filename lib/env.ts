import { z } from 'zod';

/**
 * Environment validation — ENVIRONMENT_VARIABLES.md.
 *
 * Rules enforced here:
 *  - Missing core Supabase variables fail startup.
 *  - Feature flags default to disabled.
 *  - A feature that is enabled without its credentials fails startup.
 *  - Production `APP_URL` may not be http/localhost.
 *  - Token encryption keys must decode to exactly 32 bytes.
 *  - No fake defaults are supplied for any credential.
 */

const strictBoolean = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

/** Flags are strict booleans: only the strings "true" and "false" are accepted. */
const optionalFlag = (defaultValue: boolean) => strictBoolean.default(defaultValue);

const base64Key32 = z
  .string()
  .min(1)
  .refine(
    (value) => {
      try {
        return Buffer.from(value, 'base64').length === 32;
      } catch (error) {
        void error;
        return false;
      }
    },
    { message: 'must be a base64 string decoding to exactly 32 bytes' },
  );

const serverSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('Personal Mission Control OS'),
  NEXT_PUBLIC_APP_ENV: z
    .enum(['development', 'test', 'preview', 'production'])
    .default('development'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),

  APP_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1),
  DIRECT_DATABASE_URL: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  /**
   * Identity provider. `supabase` is the deployment default (DECISION_LOG D-005).
   * `local` is a real password-credential provider for development and CI where
   * the Supabase Auth service is unreachable (DECISION_LOG D-016); it is
   * rejected outright in preview and production.
   */
  AUTH_PROVIDER: z.enum(['supabase', 'local']).default('supabase'),
  AUTH_SESSION_SECRET: z.string().min(32).optional(),
  AUTH_SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(72),

  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url().optional(),
  GOOGLE_OAUTH_STATE_SECRET: z.string().min(32).optional(),
  TOKEN_ENCRYPTION_ACTIVE_VERSION: z.coerce.number().int().positive().optional(),
  TOKEN_ENCRYPTION_KEY_V1: base64Key32.optional(),
  TOKEN_ENCRYPTION_KEY_V2: base64Key32.optional(),

  CALENDAR_SYNC_PAST_DAYS: z.coerce.number().int().min(1).max(3650).default(90),
  CALENDAR_SYNC_FUTURE_DAYS: z.coerce.number().int().min(1).max(3650).default(365),

  FEATURE_CALENDAR_READ: optionalFlag(false),
  FEATURE_CALENDAR_WRITE: optionalFlag(false),
  FEATURE_BACKGROUND_JOBS: optionalFlag(false),
  FEATURE_BROWSER_NOTIFICATIONS: optionalFlag(false),
  FEATURE_EMAIL_NOTIFICATIONS: optionalFlag(false),
  FEATURE_WEEKLY_REVIEW: optionalFlag(false),
  FEATURE_OPPORTUNITY_RADAR: optionalFlag(false),
  FEATURE_STARTER_DATA: optionalFlag(true),
  FEATURE_ACCOUNT_DELETION: optionalFlag(false),

  BUILD_SHA: z.string().default('unknown'),
});

export type ServerEnv = z.infer<typeof serverSchema> & {
  tokenEncryptionKeys: Map<number, Buffer>;
};

export class EnvironmentError extends Error {
  public readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid environment configuration:\n  - ${issues.join('\n  - ')}`);
    this.name = 'EnvironmentError';
    this.issues = issues;
  }
}

function crossFieldChecks(env: z.infer<typeof serverSchema>): string[] {
  const issues: string[] = [];

  if (env.NEXT_PUBLIC_APP_ENV === 'production') {
    const url = new URL(env.APP_URL);
    if (url.protocol !== 'https:') {
      issues.push('APP_URL must use https in production');
    }
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      issues.push('APP_URL must not be localhost in production');
    }
  }

  if (
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== undefined &&
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY === env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    issues.push(
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must not be the service-role key',
    );
  }

  const isDeployed =
    env.NEXT_PUBLIC_APP_ENV === 'preview' || env.NEXT_PUBLIC_APP_ENV === 'production';

  if (env.AUTH_PROVIDER === 'local') {
    if (isDeployed) {
      issues.push(
        `AUTH_PROVIDER=local is not permitted in ${env.NEXT_PUBLIC_APP_ENV}; use AUTH_PROVIDER=supabase`,
      );
    }
    if (env.AUTH_SESSION_SECRET === undefined) {
      issues.push('AUTH_SESSION_SECRET is required when AUTH_PROVIDER=local');
    }
  }

  if (env.AUTH_PROVIDER === 'supabase') {
    for (const key of [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ] as const) {
      if (env[key] === undefined) {
        issues.push(`${key} is required when AUTH_PROVIDER=supabase`);
      }
    }
  }

  if (env.FEATURE_CALENDAR_READ) {
    const required = [
      'GOOGLE_OAUTH_CLIENT_ID',
      'GOOGLE_OAUTH_CLIENT_SECRET',
      'GOOGLE_OAUTH_REDIRECT_URI',
      'GOOGLE_OAUTH_STATE_SECRET',
      'TOKEN_ENCRYPTION_ACTIVE_VERSION',
    ] as const;
    for (const key of required) {
      if (env[key] === undefined) {
        issues.push(`${key} is required when FEATURE_CALENDAR_READ=true`);
      }
    }
    const activeVersion = env.TOKEN_ENCRYPTION_ACTIVE_VERSION;
    if (activeVersion !== undefined) {
      const keyName = `TOKEN_ENCRYPTION_KEY_V${activeVersion}` as
        | 'TOKEN_ENCRYPTION_KEY_V1'
        | 'TOKEN_ENCRYPTION_KEY_V2';
      if (env[keyName] === undefined) {
        issues.push(
          `${keyName} is required because TOKEN_ENCRYPTION_ACTIVE_VERSION=${activeVersion}`,
        );
      }
    }
    if (env.GOOGLE_OAUTH_REDIRECT_URI !== undefined) {
      const expected = `${env.APP_URL.replace(/\/$/, '')}/api/v1/calendar/google/callback`;
      if (env.GOOGLE_OAUTH_REDIRECT_URI !== expected) {
        issues.push(
          `GOOGLE_OAUTH_REDIRECT_URI must equal ${expected} (see ENVIRONMENT_VARIABLES.md)`,
        );
      }
    }
  }

  if (env.FEATURE_CALENDAR_WRITE && !env.FEATURE_CALENDAR_READ) {
    issues.push('FEATURE_CALENDAR_WRITE requires FEATURE_CALENDAR_READ');
  }

  return issues;
}

function collectEncryptionKeys(
  env: z.infer<typeof serverSchema>,
): Map<number, Buffer> {
  const keys = new Map<number, Buffer>();
  if (env.TOKEN_ENCRYPTION_KEY_V1) {
    keys.set(1, Buffer.from(env.TOKEN_ENCRYPTION_KEY_V1, 'base64'));
  }
  if (env.TOKEN_ENCRYPTION_KEY_V2) {
    keys.set(2, Buffer.from(env.TOKEN_ENCRYPTION_KEY_V2, 'base64'));
  }
  return keys;
}

let cached: ServerEnv | null = null;

/**
 * Parse and validate server environment. Throws `EnvironmentError` on failure so
 * that startup fails loudly rather than degrading into a fake mode.
 */
export function loadServerEnv(
  source: Readonly<Record<string, string | undefined>> = process.env,
): ServerEnv {
  const parsed = serverSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
    );
    throw new EnvironmentError(issues);
  }

  const crossIssues = crossFieldChecks(parsed.data);
  if (crossIssues.length > 0) {
    throw new EnvironmentError(crossIssues);
  }

  return { ...parsed.data, tokenEncryptionKeys: collectEncryptionKeys(parsed.data) };
}

export function serverEnv(): ServerEnv {
  if (cached === null) {
    cached = loadServerEnv();
  }
  return cached;
}

/** Test-only reset of the memoized environment. */
export function resetServerEnvCache(): void {
  cached = null;
}

export type FeatureFlagName =
  | 'FEATURE_CALENDAR_READ'
  | 'FEATURE_CALENDAR_WRITE'
  | 'FEATURE_BACKGROUND_JOBS'
  | 'FEATURE_BROWSER_NOTIFICATIONS'
  | 'FEATURE_EMAIL_NOTIFICATIONS'
  | 'FEATURE_WEEKLY_REVIEW'
  | 'FEATURE_OPPORTUNITY_RADAR'
  | 'FEATURE_STARTER_DATA'
  | 'FEATURE_ACCOUNT_DELETION';

export const FEATURE_FLAG_NAMES: readonly FeatureFlagName[] = [
  'FEATURE_CALENDAR_READ',
  'FEATURE_CALENDAR_WRITE',
  'FEATURE_BACKGROUND_JOBS',
  'FEATURE_BROWSER_NOTIFICATIONS',
  'FEATURE_EMAIL_NOTIFICATIONS',
  'FEATURE_WEEKLY_REVIEW',
  'FEATURE_OPPORTUNITY_RADAR',
  'FEATURE_STARTER_DATA',
  'FEATURE_ACCOUNT_DELETION',
] as const;

export function isFeatureEnabled(flag: FeatureFlagName): boolean {
  return serverEnv()[flag];
}
