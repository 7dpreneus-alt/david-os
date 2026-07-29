'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { ApiError } from '@/lib/http/errors';
import { newCorrelationId } from '@/lib/logging/logger';
import { toFieldErrors } from '@/lib/validation/common';
import {
  completeTask,
  createProject,
  createTask,
  deleteProject,
  deleteTask,
  reopenTask,
  restoreTask,
  updateProject,
  updateTask,
} from '@/domain/tasks/repository';
import {
  createProjectSchema,
  createTaskSchema,
  updateProjectSchema,
  updateTaskSchema,
} from '@/domain/tasks/schemas';
import type { Warning } from '@/domain/tasks/types';
import { type MutationState } from '@/app/form-state';

/**
 * Server actions behind the task and project screens.
 *
 * They call the same repository functions as the REST routes under
 * /api/v1, so there is exactly one implementation of each mutation.
 */


function failure(message: string, fieldErrors: Record<string, string[]> = {}): MutationState {
  return { status: 'error', message, fieldErrors, warnings: [], undoToken: null };
}

function ok(message: string, warnings: Warning[] = [], undoToken: string | null = null): MutationState {
  return { status: 'success', message, fieldErrors: {}, warnings, undoToken };
}

function optionalNumber(value: FormDataEntryValue | null): number | undefined {
  if (value === null) return undefined;
  const text = String(value).trim();
  if (text === '') return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function optionalString(value: FormDataEntryValue | null): string | undefined {
  if (value === null) return undefined;
  const text = String(value).trim();
  return text === '' ? undefined : text;
}

/** Turn a thrown ApiError into form state instead of a 500 page. */
function handle(error: unknown): MutationState {
  if (error instanceof ApiError) {
    return {
      status: 'error',
      message: error.message,
      fieldErrors: error.fieldErrors ?? {},
      warnings: [],
      undoToken: null,
    };
  }
  throw error;
}

export async function createTaskAction(
  _previous: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const user = await requireUser();
  const parsed = createTaskSchema.safeParse({
    title: formData.get('title') ?? '',
    description: optionalString(formData.get('description')),
    projectId: optionalString(formData.get('projectId')),
    lifeAreaId: optionalString(formData.get('lifeAreaId')),
    dueAt: optionalString(formData.get('dueAt')),
    estimatedMinutes: optionalNumber(formData.get('estimatedMinutes')),
    minimumMinutes: optionalNumber(formData.get('minimumMinutes')),
    energyRequirement: optionalString(formData.get('energyRequirement')) ?? 'any',
    flexibility: optionalString(formData.get('flexibility')) ?? 'medium',
    consequenceLevel: optionalNumber(formData.get('consequenceLevel')) ?? 25,
    consequenceReason: optionalString(formData.get('consequenceReason')),
    definitionOfDone: optionalString(formData.get('definitionOfDone')),
    minimumViableDefinition: optionalString(formData.get('minimumViableDefinition')),
    locationLabel: optionalString(formData.get('locationLabel')),
  });

  if (!parsed.success) {
    return failure('Fix the highlighted fields.', toFieldErrors(parsed.error));
  }

  try {
    const result = await createTask(user.id, parsed.data, {
      correlationId: newCorrelationId(),
      idempotencyKey: randomUUID(),
    });
    revalidatePath('/tasks');
    revalidatePath('/today');
    return ok(`Created “${result.task.title}”.`, result.warnings);
  } catch (error) {
    return handle(error);
  }
}

export async function updateTaskAction(
  _previous: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const user = await requireUser();
  const taskId = String(formData.get('taskId') ?? '');
  const parsed = updateTaskSchema.safeParse({
    version: Number(formData.get('version') ?? 0),
    title: optionalString(formData.get('title')),
    description: optionalString(formData.get('description')),
    dueAt: optionalString(formData.get('dueAt')),
    estimatedMinutes: optionalNumber(formData.get('estimatedMinutes')),
    minimumMinutes: optionalNumber(formData.get('minimumMinutes')),
    energyRequirement: optionalString(formData.get('energyRequirement')),
    flexibility: optionalString(formData.get('flexibility')),
    consequenceLevel: optionalNumber(formData.get('consequenceLevel')),
    consequenceReason: optionalString(formData.get('consequenceReason')),
    definitionOfDone: optionalString(formData.get('definitionOfDone')),
    minimumViableDefinition: optionalString(formData.get('minimumViableDefinition')),
    locationLabel: optionalString(formData.get('locationLabel')),
    projectId: optionalString(formData.get('projectId')),
    status: optionalString(formData.get('status')),
  });

  if (!parsed.success) {
    return failure('Fix the highlighted fields.', toFieldErrors(parsed.error));
  }

  try {
    const task = await updateTask(user.id, taskId, parsed.data, {
      correlationId: newCorrelationId(),
      idempotencyKey: randomUUID(),
    });
    revalidatePath('/tasks');
    revalidatePath('/today');
    return ok(`Saved “${task.title}”.`);
  } catch (error) {
    return handle(error);
  }
}

export async function completeTaskAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const taskId = String(formData.get('taskId') ?? '');
  const completionTypeRaw = String(formData.get('completionType') ?? 'full');
  const completionType =
    completionTypeRaw === 'minimum_viable' || completionTypeRaw === 'intentional_skip'
      ? completionTypeRaw
      : 'full';

  await completeTask(
    user.id,
    taskId,
    { completionType },
    { correlationId: newCorrelationId(), idempotencyKey: randomUUID() },
  );
  revalidatePath('/tasks');
  revalidatePath('/today');
}

