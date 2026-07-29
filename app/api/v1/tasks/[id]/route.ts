import { handler, parseBody, success } from '@/lib/http/route';
import { deleteTask, getTask, updateTask } from '@/domain/tasks/repository';
import { updateTaskSchema } from '@/domain/tasks/schemas';
import { notFound } from '@/lib/http/errors';

export const dynamic = 'force-dynamic';

export const GET = handler(async ({ user, params, requestId }) => {
  const task = await getTask(user.id, String(params.id));
  if (task === null) throw notFound('That task could not be found.');
  return success(task, { requestId });
});

/** PATCH requires `version` — optimistic locking, API_CONTRACTS.md §2. */
export const PATCH = handler(
  async ({ user, request, params, requestId, idempotencyKey }) => {
    const input = await parseBody(request, updateTaskSchema);
    const task = await updateTask(user.id, String(params.id), input, {
      correlationId: requestId,
      idempotencyKey,
    });
    return success(task, { requestId, stateChanged: true });
  },
  { requireIdempotencyKey: true },
);

export const DELETE = handler(
  async ({ user, params, requestId, idempotencyKey }) => {
    await deleteTask(user.id, String(params.id), {
      correlationId: requestId,
      idempotencyKey,
    });
    return success({ deleted: true }, { requestId, stateChanged: true });
  },
  { requireIdempotencyKey: true },
);
