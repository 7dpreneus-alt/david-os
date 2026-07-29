'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/primitives';
import { completeFromTodayAction } from '@/app/(product)/today/actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
      {pending ? 'Saving…' : 'Complete'}
    </Button>
  );
}

export function CompleteButton({ taskId }: { taskId: string }) {
  return (
    <form action={completeFromTodayAction}>
      <input type="hidden" name="taskId" value={taskId} />
      <Submit />
    </form>
  );
}
