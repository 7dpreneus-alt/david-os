import type {
  ComponentScores,
  EnergyLevel,
  EnergyRequirement,
  HardFilterReason,
  PriorityContext,
  PriorityResult,
  PriorityTaskInput,
  ScoredTask,
  TimeWindow,
} from './types';

/**
 * Deterministic adaptive priority engine — PRIORITY_ENGINE.md.
 *
 * The engine is a pure function of (tasks, context). It performs no I/O, reads
 * no clock, and contains no randomness, so the same inputs always produce the
 * same ranking (ACCEPTANCE_CRITERIA.md "Priority and capacity"). Every score is
 * accompanied by its component breakdown and a prose explanation that is
 * derived from those same numbers.
 */

export const ENGINE_VERSION = 'priority-1.0.0';

/**
 * PRIORITY_ENGINE.md §4, reproduced verbatim.
 *
 * NOTE: the published table states "weights total 100" but the listed values
 * sum to 98. The values are kept exactly as specified because they define the
 * relative importance of each factor, which is what ranking depends on. The
 * practical consequence is that the maximum achievable base score is 98 rather
 * than 100 before overrides. Recorded as D-017 in DECISION_LOG.md.
 */
export const WEIGHTS: Readonly<Record<keyof ComponentScores, number>> = {
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
};

const NON_ACTIONABLE_STATUSES = new Set(['completed', 'canceled', 'archived']);

const MINUTES = 60_000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/** PRIORITY_ENGINE.md §5 — deadline proximity. Unverified dates cap at 40. */
export function deadlineProximityScore(
  dueAt: string | null,
  verification: PriorityTaskInput['dueVerification'],
  consequenceLevel: number,
  nowMs: number,
): number {
  if (dueAt === null) return 10;
  const dueMs = Date.parse(dueAt);
  if (Number.isNaN(dueMs)) return 10;

  const hoursRemaining = (dueMs - nowMs) / (60 * MINUTES);
  let score: number;
  if (hoursRemaining <= 0) {
    score = consequenceLevel > 5 ? 100 : 70;
  } else if (hoursRemaining <= 24) {
    score = 95;
  } else if (hoursRemaining <= 48) {
    score = 85;
  } else {
    const days = hoursRemaining / 24;
    if (days <= 7) {
      // 3 days → 75 down to 7 days → 55.
      score = 75 - ((days - 3) / 4) * 20;
    } else if (days <= 30) {
      // 8 days → 50 down to 30 days → 20.
      score = 50 - ((days - 8) / 22) * 30;
    } else {
      score = 10;
    }
  }

  const unverified =
    verification === 'unverified' ||
    verification === 'conflicting' ||
    verification === 'expired' ||
    verification === 'invalid';
  return clamp(unverified ? Math.min(score, 40) : score, 0, 100);
}

/** PRIORITY_ENGINE.md §5 — strategic value. */
export function strategicValueScore(task: PriorityTaskInput): number {
  if (task.isExplicitTopOutcome) return 100;
  if (task.isProtectedGoal) return 80;
  if (task.hasLinkedGoal) return 50;
  return 20;
}

/** PRIORITY_ENGINE.md §5 — dependency impact, capped at 100. */
export function dependencyImpactScore(downstreamTaskCount: number): number {
  if (downstreamTaskCount <= 0) return 0;
  // Diminishing returns so an inflated chain cannot dominate.
  return clamp(Math.round(100 * (1 - Math.exp(-downstreamTaskCount / 3))), 0, 100);
}

/** PRIORITY_ENGINE.md §5 — energy compatibility matrix. */
const ENERGY_MATRIX: Record<EnergyLevel, Record<'low' | 'medium' | 'high', number>> = {
  very_low: { low: 100, medium: 35, high: 0 },
  low: { low: 90, medium: 60, high: 15 },
  normal: { low: 75, medium: 90, high: 70 },
  high: { low: 65, medium: 90, high: 100 },
  very_high: { low: 55, medium: 80, high: 100 },
};

export function energyCompatibilityScore(
  current: EnergyLevel,
  requirement: EnergyRequirement,
): number {
  if (requirement === 'any') {
    const row = ENERGY_MATRIX[current];
    return Math.round((row.low + row.medium + row.high) / 3);
  }
  return ENERGY_MATRIX[current][requirement];
}

export interface WindowFit {
  score: number;
  fits: boolean;
  /** The window the task best fits into, when any. */
  window: TimeWindow | null;
  minimumOnly: boolean;
}

