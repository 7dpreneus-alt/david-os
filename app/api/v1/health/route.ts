import { handler, success } from '@/lib/http/route';
import { withAdmin } from '@/lib/db/session';
import { serverEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * Health check for deployment probes. Public, and deliberately minimal: it
 * reports reachability and the build SHA, never configuration values.
 */
export const GET = handler(
  async ({ requestId }) => {
    const env = serverEnv();
    let databaseOk = false;
    try {
      await withAdmin((db) => db.query('select 1'));
      databaseOk = true;
    } catch (error) {
      // Reported as unhealthy below; the error itself is not exposed.
      void error;
    }

    return success(
      {
        status: databaseOk ? 'ok' : 'degraded',
        buildSha: env.BUILD_SHA,
        environment: env.NEXT_PUBLIC_APP_ENV,
        database: databaseOk ? 'reachable' : 'unreachable',
      },
      { requestId, status: databaseOk ? 200 : 503 },
    );
  },
  { requireAuth: false },
);
