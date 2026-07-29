'use client';

import { useActionState, useEffect, useId, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';
import { Button, Card, Field, Input, Select, Textarea } from '@/components/ui/primitives';
import { createProjectAction } from '@/app/(product)/tasks/actions';
import { idleState } from '@/app/form-state';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? 'Creating…' : 'Create project'}
    </Button>
  );
}

export function ProjectComposer() {
  const [state, formAction] = useActionState(createProjectAction, idleState);
  const formRef = useRef<HTMLFormElement>(null);
  const baseId = useId();
  const lastHandled = useRef<string | null>(null);

  useEffect(() => {
    if (state.status === 'idle' || state.message === null) return;
    const signature = `${state.status}:${state.message}`;
    if (lastHandled.current === signature) return;
    lastHandled.current = signature;
    if (state.status === 'success') {
      toast.success(state.message);
      formRef.current?.reset();
    } else {
      toast.error(state.message);
    }
  }, [state]);

  const fieldError = (name: string): string | undefined => state.fieldErrors[name]?.[0];

  return (
    <Card>
      <form ref={formRef} action={formAction} className="space-y-3" noValidate>
        <Field label="Project title" htmlFor={`${baseId}-title`} error={fieldError('title')}>
          <Input id={`${baseId}-title`} name="title" required maxLength={300} />
        </Field>
        <Field
          label="Desired outcome"
          htmlFor={`${baseId}-outcome`}
          hint="What is true when this project is finished?"
          error={fieldError('outcome')}
        >
          <Textarea id={`${baseId}-outcome`} name="outcome" rows={2} required maxLength={500} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Status" htmlFor={`${baseId}-status`}>
            <Select id={`${baseId}-status`} name="status" defaultValue="active">
              <option value="proposed">Proposed</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </Select>
          </Field>
          <Field label="Target date" htmlFor={`${baseId}-target`} error={fieldError('targetDate')}>
            <Input id={`${baseId}-target`} name="targetDate" type="date" />
          </Field>
        </div>
        <Submit />
      </form>
    </Card>
  );
}
