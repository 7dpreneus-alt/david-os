'use client';

import { useFormStatus } from 'react-dom';
import { Button, Card, CardTitle } from '@/components/ui/primitives';
import { signOutAction } from '@/app/(auth)/actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending} aria-busy={pending}>
      {pending ? 'Signing out…' : 'Sign out'}
    </Button>
  );
}

/**
 * Sign out from Settings.
 *
 * The sidebar's sign-out control is hidden below the `md` breakpoint, which left
 * mobile users with no way to end their session. Settings is reachable from the
 * mobile navigation, so this control is available at every viewport.
 */
export function SignOutPanel() {
  return (
    <Card>
      <CardTitle>Session</CardTitle>
      <p className="mt-1 text-sm text-text-muted">
        Signing out clears your session cookie on this device.
      </p>
      <form action={signOutAction} className="mt-3">
        <Submit />
      </form>
    </Card>
  );
}
