import { describe, expect, it } from 'vitest';
import {
  ENGINE_VERSION,
  WEIGHTS,
  calendarFitScore,
  deadlineProximityScore,
  energyCompatibilityScore,
  ignoreCandidates,
  scoreTasks,
} from '@/domain/priority/engine';
import { NOW, context, task, window } from '../factories/priority';

describe('priority engine — weights', () => {
  it('uses the published factor weights verbatim (PRIORITY_ENGINE.md §4)', () => {
    expect(WEIGHTS).toEqual({
      deadlineProximity: 15,
      consequenceOfDelay: 14,
      strategicValue: 12,
      dependencyImpact: 8,
      healthSafetyImpact: 10,
      financialImpact: 8,
      opportunityValue: 4,
      momentumValue: 5,
      recoveryUrgency: 8,
      energyCompatibility: 5,
      calendarFit: 6,
      flexibilityPressure: 3,
    });
  });

  it('documents that the published table sums to 98, not 100 (DECISION_LOG D-017)', () => {
    const total = Object.values(WEIGHTS).reduce((sum, value) => sum + value, 0);
    expect(total).toBe(98);
  });
});

describe('deadline proximity', () => {
  const nowMs = Date.parse(NOW);

  it('scores an overdue task with consequence at 100', () => {
    expect(
      deadlineProximityScore('2026-07-28T14:00:00.000Z', 'user_confirmed', 50, nowMs),
    ).toBe(100);
  });

  it('scores due-within-24h at 95 and 2-days at 85', () => {
    expect(
      deadlineProximityScore('2026-07-30T10:00:00.000Z', 'user_confirmed', 25, nowMs),
    ).toBe(95);
    expect(
      deadlineProximityScore('2026-07-31T10:00:00.000Z', 'user_confirmed', 25, nowMs),
    ).toBe(85);
  });

  it('scores beyond 30 days at 10 and no deadline at 10', () => {
    expect(
      deadlineProximityScore('2026-10-30T10:00:00.000Z', 'user_confirmed', 25, nowMs),
    ).toBe(10);
    expect(deadlineProximityScore(null, 'user_confirmed', 25, nowMs)).toBe(10);
  });

  it('caps an unverified deadline at 40 even when it is imminent', () => {
    expect(
      deadlineProximityScore('2026-07-29T18:00:00.000Z', 'unverified', 90, nowMs),
    ).toBe(40);
  });
});

describe('energy compatibility matrix', () => {
  it('matches the published matrix exactly', () => {
    expect(energyCompatibilityScore('very_low', 'low')).toBe(100);
    expect(energyCompatibilityScore('very_low', 'high')).toBe(0);
    expect(energyCompatibilityScore('normal', 'medium')).toBe(90);
    expect(energyCompatibilityScore('very_high', 'high')).toBe(100);
    expect(energyCompatibilityScore('low', 'medium')).toBe(60);
  });
});

describe('calendar fit', () => {
  it('returns 100 for a clean full fit', () => {
    const fit = calendarFitScore(task({ estimatedMinutes: 45 }), context({ openWindows: [window(60)] }));
    expect(fit).toMatchObject({ score: 100, fits: true, minimumOnly: false });
  });

  it('returns 55 and minimumOnly when only the minimum version fits', () => {
    const fit = calendarFitScore(
      task({ estimatedMinutes: 60, minimumMinutes: 20 }),
      context({ openWindows: [window(25)] }),
    );
    expect(fit.score).toBe(55);
    expect(fit.minimumOnly).toBe(true);
  });

  it('does not fit when neither full nor minimum version has room', () => {
    const fit = calendarFitScore(
      task({ estimatedMinutes: 60, minimumMinutes: 30 }),
      context({ openWindows: [window(10)] }),
    );
    expect(fit.fits).toBe(false);
  });
});

