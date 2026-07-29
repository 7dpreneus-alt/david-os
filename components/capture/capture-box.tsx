'use client';

import { useActionState, useEffect, useId, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';
import { Button, Card, Field, Textarea } from '@/components/ui/primitives';
import { captureAction } from '@/app/(product)/inbox/actions';
import { idleState } from '@/app/form-state';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? 'Capturing…' : 'Capture'}
    </Button>
  );
}

/**
 * Rapid capture.
 *
 * A client-generated capture id accompanies every submission. The server treats
 * it as an idempotency key, so a retried or replayed submission returns the
 * original row instead of creating a second one (ACCEPTANCE_CRITERIA.md
 * "Offline capture queues and saves once").
 */
export function CaptureBox() {
  const [state, formAction] = useActionState(captureAction, idleState);
  const formRef = useRef<HTMLFormElement>(null);
  const captureIdRef = useRef<HTMLInputElement>(null);
  const baseId = useId();
  const lastHandled = useRef<string | null>(null);

  useEffect(() => {
    if (state.status === 'idle' || state.message === null) return;
    const signature = `${state.status}:${state.message}:${state.warnings.length}`;
    if (lastHandled.current === signature) return;
    lastHandled.current = signature;

    if (state.status === 'success') {
      toast.success(state.message, {
        description:
          state.warnings.length > 0 ? state.warnings[0]?.message : undefined,
      });
      formRef.current?.reset();
      // A new capture id for the next submission.
      if (captureIdRef.current !== null) {
        captureIdRef.current.value = crypto.randomUUID();
      }
    } else {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <Card>
      <form ref={formRef} action={formAction} className="space-y-3" noValidate>
        <input
          ref={captureIdRef}
          type="hidden"
          name="clientCaptureId"
          defaultValue={
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : ''
          }
        />
        <Field
          label="Capture"
          htmlFor={`${baseId}-raw`}
          error={state.fieldErrors.rawText?.[0]}
        >
          <Textarea
            id={`${baseId}-raw`}
            name="rawText"
            rows={2}
            required
            maxLength={2000}
            placeholder="Anything on your mind. Sort it out later."
            aria-invalid={state.fieldErrors.rawText !== undefined}
          />
        </Field>
        <Submit />
      </form>
    </Card>
  );
}
