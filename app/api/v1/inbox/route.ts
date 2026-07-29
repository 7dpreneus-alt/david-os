import { handler, parseBody, success } from '@/lib/http/route';
import { createInboxItem, listInboxItems } from '@/domain/tasks/repository';
import { createInboxItemSchema } from '@/domain/tasks/schemas';

export const dynamic = 'force-dynamic';

export const GET = handler(async ({ user, requestId }) => {
  const items = await listInboxItems(user.id);
  return success(items, { requestId });
});

export const POST = handler(async ({ user, request, requestId }) => {
  const input = await parseBody(request, createInboxItemSchema);
  const item = await createInboxItem(user.id, input, { correlationId: requestId });
  return success(item, { requestId, stateChanged: true, status: 201 });
});