describe('hard filters', () => {
  it('excludes a task whose duration does not fit any window', () => {
    const result = scoreTasks([task({ estimatedMinutes: 240 })], context({ openWindows: [window(30)] }));
    expect(result.ranked).toHaveLength(0);
    expect(result.excluded[0]?.hardFilters).toContain('does_not_fit_window');
  });

  it('excludes a task blocked by an unresolved dependency', () => {
    const result = scoreTasks([task({ isBlockedByDependency: true })], context());
    expect(result.excluded[0]?.hardFilters).toContain('dependency_unresolved');
  });

  it('excludes a task whose cost is over the hard budget', () => {
    const result = scoreTasks(
      [task({ costCents: 20_000 })],
      context({ hardBudgetCents: 5_000 }),
    );
    expect(result.excluded[0]?.hardFilters).toContain('over_hard_budget');
  });

  it('excludes completed and archived tasks', () => {
    const result = scoreTasks(
      [task({ id: '00000000-0000-4000-8000-00000000000a', status: 'completed' })],
      context(),
    );
    expect(result.excluded[0]?.hardFilters).toContain('status_not_actionable');
  });

  it('an infeasible task can never rank as do-now', () => {
    const urgent = task({
      id: '00000000-0000-4000-8000-00000000000b',
      title: 'Urgent but impossible',
      dueAt: '2026-07-29T15:00:00.000Z',
      consequenceLevel: 100,
      estimatedMinutes: 480,
    });
    const feasible = task({ id: '00000000-0000-4000-8000-00000000000c', estimatedMinutes: 20 });
    const result = scoreTasks([urgent, feasible], context({ openWindows: [window(30)] }));
    expect(result.ranked.map((entry) => entry.taskId)).toEqual([feasible.id]);
  });
});

describe('formula', () => {
  it('score equals sum(weight × factor / 100) × confidenceMultiplier − penalties + override', () => {
    const result = scoreTasks([task({ confidence: 0.5 })], context());
    const scored = result.ranked[0];
    expect(scored).toBeDefined();
    if (scored === undefined) return;

    const recomputedBase = (
      Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]
    ).reduce((sum, key) => sum + (WEIGHTS[key] * scored.components[key]) / 100, 0);

    expect(scored.baseScore).toBeCloseTo(recomputedBase, 2);
    expect(scored.confidenceMultiplier).toBeCloseTo(0.7 + 0.3 * 0.5, 3);

    const expected =
      recomputedBase * scored.confidenceMultiplier -
      scored.effortPenalty -
      scored.overloadPenalty +
      scored.overrideAdjustment;
    expect(scored.finalScore).toBeCloseTo(Math.max(0, Math.min(100, expected)), 1);
  });

  it('a user pin adds at most 20 points', () => {
    const withoutPin = scoreTasks([task()], context()).ranked[0];
    const withPin = scoreTasks([task({ manualPriority: 100 })], context()).ranked[0];
    expect(withPin?.overrideAdjustment).toBe(20);
    expect((withPin?.finalScore ?? 0) - (withoutPin?.finalScore ?? 0)).toBeCloseTo(20, 1);
  });

  it('an expired pin contributes nothing', () => {
    const scored = scoreTasks(
      [task({ manualPriority: 100, manualPriorityExpiresAt: '2026-07-28T00:00:00.000Z' })],
      context(),
    ).ranked[0];
    expect(scored?.overrideAdjustment).toBe(0);
  });
});

