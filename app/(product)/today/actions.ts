'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { withUser } from '@/lib/db/session';
import { completeTask, recordAudit } from '@/domain/tasks/repository';
import { energyLevel } from '@/lib/validation/common';
import { newCorrelationId } from '@/lib/logging/logger';

/**
 * Energy check-in.
 *
 * ACCEPTANCE_CRITERIA.md: "Energy change affects recommendations only through a
 * recorded check-in." Recording one writes a row; it does not silently rebuild
 * the plan.
 */
export async function recordEnergyAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const level = energyLevel.parse(String(formData.get('level') ?? 'normal'));
  const reasonRaw = String(formData.get('reason') ?? '').trim();
  const correlationId = newCorrelationId();

  await withUser(user.id, async (db) => {
    await db.query(
      `insert into public.energy_checkins (user_id, level, reason, valid_until)
       values ($1, $2::public.energy_level, $3, now() + interval '6 hours')`,
      [user.id, level, reasonRaw === '' ? null : reasonRaw],
    );
  });

  await recordAudit({
    userId: user.id,
    eventType: 'energy.checked_in',
    entityType: 'energy_checkin',
    entityId: null,
    correlationId,
    metadata: { level },
  });

  revalidatePath('/today');
}

export async function completeFromTodayAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  await completeTask(
    user.id,
    String(formData.get('taskId') ?? ''),
    { completionType: 'full' },
    { correlationId: newCorrelationId(), idempotencyKey: randomUUID() },
  );
  revalidatePath('/today');
  revalidatePath('/tasks');
}
