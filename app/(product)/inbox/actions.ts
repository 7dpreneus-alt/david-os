'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { ApiError } from '@/lib/http/errors';
import { newCorrelationId } from '@/lib/logging/logger';
import { toFieldErrors } from '@/lib/validation/common';
import {
  convertInboxItem,
  createInboxItem,
  deleteInboxItem,
} from '@/domain/tasks/repository';
import { convertInboxItemSchema, createInboxItemSchema } from '@/domain/tasks/schemas';
import type { MutationState } from '@/app/form-state';

export async function captureAction(
  _previous: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const user = await requireUser();
  const clientCaptureId = String(formData.get('clientCaptureId') ?? '').trim();
  const parsed = createInboxItemSchema.safeParse({
    rawText: formData.get('rawText') ?? '',
    ...(clientCaptureId === '' ? {} : { clientCaptureId }),
  });
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Enter something to capture.',
      fieldErrors: toFieldErrors(parsed.error),
      warnings: [],
      undoToken: null,
    };
  }

  try {
    const item = await createInboxItem(user.id, parsed.data, {
      correlationId: newCorrelationId(),
    });
    revalidatePath('/inbox');
    revalidatePath('/today');
    return {
      status: 'success',
      message: 'Captured.',
      fieldErrors: {},
      warnings:
        item.duplicateCandidates.length > 0
          ? [
              {
                code: 'POSSIBLE_DUPLICATE',
                message: `This looks like ${item.duplicateCandidates.length} existing task(s). Nothing was merged.`,
              },
            ]
          : [],
      undoToken: null,
    };
  } catch (error) {
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
}

export async function convertAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const inboxItemId = String(formData.get('inboxItemId') ?? '');
  const parsed = convertInboxItemSchema.parse({
    target: String(formData.get('target') ?? 'task'),
    ...(String(formData.get('estimatedMinutes') ?? '').trim() === ''
      ? {}
      : { estimatedMinutes: Number(formData.get('estimatedMinutes')) }),
  });
  await convertInboxItem(user.id, inboxItemId, parsed, {
    correlationId: newCorrelationId(),
  });
  revalidatePath('/inbox');
  revalidatePath('/tasks');
  revalidatePath('/projects');
}

export async function discardCaptureAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  await deleteInboxItem(user.id, String(formData.get('inboxItemId') ?? ''));
  revalidatePath('/inbox');
}
