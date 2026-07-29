'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import { Button, Card, Field, Input, Select, Textarea } from '@/components/ui/primitives';
import { createTaskAction } from '@/app/(product)/tasks/actions';
import { idleState } from '@/app/form-state';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? 'Adding…' : 'Add task'}
    </Button>
  );
}

/**
 * Task creation. Title alone is enough to submit; the optional fields are
 * collapsed so capture stays fast. Warnings returned by the server explain what
 * is missing without blocking the save.
 */
export function TaskComposer({ projects }: { projects: Array<{ id: string; title: string }> }) {
  const [state, formAction] = useActionState(createTaskAction, idleState);
  const [expanded, setExpanded] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const baseId = useId();
  const lastHandled = useRef<string | null>(null);

  useEffect(() => {
    if (state.status === 'idle' || state.message === null) return;
    const signature = `${state.status}:${state.message}`;
    if (lastHandled.current === signature) return;
    lastHandled.current = signature;

    if (state.status === 'success') {
      toast.success(state.message, {
        description:
          state.warnings.length > 0
            ? state.warnings.map((warning) => warning.message).join(' ')
            : undefined,
      });
      formRef.current?.reset();
    } else {
      toast.error(state.message);
    }
  }, [state]);

  const fieldError = (name: string): string | undefined => state.fieldErrors[name]?.[0];

  return (
    <Card>
      <form ref={formRef} action={formAction} className="space-y-3" noValidate>
        <Field label="Task title" htmlFor={`${baseId}-title`} error={fieldError('title')}>
          <div className="flex gap-2">
            <Input
              id={`${baseId}-title`}
              name="title"
              required
              maxLength={300}
              placeholder="What needs to happen?"
              aria-invalid={fieldError('title') !== undefined}
            />
            <Submit />
          </div>
        </Field>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={`${baseId}-details`}
          className="flex min-h-9 items-center gap-1 text-xs font-medium text-text-muted hover:text-text"
        >
          <ChevronDown
            aria-hidden="true"
            className={`size-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
          {expanded ? 'Hide planning details' : 'Add planning details'}
        </button>

        <div id={`${baseId}-details`} hidden={!expanded} className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Estimated minutes"
            htmlFor={`${baseId}-estimated`}
            hint="Without this the task cannot be fitted to an open window."
            error={fieldError('estimatedMinutes')}
          >
            <Input
              id={`${baseId}-estimated`}
              name="estimatedMinutes"
              type="number"
              min={1}
              max={2880}
              inputMode="numeric"
            />
          </Field>

          <Field
            label="Minimum viable minutes"
            htmlFor={`${baseId}-minimum`}
            hint="A meaningful reduced version, not a token effort."
            error={fieldError('minimumMinutes')}
          >
            <Input
              id={`${baseId}-minimum`}
              name="minimumMinutes"
              type="number"
              min={1}
              max={1440}
              inputMode="numeric"
            />
          </Field>

          <Field label="Due" htmlFor={`${baseId}-due`} error={fieldError('dueAt')}>
            <Input id={`${baseId}-due`} name="dueAt" type="datetime-local" />
          </Field>

          <Field label="Project" htmlFor={`${baseId}-project`}>
            <Select id={`${baseId}-project`} name="projectId" defaultValue="">
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Energy required" htmlFor={`${baseId}-energy`}>
            <Select id={`${baseId}-energy`} name="energyRequirement" defaultValue="any">
              <option value="any">Any</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </Field>

          <Field
            label="Flexibility"
            htmlFor={`${baseId}-flexibility`}
            hint="Fixed work is never moved by the planner."
          >
            <Select id={`${baseId}-flexibility`} name="flexibility" defaultValue="medium">
              <option value="fixed">Fixed</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </Field>

          <Field
            label="Consequence of delay (0–100)"
            htmlFor={`${baseId}-consequence`}
            hint="90 or above needs a short reason."
            error={fieldError('consequenceLevel')}
          >
            <Input
              id={`${baseId}-consequence`}
              name="consequenceLevel"
              type="number"
              min={0}
              max={100}
              defaultValue={25}
              inputMode="numeric"
            />
          </Field>

          <Field
            label="Reason for severe consequence"
            htmlFor={`${baseId}-consequence-reason`}
            error={fieldError('consequenceReason')}
          >
            <Input
              id={`${baseId}-consequence-reason`}
              name="consequenceReason"
              maxLength={500}
            />
          </Field>

          <Field label="Location" htmlFor={`${baseId}-location`}>
            <Input id={`${baseId}-location`} name="locationLabel" maxLength={120} />
          </Field>

          <div className="sm:col-span-2">
            <Field
              label="Definition of done"
              htmlFor={`${baseId}-dod`}
              hint="What must be true for this to count as complete?"
            >
              <Textarea id={`${baseId}-dod`} name="definitionOfDone" rows={2} maxLength={1000} />
            </Field>
          </div>
        </div>
      </form>
    </Card>
  );
}
