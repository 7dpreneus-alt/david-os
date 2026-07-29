'use client';

import { useFormStatus } from 'react-dom';
import { Badge, Button, Card, CardTitle } from '@/components/ui/primitives';
import { ConfirmAction } from '@/components/confirm-action';
import {
  installStarterDataAction,
  removeStarterDataAction,
} from '@/app/(product)/settings/actions';

function InstallSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
      {pending ? 'Installing…' : 'Install starter data'}
    </Button>
  );
}

export function StarterDataPanel({ installed }: { installed: boolean }) {
  return (
    <Card>
      <CardTitle>Starter data</CardTitle>
      <div className="mt-2">
        <Badge tone={installed ? 'starter' : 'neutral'}>
          {installed ? 'Installed' : 'Not installed'}
        </Badge>
      </div>
      <p className="mt-2 text-sm text-text-muted">
        Starter records are labelled <strong className="text-starter">Starter</strong>{' '}
        everywhere they appear and never mix into metrics unlabelled. The Houston trip is
        included with unverified dates, so it cannot generate deadlines until you confirm
        them.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {installed ? (
          <ConfirmAction
            action={removeStarterDataAction}
            hidden={{}}
            triggerLabel="Remove all starter data"
            question="Remove every starter record? Anything you edited will also be removed."
            confirmLabel="Yes, remove"
            pendingLabel="Removing…"
          />
        ) : (
          <form action={installStarterDataAction}>
            <InstallSubmit />
          </form>
        )}
      </div>
    </Card>
  );
}
