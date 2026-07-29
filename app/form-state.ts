import type { Warning } from '@/domain/tasks/types';

/**
 * Shared form-state shapes for `useActionState`.
 *
 * These live outside the `'use server'` modules because a server-action file
 * may only export async functions.
 */

export interface MutationState {
  status: 'idle' | 'success' | 'error';
  message: string | null;
  fieldErrors: Record<string, string[]>;
  warnings: Warning[];
  /** Set on success when the change can be undone. */
  undoToken: string | null;
}

export const idleState: MutationState = {
  status: 'idle',
  message: null,
  fieldErrors: {},
  warnings: [],
  undoToken: null,
};

export interface AuthFormState {
  error: string | null;
  fieldErrors: Record<string, string>;
}

export const emptyAuthState: AuthFormState = { error: null, fieldErrors: {} };