export async function reopenTaskAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  await reopenTask(user.id, String(formData.get('taskId') ?? ''), {
    correlationId: newCorrelationId(),
    idempotencyKey: randomUUID(),
  });
  revalidatePath('/tasks');
  revalidatePath('/today');
}

export async function deleteTaskAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  await deleteTask(user.id, String(formData.get('taskId') ?? ''), {
    correlationId: newCorrelationId(),
    idempotencyKey: randomUUID(),
  });
  revalidatePath('/tasks');
  revalidatePath('/today');
}

export async function restoreTaskAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  await restoreTask(user.id, String(formData.get('taskId') ?? ''));
  revalidatePath('/tasks');
}

export async function archiveTaskAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const taskId = String(formData.get('taskId') ?? '');
  const version = Number(formData.get('version') ?? 0);
  await updateTask(
    user.id,
    taskId,
    { version, status: 'archived' },
    { correlationId: newCorrelationId(), idempotencyKey: randomUUID() },
  );
  revalidatePath('/tasks');
}

export async function createProjectAction(
  _previous: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const user = await requireUser();
  const parsed = createProjectSchema.safeParse({
    title: formData.get('title') ?? '',
    outcome: formData.get('outcome') ?? '',
    status: optionalString(formData.get('status')) ?? 'active',
    targetDate: optionalString(formData.get('targetDate')),
    budgetCents: optionalNumber(formData.get('budgetCents')),
  });
  if (!parsed.success) {
    return failure('Fix the highlighted fields.', toFieldErrors(parsed.error));
  }
  try {
    const project = await createProject(user.id, parsed.data, {
      correlationId: newCorrelationId(),
    });
    revalidatePath('/projects');
    return ok(`Created “${project.title}”.`);
  } catch (error) {
    return handle(error);
  }
}

export async function updateProjectAction(
  _previous: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const user = await requireUser();
  const projectId = String(formData.get('projectId') ?? '');
  const parsed = updateProjectSchema.safeParse({
    title: optionalString(formData.get('title')),
    outcome: optionalString(formData.get('outcome')),
    status: optionalString(formData.get('status')),
    targetDate: optionalString(formData.get('targetDate')),
    nextActionTaskId: optionalString(formData.get('nextActionTaskId')),
  });
  if (!parsed.success) {
    return failure('Fix the highlighted fields.', toFieldErrors(parsed.error));
  }
  try {
    await updateProject(user.id, projectId, parsed.data, {
      correlationId: newCorrelationId(),
    });
    revalidatePath('/projects');
    return ok('Project saved.');
  } catch (error) {
    return handle(error);
  }
}

export async function deleteProjectAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  await deleteProject(user.id, String(formData.get('projectId') ?? ''), {
    correlationId: newCorrelationId(),
  });
  revalidatePath('/projects');
  revalidatePath('/tasks');
}
