'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { authProvider, ensureAccountRecords, AuthError } from '@/lib/auth';
import { createLogger, newCorrelationId } from '@/lib/logging/logger';
import { recordAudit } from '@/domain/tasks/repository';
import { installStarterData } from '@/domain/starter/install';
import { serverEnv } from '@/lib/env';
import type { AuthFormState } from '@/app/form-state';

const signInSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

const signUpSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(12, 'Use at least 12 characters.'),
  displayName: z.string().trim().max(120).optional(),
});

function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && out[key] === undefined) out[key] = issue.message;
  }
  return out;
}

export async function signInAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: null, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const correlationId = newCorrelationId();
  const logger = createLogger({ correlationId, bindings: { action: 'sign_in' } });

  try {
    const { user } = await authProvider().signIn(parsed.data.email, parsed.data.password);
    await ensureAccountRecords(user);
    await recordAudit({
      userId: user.id,
      eventType: 'auth.signed_in',
      entityType: 'user',
      entityId: user.id,
      correlationId,
    });
    logger.info('sign_in_succeeded');
  } catch (error) {
    if (error instanceof AuthError) {
      logger.warn('sign_in_failed', { reason: error.reason });
      return { error: error.message, fieldErrors: {} };
    }
    logger.error('sign_in_errored', {
      errorClass: error instanceof Error ? error.name : typeof error,
    });
    return {
      error: 'Sign-in is unavailable right now. Please try again.',
      fieldErrors: {},
    };
  }

  redirect('/today');
}

export async function signUpAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    displayName: formData.get('displayName') ?? undefined,
  });
  if (!parsed.success) {
    return { error: null, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const correlationId = newCorrelationId();
  const logger = createLogger({ correlationId, bindings: { action: 'sign_up' } });
  const wantsStarterData = formData.get('installStarterData') === 'on';

  try {
    const { user } = await authProvider().signUp(
      parsed.data.email,
      parsed.data.password,
      parsed.data.displayName,
    );
    await ensureAccountRecords(user);
    await recordAudit({
      userId: user.id,
      eventType: 'auth.signed_up',
      entityType: 'user',
      entityId: user.id,
      correlationId,
    });
    if (wantsStarterData && serverEnv().FEATURE_STARTER_DATA) {
      await installStarterData(user.id, { correlationId });
    }
    logger.info('sign_up_succeeded', { starterData: wantsStarterData });
  } catch (error) {
    if (error instanceof AuthError) {
      logger.warn('sign_up_failed', { reason: error.reason });
      const field = error.reason === 'weak_password' ? 'password' : 'email';
      return { error: null, fieldErrors: { [field]: error.message } };
    }
    logger.error('sign_up_errored', {
      errorClass: error instanceof Error ? error.name : typeof error,
    });
    return {
      error: 'Account creation is unavailable right now. Please try again.',
      fieldErrors: {},
    };
  }

  redirect('/today');
}

export async function signOutAction(): Promise<void> {
  await authProvider().signOut();
  redirect('/login');
}