/** PRIORITY_ENGINE.md §5 — calendar fit. "Does not fit" is a hard exclusion. */
export function calendarFitScore(
  task: PriorityTaskInput,
  context: PriorityContext,
): WindowFit {
  const estimated = task.estimatedMinutes;
  const minimum = task.minimumMinutes;

  if (context.openWindows.length === 0) {
    return { score: 0, fits: false, window: null, minimumOnly: false };
  }
  // An unestimated task cannot be proven to fit; it stays eligible with a low
  // fit score rather than being silently excluded (DECISION_LOG D-014).
  if (estimated === null) {
    const largest = [...context.openWindows].sort(
      (a, b) => b.usableMinutes - a.usableMinutes,
    )[0];
    return { score: 30, fits: true, window: largest ?? null, minimumOnly: false };
  }

  const sorted = [...context.openWindows].sort((a, b) => a.usableMinutes - b.usableMinutes);

  // Best full fit: the smallest window that still holds the whole task.
  const fullFit = sorted.find((window) => window.usableMinutes >= estimated);
  if (fullFit !== undefined) {
    const consumesContingency =
      context.contingencyRemainingMinutes > 0 &&
      estimated > context.capacityRemainingMinutes;
    return {
      score: consumesContingency ? 25 : 100,
      fits: true,
      window: fullFit,
      minimumOnly: false,
    };
  }

  // Splitting: total open time covers it across more than one window.
  const totalOpen = sorted.reduce((sum, window) => sum + window.usableMinutes, 0);
  if (totalOpen >= estimated && sorted.length > 1 && task.flexibility !== 'fixed') {
    return { score: 75, fits: true, window: sorted[sorted.length - 1] ?? null, minimumOnly: false };
  }

  // Minimum-viable version only.
  if (minimum !== null) {
    const minimumFit = sorted.find((window) => window.usableMinutes >= minimum);
    if (minimumFit !== undefined) {
      return { score: 55, fits: true, window: minimumFit, minimumOnly: true };
    }
  }

  return { score: 0, fits: false, window: null, minimumOnly: false };
}

/** PRIORITY_ENGINE.md §5 — flexibility pressure. */
export function flexibilityPressureScore(
  flexibility: PriorityTaskInput['flexibility'],
  openWindowCount: number,
): number {
  const base = { fixed: 100, low: 80, medium: 45, high: 20 }[flexibility];
  // Pressure rises as viable windows disappear.
  const scarcity = openWindowCount <= 1 ? 1.2 : openWindowCount <= 3 ? 1.05 : 1;
  return clamp(Math.round(base * scarcity), 0, 100);
}

/** PRIORITY_ENGINE.md §5 — recovery urgency. */
export function recoveryUrgencyScore(recovery: PriorityTaskInput['recovery']): number {
  if (recovery === null) return 0;
  let score = 40;
  const remaining = recovery.recoveryWindowHoursRemaining;
  if (remaining !== null) {
    if (remaining <= 0) score = 95;
    else if (remaining <= 6) score = 85;
    else if (remaining <= 24) score = 70;
    else if (remaining <= 72) score = 55;
  }
  if (recovery.weeklyTargetAtRisk) score += 10;
  score += clamp(recovery.priorMissCount * 5, 0, 15);
  return clamp(score, 0, 100);
}

/** PRIORITY_ENGINE.md §6 — effort penalty, 0–8 points. */
export function effortPenalty(task: PriorityTaskInput, fit: WindowFit): number {
  const estimated = task.estimatedMinutes;
  if (estimated === null) return 2;
  if (fit.window === null) return 4;
  const ratio = estimated / Math.max(fit.window.usableMinutes, 1);
  // Consuming a whole window is a real cost, but not a moral failing.
  const durationPenalty = clamp(ratio * 5, 0, 6);
  const splitPenalty = fit.score === 75 ? 2 : 0;
  return round(clamp(durationPenalty + splitPenalty, 0, 8));
}

/** PRIORITY_ENGINE.md §6 — overload penalty, 0–25 points. */
export function overloadPenalty(
  task: PriorityTaskInput,
  context: PriorityContext,
): number {
  const estimated = task.estimatedMinutes ?? 0;
  if (estimated === 0) return 0;

  let penalty = 0;
  const projected = context.committedMinutes + estimated;
  const hardCeiling = (context.capacityMinutes * context.hardDailyLoadPercent) / 100;

  if (context.capacityMinutes > 0) {
    if (projected > hardCeiling) {
      penalty += 18;
    } else if (projected > context.capacityMinutes) {
      const overshoot = (projected - context.capacityMinutes) /
        Math.max(hardCeiling - context.capacityMinutes, 1);
      penalty += clamp(overshoot * 12, 0, 12);
    }
  }

  const contingencyAfter = context.contingencyRemainingMinutes - Math.max(
    estimated - context.capacityRemainingMinutes,
    0,
  );
  if (contingencyAfter < 0) {
    penalty += 7;
  }

  return round(clamp(penalty, 0, 25));
}

