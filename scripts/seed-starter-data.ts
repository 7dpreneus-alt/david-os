#!/usr/bin/env tsx
/**
 * Install labelled starter data for an existing user.
 *
 * This is a development and onboarding command, kept strictly separate from
 * production behaviour: it requires an explicit user id, it refuses to run when
 * FEATURE_STARTER_DATA is false, and every row it writes carries
 * `source = 'starter'` so the UI can label it and one action can remove it.
 *
 *   pnpm seed:starter -- --user <uuid>
 *   pnpm seed:starter -- --user <uuid> --remove
 */
import { config } from 'dotenv';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env.local'), quiet: true });

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const userIndex = args.indexOf('--user');
  const userId = userIndex === -1 ? undefined : args[userIndex + 1];
  const remove = args.includes('--remove');

  if (userId === undefined) {
    process.stderr.write(
      'Usage: pnpm seed:starter -- --user <uuid> [--remove]\n' +
        'Find your user id in the profiles table after signing up.\n',
    );
    process.exit(1);
  }

  const { serverEnv } = await import('../lib/env');
  if (!serverEnv().FEATURE_STARTER_DATA) {
    process.stderr.write('FEATURE_STARTER_DATA is false. Nothing was installed.\n');
    process.exit(1);
  }

  const { installStarterData, removeStarterData } = await import('../domain/starter/install');
  const { closePool } = await import('../lib/db/pool');
  const correlationId = randomUUID();

  try {
    if (remove) {
      const result = await removeStarterData(userId, { correlationId });
      process.stdout.write(`Removed starter data: ${JSON.stringify(result.removed)}\n`);
    } else {
      const result = await installStarterData(userId, { correlationId });
      process.stdout.write(
        result.installed
          ? `Installed starter data: ${JSON.stringify(result.counts)}\n`
          : 'Starter data is already installed for that user. Nothing changed.\n',
      );
    }
  } finally {
    await closePool();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${(error as Error).message}\n`);
  process.exit(1);
});
