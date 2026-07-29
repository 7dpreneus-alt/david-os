'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Card, Field, Input } from '@/components/ui/primitives';
import { emptyAuthState, type AuthFormState } from '@/app/form-state';

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function AuthForm({
  mode,
  action,
  submitLabel,
  pendingLabel,
  starterDataAvailable = false,
}: {
  mode: 'signin' | 'signup';
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  submitLabel: string;
  pendingLabel: string;
  starterDataAvailable?: boolean;
}) {
  const [state, formAction] = useActionState(action, emptyAuthState);

  return (
    <Card>
      <form action={formAction} className="space-y-4" noValidate>
        {state.error !== null && (
          <p
            role="alert"
            className="rounded-md border border-danger px-3 py-2 text-sm text-danger"
          >
            {state.error}
          </p>
        )}

        {mode === 'signup' && (
          <Field label="Display name (optional)" htmlFor="displayName">
            <Input
              id="displayName"
              name="displayName"
              autoComplete="name"
              maxLength={120}
            />
          </Field>
        )}

        <Field label="Email" htmlFor="email" error={state.fieldErrors.email}>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            aria-invalid={state.fieldErrors.email !== undefined}
            aria-describedby={state.fieldErrors.email !== undefined ? 'email-error' : undefined}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={state.fieldErrors.password}
          hint={mode === 'signup' ? 'At least 12 characters.' : undefined}
        >
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={mode === 'signup' ? 12 : undefined}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            aria-invalid={state.fieldErrors.password !== undefined}
            aria-describedby={
              state.fieldErrors.password !== undefined ? 'password-error' : 'password-hint'
            }
          />
        </Field>

        {mode === 'signup' && starterDataAvailable && (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="installStarterData"
              className="mt-1 size-4"
              defaultChecked
            />
            <span className="text-text-muted">
              Install labelled starter data (life areas, a Houston trip with unverified
              dates, room and workout examples). Everything is marked{' '}
              <strong className="text-starter">Starter</strong> and can be removed in one
              action.
            </span>
          </label>
        )}

        <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
      </form>
    </Card>
  );
}
