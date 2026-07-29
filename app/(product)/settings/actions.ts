'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { withUser } from '@/lib/db/session';
import { serverEnv } from '@/lib/env';
import { ianaTimezone } from '@/lib/validation/common';
import { newCorrelationId } from '@/lib/logging/logger';
import { installStarterData, removeStarterData } from '@/domain/starter/install';
import { exportUserData } from '@/domain/data/export';
import type { MutationState } from '@/app/form-state';

const preferencesSchema = z.object({
  displayName: z.string().trim().max(120).optional(),
  homeTimezone: ianaTimezone,
  planningHorizonDays: z.coerce.number().int().min(1).max(90),
  defaultTransitionMinutes: z.coerce.number().int().min(0).max(180),
  defaultTravelBufferMinutes: z.coerce.number().int().min(0).max(240),
  contingencyPercent: z.coerce.number().int().min(0).max(50),
  hardDailyLoadPercent: z.coerce.number().int().min(80).max(150),
  weekdayCapacityMinutes: z.coerce.number().int().min(0).max(960),
  weekendCapacityMinutes: z.coerce.number().int().min(0).max(1200),
  syncEventDescriptions: z.coerce.boolean().default(false),
});

export async function savePreferencesAction(
  _previous: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const user = await requireUser();
  const parsed = preferencesSchema.safeParse({
    displayName: formData.get('displayName') ?? undefined,
    homeTimezone: formData.get('homeTimezone') ?? '',
    planningHorizonDays: formData.get('planningHorizonDays') ?? 14,
    defaultTransitionMinutes: formData.get('defaultTransitionMinutes') ?? 10,
    defaultTravelBufferMinutes: formData.get('defaultTravelBufferMinutes') ?? 20,
    contingencyPercent: formData.get('contingencyPercent') ?? 15,
    hardDailyLoadPercent: formData.get('hardDailyLoadPercent') ?? 110,
    weekdayCapacityMinutes: formData.get('weekdayCapacityMinutes') ?? 180,
    weekendCapacityMinutes: formData.get('weekendCapacityMinutes') ?? 300,
    syncEventDescriptions: formData.get('syncEventDescriptions') === 'on',
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '_');
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return {
      status: 'error',
      message: 'Fix the highlighted fields.',
      fieldErrors,
      warnings: [],
      undoToken: null,
    };
  }

  const input = parsed.data;
  await withUser(user.id, async (db) => {
    await db.query(
      `update public.profiles set display_name = $2, home_timezone = $3 where id = $1`,
      [user.id, input.displayName ?? null, input.homeTimezone],
    );
    await db.query(
      `update public.user_preferences
          set planning_horizon_days = $2,
              default_transition_minutes = $3,
              default_travel_buffer_minutes = $4,
              contingency_percent = $5,
              hard_daily_load_percent = $6,
              sync_event_descriptions = $7
        where user_id = $1`,
      [
        user.id,
        input.planningHorizonDays,
        input.defaultTransitionMinutes,
        input.defaultTravelBufferMinutes,
        input.contingencyPercent,
        input.hardDailyLoadPercent,
        input.syncEventDescriptions,
      ],
    );
    await db.query(
      `insert into public.capacity_profiles (user_id, weekday_capacity_minutes, weekend_capacity_minutes)
       values ($1,$2,$3)
       on conflict (user_id) do update
         set weekday_capacity_minutes = excluded.weekday_capacity_minutes,
             weekend_capacity_minutes = excluded.weekend_capacity_minutes`,
      [user.id, input.weekdayCapacityMinutes, input.weekendCapacityMinutes],
    );
  });

  revalidatePath('/settings');
  revalidatePath('/today');
  return {
    status: 'success',
    message: 'Settings saved.',
    fieldErrors: {},
    warnings: [],
    undoToken: null,
  };
}

export async function installStarterDataAction(): Promise<void> {
  const user = await requireUser();
  if (!serverEnv().FEATURE_STARTER_DATA) return;
  await installStarterData(user.id, { correlationId: newCorrelationId() });
  revalidatePath('/settings');
  revalidatePath('/today');
  revalidatePath('/tasks');
  revalidatePath('/projects');
}

export async function removeStarterDataAction(): Promise<void> {
  const user = await requireUser();
  await removeStarterData(user.id, { correlationId: newCorrelationId() });
  revalidatePath('/settings');
  revalidatePath('/today');
  revalidatePath('/tasks');
  revalidatePath('/projects');
}

/** Returns the export as a JSON string so the client can download it. */
export async function generateExportAction(): Promise<string> {
  const user = await requireUser();
  const payload = await exportUserData(user.id, { correlationId: newCorrelationId() });
  return JSON.stringify(payload, null, 2);
}
