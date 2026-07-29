import { DateTime } from 'luxon';
import { withService, withUser } from '@/lib/db/session';
import { listTasks } from '@/domain/tasks/repository';
import {
  ignoreCandidates,
  scoreTasks,
  type IgnoreCandidate,
} from '@/domain/priority/engine';
import type {
  PriorityContext,
  PriorityResult,
  PriorityTaskInput,
} from '@/domain/priority/types';
import type { TaskRecord } from '@/domain/tasks/types';

/**
 * Command Center data assembly — INFORMATION_ARCHITECTURE.md "Today".
 *
 * Reads real records only. Where a source is unavailable (for example Google
 * Calendar before it is connected) the result says so explicitly instead of
 * substituting sample data.
 */

export interface SourceStatus {
  source: 'tasks' | 'calendar' | 'energy' | 'plan';
  state: 'ok' | 'not_connected' | 'stale' | 'failed';
  detail: string;
  lastSuccessAt: string | null;
}

export interface CommandCenterData {
  localDate: string;
  timezone: string;
  now: string;
  priority: PriorityResult;
  tasksById: Map<string, TaskRecord>;
  ignore: IgnoreCandidate[];
  openWindowMinutes: number;
  capacityMinutes: number;
  committedMinutes: number;
  overcommitmentMinutes: number;
  currentEnergy: PriorityContext['currentEnergy'];
  energyCheckedAt: string | null;
  sources: SourceStatus[];
  atRisk: TaskRecord[];
  openMissedCount: number;
  pendingApprovalCount: number;
  inboxCount: number;
}

interface PreferencesRow extends Record<string, unknown> {
  home_timezone: string;
  planning_horizon_days: number;
  contingency_percent: number;
  hard_daily_load_percent: number;
  default_transition_minutes: number;
  weekday_capacity_minutes: number | null;
  weekend_capacity_minutes: number | null;
}

/** Map a stored task into the priority engine's input shape. */
export function toPriorityInput(task: TaskRecord, missedTaskIds: Set<string>): PriorityTaskInput {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    dueAt: task.dueAt,
    dueVerification:
      task.verificationStatus === 'user_confirmed' ||
      task.verificationStatus === 'provider_confirmed'
        ? 'user_confirmed'
        : 'unverified',
    estimatedMinutes: task.estimatedMinutes,
    minimumMinutes: task.minimumMinutes,
    energyRequirement: task.energyRequirement,
    flexibility: task.flexibility,
    consequenceLevel: task.consequenceLevel,
    confidence: task.confidence,
    costCents: task.costCents,
    locationLabel: task.locationLabel,
    downstreamTaskCount: task.downstreamTaskCount,
    isBlockedByDependency: task.isBlockedByDependency,
    isProtectedGoal: false,
    hasLinkedGoal: task.goalId !== null,
    isExplicitTopOutcome: false,
    manualPriority: task.manualPriority,
    manualPriorityExpiresAt: task.manualPriorityExpiresAt,
    healthSafetyImpact: 0,
    financialImpact: task.costCents !== null && task.costCents > 0 ? 40 : 0,
    momentum: 0,
    recovery: missedTaskIds.has(task.id)
      ? {
          recoveryWindowHoursRemaining: task.recoveryWindowHours,
          weeklyTargetAtRisk: false,
          priorMissCount: 1,
        }
      : null,
    lastProgressAt: task.lastProgressAt,
    userBlockedForPeriod: false,
  };
}

