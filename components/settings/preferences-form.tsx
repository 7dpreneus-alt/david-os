'use client';

import { useActionState, useEffect, useId, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';
import { Button, Card, CardTitle, Field, Input, Select } from '@/components/ui/primitives';
import { savePreferencesAction } from '@/app/(product)/settings/actions';
import { idleState } from '@/app/form-state';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Berlin',
  'UTC',
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? 'Saving…' : 'Save settings'}
    </Button>
  );
}

export function PreferencesForm({
  defaults,
}: {
  defaults: {
    displayName: string;
    homeTimezone: string;
    planningHorizonDays: number;
    defaultTransitionMinutes: number;
    defaultTravelBufferMinutes: number;
    contingencyPercent: number;
    hardDailyLoadPercent: number;
    weekdayCapacityMinutes: number;
    weekendCapacityMinutes: number;
    syncEventDescriptions: boolean;
  };
}) {
  const [state, formAction] = useActionState(savePreferencesAction, idleState);
  const baseId = useId();
  const lastHandled = useRef<string | null>(null);

  useEffect(() => {
    if (state.status === 'idle' || state.message === null) return;
    const signature = `${state.status}:${state.message}`;
    if (lastHandled.current === signature) return;
    lastHandled.current = signature;
    if (state.status === 'success') toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  const error = (name: string): string | undefined => state.fieldErrors[name]?.[0];
  const options = TIMEZONES.includes(defaults.homeTimezone)
    ? TIMEZONES
    : [defaults.homeTimezone, ...TIMEZONES];

  return (
    <Card>
      <CardTitle>Profile, availability, and capacity</CardTitle>
      <form action={formAction} className="mt-3 space-y-3" noValidate>
        <Field label="Display name" htmlFor={`${baseId}-name`} error={error('displayName')}>
          <Input id={`${baseId}-name`} name="displayName" defaultValue={defaults.displayName} maxLength={120} />
        </Field>

        <Field label="Home timezone" htmlFor={`${baseId}-tz`} error={error('homeTimezone')}>
          <Select id={`${baseId}-tz`} name="homeTimezone" defaultValue={defaults.homeTimezone}>
            {options.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Weekday capacity (minutes)"
            htmlFor={`${baseId}-weekday`}
            hint="Discretionary minutes available on a normal weekday."
            error={error('weekdayCapacityMinutes')}
          >
            <Input
              id={`${baseId}-weekday`}
              name="weekdayCapacityMinutes"
              type="number"
              min={0}
              max={960}
              defaultValue={defaults.weekdayCapacityMinutes}
            />
          </Field>
          <Field
            label="Weekend capacity (minutes)"
            htmlFor={`${baseId}-weekend`}
            error={error('weekendCapacityMinutes')}
          >
            <Input
              id={`${baseId}-weekend`}
              name="weekendCapacityMinutes"
              type="number"
              min={0}
              max={1200}
              defaultValue={defaults.weekendCapacityMinutes}
            />
          </Field>
          <Field
            label="Planning horizon (days)"
            htmlFor={`${baseId}-horizon`}
            error={error('planningHorizonDays')}
          >
            <Input
              id={`${baseId}-horizon`}
              name="planningHorizonDays"
              type="number"
              min={1}
              max={90}
              defaultValue={defaults.planningHorizonDays}
            />
          </Field>
          <Field
            label="Transition buffer (minutes)"
            htmlFor={`${baseId}-transition`}
            error={error('defaultTransitionMinutes')}
          >
            <Input
              id={`${baseId}-transition`}
              name="defaultTransitionMinutes"
              type="number"
              min={0}
              max={180}
              defaultValue={defaults.defaultTransitionMinutes}
            />
          </Field>
          <Field
            label="Travel buffer (minutes)"
            htmlFor={`${baseId}-travel`}
            error={error('defaultTravelBufferMinutes')}
          >
            <Input
              id={`${baseId}-travel`}
              name="defaultTravelBufferMinutes"
              type="number"
              min={0}
              max={240}
              defaultValue={defaults.defaultTravelBufferMinutes}
            />
          </Field>
          <Field
            label="Contingency (%)"
            htmlFor={`${baseId}-contingency`}
            hint="Reserved slack so a full day is not a fragile day."
            error={error('contingencyPercent')}
          >
            <Input
              id={`${baseId}-contingency`}
              name="contingencyPercent"
              type="number"
              min={0}
              max={50}
              defaultValue={defaults.contingencyPercent}
            />
          </Field>
          <Field
            label="Hard daily load ceiling (%)"
            htmlFor={`${baseId}-load`}
            error={error('hardDailyLoadPercent')}
          >
            <Input
              id={`${baseId}-load`}
              name="hardDailyLoadPercent"
              type="number"
              min={80}
              max={150}
              defaultValue={defaults.hardDailyLoadPercent}
            />
          </Field>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="syncEventDescriptions"
            defaultChecked={defaults.syncEventDescriptions}
            className="mt-1 size-4"
          />
          <span className="text-text-muted">
            Mirror calendar event descriptions when Calendar sync is enabled. Leave off to
            store only the fields planning needs.
          </span>
        </label>

        <Submit />
      </form>
    </Card>
  );
}
