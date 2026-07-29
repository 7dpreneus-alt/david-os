'use client';

import { useId } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Card, CardTitle, Field, Input, Select } from '@/components/ui/primitives';
import { recordEnergyAction } from '@/app/(product)/today/actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
      {pending ? 'Recording…' : 'Record check-in'}
    </Button>
  );
}

export function EnergyCheckIn({
  currentEnergy,
  checkedAt,
}: {
  currentEnergy: string;
  checkedAt: string | null;
}) {
  const baseId = useId();

  return (
    <Card>
      <CardTitle>Energy</CardTitle>
      <p className="mt-1 text-xs text-text-muted">
        {checkedAt === null
          ? 'No check-in recorded. Recommendations assume normal energy.'
          : `Recorded ${new Date(checkedAt).toLocaleString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
            })} as ${currentEnergy.replace('_', ' ')}.`}
      </p>
      <form action={recordEnergyAction} className="mt-3 space-y-2">
        <Field label="Current energy" htmlFor={`${baseId}-level`}>
          <Select id={`${baseId}-level`} name="level" defaultValue={currentEnergy}>
            <option value="very_low">Very low</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="very_high">Very high</option>
          </Select>
        </Field>
        <Field label="Reason (optional)" htmlFor={`${baseId}-reason`}>
          <Input id={`${baseId}-reason`} name="reason" maxLength={200} />
        </Field>
        <Submit />
      </form>
    </Card>
  );
}
