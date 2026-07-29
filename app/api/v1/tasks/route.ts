import { handler, parseBody, parseQuery, success } from '@/lib/http/route';
import { createTask, listTasks } from '@/domain/tasks/repository';
import { createTaskSchema, taskListQuerySchema } from '@/domain/tasks/schemas';

export const dynamic = 'force-dynamic';

/** GET /api/v1/tasks — API_CONTRACTS.md §2. */
export const GET = handler(async ({ user, request, requestId }) => {
  const url = new URL(request.url);
  const statusValues = url.searchParams.getAll('status');
  const query = parseQuery(request, taskListQuerySchema, {
    status: statusValues.length > 0 ? statusValues : undefined,
    projectId: url.searchParams.get('projectId') ?? undefined,
    lifeAreaId: url.searchParams.get('lifeAreaId') ?? undefined,
    search: url.searchParams.get('search') ?? undefined,
    includeArchived: url.searchParams.get('includeArchived') === 'true',
    sort: url.searchParams.get('sort') ?? 'created_at',
    direction: url.searchParams.get('direction') ?? 'desc',
    limit: Number(url.searchParams.get('limit') ?? 50),
    offset: Number(url.searchParams.get('offset') ?? 0),
  });

  const result = await listTasks(user.id, query);
  return success(result, { requestId });
});

/** POST /api/v1/tasks */
export const POST = handler(
  async ({ user, request, requestId, idempotencyKey }) => {
    const input = await parseBody(request, createTaskSchema);
    const result = await createTask(user.id, input, {
      correlationId: requestId,
      idempotencyKey,
    });
    return success(result.task, {
      requestId,
      warnings: result.warnings,
      stateChanged: true,
      status: 201,
    });
  },
  { requireIdempotencyKey: true },
);
