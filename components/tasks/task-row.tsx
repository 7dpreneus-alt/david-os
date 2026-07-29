'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';
import { Badge, Button, Card, Field, Input, Select, Textarea } from '@/components/ui/primitives';
import { formatMinutes } from '@/lib/utils';
import type { TaskRecord } from '@/domain/tasks/types';
import {
  archiveTaskAction,
  completeTaskAction,
  deleteTaskAction,
  reopenTaskAction,
  restoreTaskAction,
  updateTaskAction,
} from '@/app/(product)/tasks/actions';
import { idleState } from '@/app/form-state';

function PendingButton({
  children,
  pendingLabel,
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

const TERMINAL_STATUSES = new Set(['completed', 'canceled']);

export function TaskRow({
  task,
  projects,
}: {
  task: TaskRecord;
  projects: Array<{ id: string; title: string }>;
}) {
  // The editor is open for one specific version of the task. A successful
  // save bumps `task.version` and revalidates the page, so the editor closes
  // as derived state rather than from a setState inside an effect.
  const [editingVersion, setEditingVersion] = useState<number | null>(null);
  const editing = editingVersion === task.version;
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [state, formAction] = useActionState(updateTaskAction, idleState);
  const baseId = useId();
  const lastHandled = useRef<string | null>(null);

  useEffect(() => {
    if (state.status === 'idle' || state.message === null) return;
    const signature = `${state.status}:${state.message}`;
    if (lastHandled.current === signature) return;
    lastHandled.current = signature;
    if (state.status === 'success') {
      toast.success(state.message);
    } else {
      toast.error(state.message);
    }
  }, [state]);

  const done = TERMINAL_STATUSES.has(task.status);
  const fieldError = (name: string): string | undefined => state.fieldErrors[name]?.[0];

  return (
    <Card className={done ? 'opacity-70' : undefined}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${done ? 'line-through' : ''}`}>{task.title}</p>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={done ? 'positive' : 'neutral'}>{task.status.replace('_', ' ')}</Badge>
            {task.source === 'starter' && <Badge tone="starter">Starter</Badge>}
            {task.isBlockedByDependency && <Badge tone="warning">Blocked</Badge>}
            {task.projectTitle !== null && <Badge>{task.projectTitle}</Badge>}
            <Badge>{formatMinutes(task.estimatedMinutes)}</Badge>
            {task.dueAt !== null && (
              <Badge tone="accent">
                due {new Date(task.dueAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Badge>
            )}
            {task.confidence < 0.8 && (
              <Badge tone="warning">confidence {Math.round(task.confidence * 100)}%</Badge>
            )}
          </div>

          {task.definitionOfDone !== null && (
            <p className="mt-2 text-xs text-text-muted">Done when: {task.definitionOfDone}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {!done ? (
            <>
              <form action={completeTaskAction}>
                <input type="hidden" name="taskId" value={task.id} />
                <input type="hidden" name="completionType" value="full" />
                <PendingButton type="submit" size="sm" pendingLabel="Saving…">
                  Complete
                </PendingButton>
              </form>
              {task.minimumMinutes !== null && (
                <form action={completeTaskAction}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <input type="hidden" name="completionType" value="minimum_viable" />
                  <PendingButton
                    type="submit"
                    size="sm"
                    variant="secondary"
                    pendingLabel="Saving…"
                    title="Records a minimum viable completion, which is not the same as full completion."
                  >
                    Minimum
                  </PendingButton>
                </form>
              )}
            </>
          ) : (
            <form action={reopenTaskAction}>
              <input type="hidden" name="taskId" value={task.id} />
              <PendingButton type="submit" size="sm" variant="secondary" pendingLabel="Saving…">
                Reopen
              </PendingButton>
            </form>
          )}

          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-expanded={editing}
            aria-controls={`${baseId}-edit`}
            onClick={() => setEditingVersion(editing ? null : task.version)}
          >
            {editing ? 'Cancel' : 'Edit'}
          </Button>
        </div>
      </div>

      {editing && (
        <form id={`${baseId}-edit`} action={formAction} className="mt-4 space-y-3 border-t border-border pt-4" noValidate>
          <input type="hidden" name="taskId" value={task.id} />
          <input type="hidden" name="version" value={task.version} />

          <Field label="Title" htmlFor={`${baseId}-title`} error={fieldError('title')}>
            <Input id={`${baseId}-title`} name="title" defaultValue={task.title} maxLength={300} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Estimated minutes"
              htmlFor={`${baseId}-est`}
              error={fieldError('estimatedMinutes')}
            >
              <Input
                id={`${baseId}-est`}
                name="estimatedMinutes"
                type="number"
                min={1}
                max={2880}
                defaultValue={task.estimatedMinutes ?? ''}
              />
            </Field>
            <Field
              label="Minimum minutes"
              htmlFor={`${baseId}-min`}
              error={fieldError('minimumMinutes')}
            >
              <Input
                id={`${baseId}-min`}
                name="minimumMinutes"
                type="number"
                min={1}
                max={1440}
                defaultValue={task.minimumMinutes ?? ''}
              />
            </Field>
            <Field label="Due" htmlFor={`${baseId}-due`} error={fieldError('dueAt')}>
              <Input
                id={`${baseId}-due`}
                name="dueAt"
                type="datetime-local"
                defaultValue={
                  task.dueAt === null ? '' : new Date(task.dueAt).toISOString().slice(0, 16)
                }
              />
            </Field>
            <Field label="Project" htmlFor={`${baseId}-project`}>
              <Select
                id={`${baseId}-project`}
                name="projectId"
                defaultValue={task.projectId ?? ''}
              >
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Energy required" htmlFor={`${baseId}-energy`}>
              <Select
                id={`${baseId}-energy`}
                name="energyRequirement"
                defaultValue={task.energyRequirement}
              >
                <option value="any">Any</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </Field>
            <Field label="Flexibility" htmlFor={`${baseId}-flex`}>
              <Select id={`${baseId}-flex`} name="flexibility" defaultValue={task.flexibility}>
                <option value="fixed">Fixed</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </Field>
            <Field
              label="Consequence of delay"
              htmlFor={`${baseId}-cons`}
              error={fieldError('consequenceLevel')}
            >
              <Input
                id={`${baseId}-cons`}
                name="consequenceLevel"
                type="number"
                min={0}
                max={100}
                defaultValue={task.consequenceLevel}
              />
            </Field>
            <Field label="Status" htmlFor={`${baseId}-status`}>
              <Select id={`${baseId}-status`} name="status" defaultValue={task.status}>
                <option value="ready">Ready</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In progress</option>
                <option value="blocked">Blocked</option>
                <option value="missed">Missed</option>
              </Select>
            </Field>
          </div>

          <Field label="Definition of done" htmlFor={`${baseId}-dod`}>
            <Textarea
              id={`${baseId}-dod`}
              name="definitionOfDone"
              rows={2}
              defaultValue={task.definitionOfDone ?? ''}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <PendingButton type="submit" size="sm" pendingLabel="Saving…">
              Save changes
            </PendingButton>
          </div>
        </form>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <form action={archiveTaskAction}>
          <input type="hidden" name="taskId" value={task.id} />
          <input type="hidden" name="version" value={task.version} />
          <PendingButton type="submit" size="sm" variant="ghost" pendingLabel="Archiving…">
            Archive
          </PendingButton>
        </form>

        {!confirmingDelete ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-danger"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </Button>
        ) : (
          <div
            role="group"
            aria-label="Confirm delete"
            className="flex flex-wrap items-center gap-2 rounded-md border border-danger px-2 py-1.5"
          >
            <span className="text-xs">Delete this task? You can restore it afterwards.</span>
            <form
              action={async (formData: FormData) => {
                await deleteTaskAction(formData);
                toast.success('Task deleted.', {
                  action: {
                    label: 'Undo',
                    onClick: () => {
                      const undo = new FormData();
                      undo.set('taskId', task.id);
                      void restoreTaskAction(undo).then(() => toast.success('Task restored.'));
                    },
                  },
                });
              }}
            >
              <input type="hidden" name="taskId" value={task.id} />
              <PendingButton type="submit" size="sm" variant="danger" pendingLabel="Deleting…">
                Yes, delete
              </PendingButton>
            </form>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setConfirmingDelete(false)}
            >
              Keep
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
