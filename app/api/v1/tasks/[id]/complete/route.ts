import { handler, parseBody, success } from '@/lib/http/route';
import { completeTask } from '@/domain/tasks/repository';
import { completeTaskSchema } from '@/domain/tasks/schemas';

export const dynamic = 'force-dynamic';

export const POST = handler(
  async ({ user, request, params, requestId, idempotencyKey }) => {
    const input = await parseBody(request, completeTaskSchema);
    const task = await completeTask(user.id, String(params.id), input, {
      correlationId: requestId,
      idempotencyKey,
    });
    return success(task, { requestId, stateChanged: true });
  },
  { requireIdempotencyKey: true },
);
