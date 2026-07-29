import type { PriorityContext, PriorityTaskInput, TimeWindow } from '@/domain/priority/types';

/** Deterministic factories for priority-engine tests. */

export const NOW = '2026-07-29T14:00:00.000Z';

export function window(usableMinutes: number, startsAt = NOW): TimeWindow {
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + usableMinutes * 60_000);
  return { startsAt: start.toISOString(), endsAt: end.toISOString(), usableMinutes };
}

export function task(overrides: Partial<PriorityTaskInput> = {}): PriorityTaskInput {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    title: 'Test task',
    status: 'ready',
    dueAt: null,
    dueVerification: 'user_confirmed',
    estimatedMinutes: 30,
    minimumMinutes: null,
    energyRequirement: 'any',
    flexibility: 'medium',
    consequenceLevel: 25,
    confidence: 1,
    costCents: null,
    locationLabel: null,
    downstreamTaskCount: 0,
    isBlockedByDependency: false,
    isProtectedGoal: false,
    hasLinkedGoal: false,
    isExplicitTopOutcome: false,
    manualPriority: null,
    manualPriorityExpiresAt: null,
    healthSafetyImpact: 0,
    financialImpact: 0,
    momentum: 0,
    recovery: null,
    lastProgressAt: null,
    userBlockedForPeriod: false,
    ...overrides,
  };
}

export function context(overrides: Partial<PriorityContext> = {}): PriorityContext {
  return {
    now: NOW,
    timezone: 'America/New_York',
    currentEnergy: 'normal',
    openWindows: [window(120)],
    capacityRemainingMinutes: 180,
    contingencyRemainingMinutes: 30,
    committedMinutes: 0,
    capacityMinutes: 180,
    hardDailyLoadPercent: 110,
    availableLocations: [],
    hardBudgetCents: null,
    contextKey: 'test',
    ...overrides,
  };
}