/** PRIORITY_ENGINE.md §3 — hard filters. */
export function hardFilters(
  task: PriorityTaskInput,
  context: PriorityContext,
  fit: WindowFit,
): HardFilterReason[] {
  const reasons: HardFilterReason[] = [];
  if (NON_ACTIONABLE_STATUSES.has(task.status)) reasons.push('status_not_actionable');
  if (task.isBlockedByDependency) reasons.push('dependency_unresolved');
  if (task.userBlockedForPeriod) reasons.push('user_blocked');
  if (
    task.locationLabel !== null &&
    context.availableLocations.length > 0 &&
    !context.availableLocations.includes(task.locationLabel)
  ) {
    reasons.push('location_unavailable');
  }
  if (!fit.fits) reasons.push('does_not_fit_window');
  if (
    context.hardBudgetCents !== null &&
    task.costCents !== null &&
    task.costCents > context.hardBudgetCents
  ) {
    reasons.push('over_hard_budget');
  }
  return reasons;
}

/** PRIORITY_ENGINE.md §7 — user pin, up to +20 points. */
function overrideAdjustment(task: PriorityTaskInput, nowMs: number): number {
  if (task.manualPriority === null) return 0;
  const expiry = task.manualPriorityExpiresAt;
  if (expiry !== null) {
    const expiryMs = Date.parse(expiry);
    if (!Number.isNaN(expiryMs) && expiryMs <= nowMs) return 0;
  }
  return round((task.manualPriority / 100) * 20);
}

const HARD_FILTER_TEXT: Record<HardFilterReason, string> = {
  status_not_actionable: 'its status is not actionable',
  dependency_unresolved: 'a prerequisite task is still open',
  location_unavailable: 'the required location is not reachable right now',
  does_not_fit_window: 'it does not fit any remaining open window',
  user_blocked: 'you blocked it for this period',
  over_hard_budget: 'its cost exceeds the hard budget you set',
};

const COMPONENT_LABELS: Record<keyof ComponentScores, string> = {
  deadlineProximity: 'deadline proximity',
  consequenceOfDelay: 'consequence of delay',
  strategicValue: 'strategic value',
  dependencyImpact: 'work it unblocks',
  healthSafetyImpact: 'health or safety impact',
  financialImpact: 'financial impact',
  opportunityValue: 'opportunity value',
  momentumValue: 'momentum',
  recoveryUrgency: 'recovery urgency',
  energyCompatibility: 'energy match',
  calendarFit: 'calendar fit',
  flexibilityPressure: 'low flexibility',
};

function buildExplanation(
  task: PriorityTaskInput,
  components: ComponentScores,
  scored: Omit<ScoredTask, 'explanation' | 'rank' | 'dominantEligible'>,
  fit: WindowFit,
): string {
  if (!scored.eligible) {
    const reasons = scored.hardFilters.map((reason) => HARD_FILTER_TEXT[reason]);
    return `Not available now because ${reasons.join(', and ')}.`;
  }

  const contributions = (Object.keys(components) as (keyof ComponentScores)[])
    .map((key) => ({ key, points: (WEIGHTS[key] * components[key]) / 100 }))
    .filter((entry) => entry.points > 0.5)
    .sort((a, b) => b.points - a.points)
    .slice(0, 3);

  const positives =
    contributions.length === 0
      ? 'no factor scored strongly'
      : contributions
          .map((entry) => `${COMPONENT_LABELS[entry.key]} (+${round(entry.points, 1)})`)
          .join(', ');

  const penalties: string[] = [];
  if (scored.effortPenalty > 0) penalties.push(`effort −${round(scored.effortPenalty, 1)}`);
  if (scored.overloadPenalty > 0) {
    penalties.push(`overload risk −${round(scored.overloadPenalty, 1)}`);
  }
  const penaltyText = penalties.length > 0 ? ` Penalties: ${penalties.join(', ')}.` : '';

  const overrideText =
    scored.overrideAdjustment > 0
      ? ` You pinned this task, which added ${round(scored.overrideAdjustment, 1)} points.`
      : '';

  const confidenceText =
    task.confidence < 0.4
      ? ' Confidence is low, so it cannot take a top-three slot automatically.'
      : task.confidence < 0.8
        ? ' Confidence is medium because some inputs are missing.'
        : '';

  const fitText = fit.minimumOnly
    ? ' Only the minimum viable version fits the time you have left.'
    : fit.window !== null
      ? ` It fits a ${fit.window.usableMinutes}-minute open window.`
      : '';

  return (
    `Scored ${round(scored.finalScore, 1)} of 100. Strongest factors: ${positives}.` +
    `${penaltyText}${overrideText}${fitText}${confidenceText}`
  );
}