describe('determinism', () => {
  it('produces identical output for identical input', () => {
    const tasks = [
      task({ id: '00000000-0000-4000-8000-000000000011', title: 'A', consequenceLevel: 50 }),
      task({ id: '00000000-0000-4000-8000-000000000012', title: 'B', consequenceLevel: 50 }),
      task({ id: '00000000-0000-4000-8000-000000000013', title: 'C', consequenceLevel: 75 }),
    ];
    const first = scoreTasks(tasks, context());
    const second = scoreTasks(tasks, context());
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('breaks exact ties by stable UUID ordering', () => {
    const later = task({ id: '00000000-0000-4000-8000-0000000000ff', title: 'Later' });
    const earlier = task({ id: '00000000-0000-4000-8000-000000000001', title: 'Earlier' });
    const result = scoreTasks([later, earlier], context());
    expect(result.ranked.map((entry) => entry.taskId)).toEqual([earlier.id, later.id]);
  });
});

describe('dominant outcomes', () => {
  it('never returns more than three (DECISION_LOG D-015)', () => {
    const tasks = Array.from({ length: 10 }, (_, index) =>
      task({
        id: `00000000-0000-4000-8000-0000000001${index.toString().padStart(2, '0')}`,
        title: `Task ${index}`,
        estimatedMinutes: 10,
        consequenceLevel: 90,
      }),
    );
    const result = scoreTasks(tasks, context({ openWindows: [window(300)] }));
    expect(result.ranked.length).toBe(10);
    expect(result.dominantOutcomes.length).toBe(3);
  });

  it('keeps a low-confidence task out of the dominant slots unless pinned', () => {
    const lowConfidence = task({
      id: '00000000-0000-4000-8000-000000000021',
      confidence: 0.2,
      consequenceLevel: 100,
    });
    const result = scoreTasks([lowConfidence], context());
    expect(result.ranked[0]?.dominantEligible).toBe(false);
    expect(result.dominantOutcomes).toHaveLength(0);

    const pinned = scoreTasks(
      [task({ id: lowConfidence.id, confidence: 0.2, manualPriority: 80 })],
      context(),
    );
    expect(pinned.dominantOutcomes).toHaveLength(1);
  });
});

describe('overload', () => {
  it('penalizes a task that pushes the day past the hard load ceiling', () => {
    const light = scoreTasks(
      [task({ estimatedMinutes: 30 })],
      context({ committedMinutes: 0, capacityMinutes: 180 }),
    ).ranked[0];
    const overloaded = scoreTasks(
      [task({ estimatedMinutes: 30 })],
      context({
        committedMinutes: 200,
        capacityMinutes: 180,
        openWindows: [window(120)],
      }),
    ).ranked[0];
    expect(overloaded?.overloadPenalty).toBeGreaterThan(light?.overloadPenalty ?? 0);
    expect(overloaded?.overloadPenalty).toBeLessThanOrEqual(25);
  });
});

describe('explanations', () => {
  it('names the hard filter when a task is excluded', () => {
    const result = scoreTasks([task({ isBlockedByDependency: true })], context());
    expect(result.excluded[0]?.explanation).toContain('prerequisite');
  });

  it('reports the score and the strongest factors for a ranked task', () => {
    const result = scoreTasks(
      [task({ dueAt: '2026-07-29T20:00:00.000Z', consequenceLevel: 75 })],
      context(),
    );
    const explanation = result.ranked[0]?.explanation ?? '';
    expect(explanation).toMatch(/Scored \d+(\.\d+)? of 100/);
    expect(explanation).toContain('deadline proximity');
  });

  it('stamps the engine version on every result', () => {
    const result = scoreTasks([task()], context());
    expect(result.engineVersion).toBe(ENGINE_VERSION);
    expect(result.ranked[0]?.engineVersion).toBe(ENGINE_VERSION);
  });
});

describe('ignore candidates', () => {
  it('never proposes ignoring a high-consequence task', () => {
    const important = task({
      id: '00000000-0000-4000-8000-000000000031',
      consequenceLevel: 90,
      flexibility: 'high',
    });
    const tasks = [important];
    const result = scoreTasks(tasks, context());
    expect(ignoreCandidates(result, tasks).map((entry) => entry.taskId)).not.toContain(
      important.id,
    );
  });

  it('proposes deferring a low-value, highly flexible task', () => {
    const trivial = task({
      id: '00000000-0000-4000-8000-000000000032',
      consequenceLevel: 5,
      flexibility: 'high',
      confidence: 0.5,
    });
    const tasks = [trivial];
    const result = scoreTasks(tasks, context());
    const candidates = ignoreCandidates(result, tasks);
    expect(candidates[0]).toMatchObject({ taskId: trivial.id, action: 'not_today' });
  });
});