export async function loadCommandCenter(
  userId: string,
  options: { now?: Date } = {},
): Promise<CommandCenterData> {
  const now = options.now ?? new Date();

  const context = await withUser(userId, async (db) => {
    const preferences = await db.query<PreferencesRow>(
      `select p.home_timezone,
              up.planning_horizon_days,
              up.contingency_percent,
              up.hard_daily_load_percent,
              up.default_transition_minutes,
              cp.weekday_capacity_minutes,
              cp.weekend_capacity_minutes
         from public.profiles p
         join public.user_preferences up on up.user_id = p.id
         left join public.capacity_profiles cp on cp.user_id = p.id
        where p.id = $1`,
      [userId],
    );

    const energy = await db.query<{ level: PriorityContext['currentEnergy']; checked_at: Date }>(
      `select level, checked_at from public.energy_checkins
        where valid_until is null or valid_until > now()
        order by checked_at desc limit 1`,
    );

    const missed = await db.query<{ task_id: string }>(
      `select task_id from public.missed_commitments where resolved_at is null`,
    );

    const approvals = await db.query<{ count: string }>(
      `select count(*)::text as count from public.schedule_proposals
        where status = 'ready_for_approval'`,
    );

    const inbox = await db.query<{ count: string }>(
      `select count(*)::text as count from public.inbox_items
        where resolved_at is null and deleted_at is null`,
    );

    // `external_calendars` is owner-readable, so it can be read here.
    // `calendar_sync_states` is deliberately server-only (RLS with no
    // authenticated policy and revoked grants), so its freshness is read
    // separately through the service role below.
    const calendars = await db.query<{ selected: string }>(
      `select count(*) filter (where is_selected)::text as selected
         from public.external_calendars`,
    );

    return {
      preferences: preferences.rows[0] ?? null,
      energy: energy.rows[0] ?? null,
      missedTaskIds: new Set(missed.rows.map((row) => row.task_id)),
      pendingApprovalCount: Number(approvals.rows[0]?.count ?? 0),
      inboxCount: Number(inbox.rows[0]?.count ?? 0),
      selectedCalendarCount: Number(calendars.rows[0]?.selected ?? 0),
    };
  });

  // Sync freshness lives on a server-only table; scope it explicitly by user_id
  // because the service role bypasses RLS (SECURITY_AND_PRIVACY.md §4).
  const syncFreshness = await withService(async (db) => {
    const result = await db.query<{ last_succeeded_at: Date | null; worst_status: string | null }>(
      `select max(last_succeeded_at) as last_succeeded_at,
              min(status::text) as worst_status
         from public.calendar_sync_states
        where user_id = $1`,
      [userId],
    );
    return result.rows[0] ?? { last_succeeded_at: null, worst_status: null };
  });

  const timezone = context.preferences?.home_timezone ?? 'America/New_York';
  const local = DateTime.fromJSDate(now).setZone(timezone);
  const isWeekend = local.weekday >= 6;
  const capacityMinutes = isWeekend
    ? (context.preferences?.weekend_capacity_minutes ?? 300)
    : (context.preferences?.weekday_capacity_minutes ?? 180);
  const contingencyPercent = context.preferences?.contingency_percent ?? 15;
  const contingencyMinutes = Math.round((capacityMinutes * contingencyPercent) / 100);

  const { tasks } = await listTasks(userId, {
    includeArchived: false,
    sort: 'created_at',
    direction: 'desc',
    limit: 200,
    offset: 0,
  });

  const activeTasks = tasks.filter(
    (task) => !['completed', 'canceled', 'archived'].includes(task.status),
  );

  // Phase 1 has no calendar-derived windows until Google Calendar is connected.
  // Until then the open window is the remaining capacity for the day, which is
  // stated plainly in the UI rather than presented as a synced calendar view.
  const committedMinutes = activeTasks
    .filter((task) => task.status === 'planned' || task.status === 'in_progress')
    .reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0);

  const minutesLeftToday = Math.max(
    0,
    Math.round(local.endOf('day').diff(local, 'minutes').minutes),
  );
  const openWindowMinutes = Math.max(
    0,
    Math.min(capacityMinutes - committedMinutes, minutesLeftToday),
  );

  const priorityContext: PriorityContext = {
    now: now.toISOString(),
    timezone,
    currentEnergy: context.energy?.level ?? 'normal',
    openWindows:
      openWindowMinutes > 0
        ? [
            {
              startsAt: now.toISOString(),
              endsAt: local.plus({ minutes: openWindowMinutes }).toUTC().toISO() ?? now.toISOString(),
              usableMinutes: openWindowMinutes,
            },
          ]
        : [],
    capacityRemainingMinutes: Math.max(0, capacityMinutes - committedMinutes),
    contingencyRemainingMinutes: contingencyMinutes,
    committedMinutes,
    capacityMinutes,
    hardDailyLoadPercent: context.preferences?.hard_daily_load_percent ?? 110,
    availableLocations: [],
    hardBudgetCents: null,
    contextKey: `today:${local.toISODate() ?? 'unknown'}`,
  };

  const inputs = activeTasks.map((task) => toPriorityInput(task, context.missedTaskIds));
  const priority = scoreTasks(inputs, priorityContext);
  const ignore = ignoreCandidates(priority, inputs);

  const overcommitmentMinutes = Math.max(0, committedMinutes - capacityMinutes);

  const atRisk = activeTasks.filter((task) => {
    if (task.dueAt === null) return false;
    const hours = (Date.parse(task.dueAt) - now.getTime()) / 3_600_000;
    return hours <= 48 && task.consequenceLevel >= 50;
  });

  const calendarConnected = context.selectedCalendarCount > 0;
  const sources: SourceStatus[] = [
    {
      source: 'tasks',
      state: 'ok',
      detail: `${activeTasks.length} active task(s) loaded from the database.`,
      lastSuccessAt: now.toISOString(),
    },
    {
      source: 'calendar',
      state: calendarConnected ? 'ok' : 'not_connected',
      detail: calendarConnected
        ? 'Google Calendar is connected.'
        : 'Google Calendar is not connected, so fixed commitments and open time are based on your capacity settings only.',
      lastSuccessAt:
        syncFreshness.last_succeeded_at == null
          ? null
          : new Date(syncFreshness.last_succeeded_at).toISOString(),
    },
    {
      source: 'energy',
      state: context.energy === null ? 'stale' : 'ok',
      detail:
        context.energy === null
          ? 'No energy check-in recorded, so recommendations assume normal energy.'
          : `Energy recorded as ${context.energy.level.replace('_', ' ')}.`,
      lastSuccessAt:
        context.energy === null ? null : new Date(context.energy.checked_at).toISOString(),
    },
  ];

  return {
    localDate: local.toISODate() ?? '',
    timezone,
    now: now.toISOString(),
    priority,
    tasksById: new Map(tasks.map((task) => [task.id, task])),
    ignore,
    openWindowMinutes,
    capacityMinutes,
    committedMinutes,
    overcommitmentMinutes,
    currentEnergy: priorityContext.currentEnergy,
    energyCheckedAt:
      context.energy === null ? null : new Date(context.energy.checked_at).toISOString(),
    sources,
    atRisk,
    openMissedCount: context.missedTaskIds.size,
    pendingApprovalCount: context.pendingApprovalCount,
    inboxCount: context.inboxCount,
  };
}