function scoreOne(
  task: PriorityTaskInput,
  context: PriorityContext,
  nowMs: number,
): { scored: ScoredTask; fit: WindowFit } {
  const fit = calendarFitScore(task, context);
  const filters = hardFilters(task, context, fit);
  const eligible = filters.length === 0;

  const components: ComponentScores = {
    deadlineProximity: deadlineProximityScore(
      task.dueAt,
      task.dueVerification,
      task.consequenceLevel,
      nowMs,
    ),
    consequenceOfDelay: clamp(task.consequenceLevel, 0, 100),
    strategicValue: strategicValueScore(task),
    dependencyImpact: dependencyImpactScore(task.downstreamTaskCount),
    healthSafetyImpact: clamp(task.healthSafetyImpact, 0, 100),
    financialImpact: clamp(task.financialImpact, 0, 100),
    // Opportunity value is capped in Phase 1: no verified opportunity feed
    // exists, so unverified content can never outrank a core obligation.
    opportunityValue: 0,
    momentumValue: clamp(task.momentum, 0, 100),
    recoveryUrgency: recoveryUrgencyScore(task.recovery),
    energyCompatibility: energyCompatibilityScore(
      context.currentEnergy,
      task.energyRequirement,
    ),
    calendarFit: fit.score,
    flexibilityPressure: flexibilityPressureScore(
      task.flexibility,
      context.openWindows.length,
    ),
  };

  const baseScore = (Object.keys(components) as (keyof ComponentScores)[]).reduce(
    (sum, key) => sum + (WEIGHTS[key] * components[key]) / 100,
    0,
  );

  const confidence = clamp(task.confidence, 0, 1);
  const confidenceMultiplier = 0.7 + 0.3 * confidence;
  const scoreBeforeOverrides = baseScore * confidenceMultiplier;

  const effort = eligible ? effortPenalty(task, fit) : 0;
  const overload = eligible ? overloadPenalty(task, context) : 0;
  const override = eligible ? overrideAdjustment(task, nowMs) : 0;

  const finalScore = eligible
    ? clamp(scoreBeforeOverrides - effort - overload + override, 0, 100)
    : 0;

  const partial = {
    taskId: task.id,
    title: task.title,
    eligible,
    hardFilters: filters,
    components,
    baseScore: round(baseScore),
    confidence,
    confidenceMultiplier: round(confidenceMultiplier, 3),
    effortPenalty: effort,
    overloadPenalty: overload,
    overrideAdjustment: override,
    finalScore: round(finalScore),
    engineVersion: ENGINE_VERSION,
  };

  return {
    scored: {
      ...partial,
      rank: null,
      // PRIORITY_ENGINE.md §7: confidence below 0.4 cannot become an automatic
      // top-three outcome unless the user pinned it.
      dominantEligible: eligible && (confidence >= 0.4 || override > 0),
      explanation: buildExplanation(task, components, partial, fit),
    },
    fit,
  };
}

