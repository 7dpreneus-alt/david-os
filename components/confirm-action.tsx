'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/primitives';

function ConfirmSubmit({ pendingLabel, label }: { pendingLabel: string; label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="danger" disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

/**
 * Two-step confirmation for a destructive server action.
 * INFORMATION_ARCHITECTURE.md: "Destructive changes require confirmation."
 */
export function ConfirmAction({
  action,
  hidden,
  triggerLabel,
  question,
  confirmLabel = 'Yes, delete',
  pendingLabel = 'Deleting…',
}: {
  action: (formData: FormData) => Promise<void>;
  hidden: Record<string, string>;
  triggerLabel: string;
  question: string;
  confirmLabel?: string;
  pendingLabel?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-danger"
        onClick={() => setConfirming(true)}
      >
        {triggerLabel}
      </Button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Confirm action"
      className="flex flex-wrap items-center gap-2 rounded-md border border-danger px-2 py-1.5"
    >
      <span className="text-xs">{question}</span>
      <form action={action}>
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <ConfirmSubmit label={confirmLabel} pendingLabel={pendingLabel} />
      </form>
      <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  );
}
