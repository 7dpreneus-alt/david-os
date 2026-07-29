#!/usr/bin/env tsx
/**
 * `pnpm test:db` — the database-focused subset of the integration suite.
 *
 * The architecture package specifies `supabase test db` with pgTAP, which needs
 * Docker. Docker is unavailable in this environment, so database behaviour is
 * asserted by running real SQL against a real PostgreSQL server as the
 * `authenticated` role. See DECISION_LOG D-018.
 */
import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'npx',
  ['vitest', 'run', '--project', 'integration', 'tests/integration/rls.test.ts'],
  { stdio: 'inherit', env: process.env },
);

process.exit(result.status ?? 1);