/** PRIORITY_ENGINE.md §8 — deterministic tie-breaking within 2 points. */
function compareScored(
  a: { scored: ScoredTask; input: PriorityTaskInput; fit: WindowFit },
  b: { scored: ScoredTask; input: PriorityTaskInput; fit: WindowFit },
): number {
  const scoreDelta = b.scored.finalScore - a.scored.finalScore;
  if (Math.abs(scoreDelta) > 2) return scoreDelta;

  // 1. Harder verified deadline. A finite sentinel is used for "no deadline"
  // so that comparing two undated tasks yields 0 rather than NaN.
  const NO_DEADLINE = Number.MAX_SAFE_INTEGER;
  const deadline = (entry: typeof a): number => {
    if (entry.input.dueAt === null) return NO_DEADLINE;
    if (entry.input.dueVerification === 'unverified') return NO_DEADLINE;
    const parsed = Date.parse(entry.input.dueAt);
    return Number.isNaN(parsed) ? NO_DEADLINE : parsed;
  };
  const deadlineDelta = deadline(a) - deadline(b);
  if (deadlineDelta !== 0) return deadlineDelta;

  // 2. Greater consequence of delay.
  const consequenceDelta = b.input.consequenceLevel - a.input.consequenceLevel;
  if (consequenceDelta !== 0) return consequenceDelta;

  // 3. Unblocks more protected work.
  const downstreamDelta = b.input.downstreamTaskCount - a.input.downstreamTaskCount;
  if (downstreamDelta !== 0) return downstreamDelta;

  // 4. Better fit in the current window.
  const fitDelta = b.scored.components.calendarFit - a.scored.components.calendarFit;
  if (fitDelta !== 0) return fitDelta;

  // 5. Lower context-switch cost: prefer a task with no location requirement.
  const locationCost = (entry: typeof a): number => (entry.input.locationLabel === null ? 0 : 1);
  const locationDelta = locationCost(a) - locationCost(b);
  if (locationDelta !== 0) return locationDelta;

  // 6. Older last meaningful progress.
  const progress = (entry: typeof a): number => {
    if (entry.input.lastProgressAt === null) return 0;
    const parsed = Date.parse(entry.input.lastProgressAt);
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  const progressDelta = progress(a) - progress(b);
  if (progressDelta !== 0) return progressDelta;

  // 7. Stable UUID ordering.
  return a.input.id.localeCompare(b.input.id);
}

export function scoreTasks(
  tasks: readonly PriorityTaskInput[],
  context: PriorityContext,
): PriorityResult {
  const nowMs = Date.parse(context.now);
  if (Number.isNaN(nowMs)) {
    throw new Error(`PriorityContext.now is not a valid instant: ${context.now}`);
  }

  const evaluated = tasks.map((input) => {
    const { scored, fit } = scoreOne(input, context, nowMs);
    return { input, scored, fit };
  });

  const eligible = evaluated.filter((entry) => entry.scored.eligible).sort(compareScored);
  const excluded = evaluated.filter((entry) => !entry.scored.eligible);

  const ranked = eligible.map((entry, index) => ({ ...entry.scored, rank: index + 1 }));

  // DECISION_LOG D-015: at most three dominant outcomes, ever.
  const dominantOutcomes = ranked.filter((task) => task.dominantEligible).slice(0, 3);

  return {
    engineVersion: ENGINE_VERSION,
    contextKey: context.contextKey,
    generatedAt: context.now,
    ranked,
    excluded: excluded.map((entry) => entry.scored),
    dominantOutcomes,
  };
}

/**
 * PRIORITY_ENGINE.md §11 — "What should I ignore?".
 *
 * Returns low-value, high-flexibility, or blocked work with a concrete action.
 * Essential tasks are never silently dropped: anything with high consequence or
 * a verified near deadline is excluded from this list.
 */
export type IgnoreAction = 'not_today' | 'defer' | 'archive' | 'merge' | 'delegate' | 'clarify';

export interface IgnoreCandidate {
  taskId: string;
  title: string;
  action: IgnoreAction;
  reason: string;
}

export function ignoreCandidates(
  result: PriorityResult,
  tasks: readonly PriorityTaskInput[],
  limit = 5,
): IgnoreCandidate[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const candidates: IgnoreCandidate[] = [];

  for (const scored of result.excluded) {
    const task = byId.get(scored.taskId);
    if (task === undefined) continue;
    if (scored.hardFilters.includes('dependency_unresolved')) {
      candidates.push({
        taskId: task.id,
        title: task.title,
        action: 'clarify',
        reason: 'A prerequisite is still open, so starting this now would stall.',
      });
    } else if (scored.hardFilters.includes('over_hard_budget')) {
      candidates.push({
        taskId: task.id,
        title: task.title,
        action: 'defer',
        reason: 'Its cost is above the hard budget you set.',
      });
    }
  }

  for (const scored of result.ranked) {
    const task = byId.get(scored.taskId);
    if (task === undefined) continue;
    // Never propose ignoring genuinely consequential or near-deadline work.
    if (task.consequenceLevel >= 60) continue;
    if (scored.components.deadlineProximity >= 75) continue;
    if (scored.finalScore >= 35) continue;

    if (task.flexibility === 'high') {
      candidates.push({
        taskId: task.id,
        title: task.title,
        action: 'not_today',
        reason: `Scored ${round(scored.finalScore, 1)} and is highly flexible, so it can move without harm.`,
      });
    } else if (task.estimatedMinutes === null) {
      candidates.push({
        taskId: task.id,
        title: task.title,
        action: 'clarify',
        reason: 'It has no duration estimate, so it cannot be scheduled honestly.',
      });
    }
  }

  return candidates.slice(0, limit);
}
