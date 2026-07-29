/**
 * Priority engine types — PRIORITY_ENGINE.md.
 *
 * These types are deliberately free of database and UI concerns so the engine
 * can be exercised directly from unit tests with hand-built inputs.
 */

export type EnergyLevel = 'very_low' | 'low' | 'normal' | 'high' | 'very_high';
export type EnergyRequirement = 'low' | 'medium' | 'high' | 'any';
export type Flexibility = 'fixed' | 'low' | 'medium' | 'high';
export type VerificationStatus =
  | 'unverified'
  | 'user_confirmed'
  | 'provider_confirmed'
  | 'conflicting'
  | 'expired'
  | 'invalid';

export interface TimeWindow {
  /** ISO-8601 instant. */
  startsAt: string;
  endsAt: string;
  /** Minutes available after transition/travel buffers are removed. */
  usableMinutes: number;
}

export interface PriorityTaskInput {
  id: string;
  title: string;
  status:
    | 'inbox'
    | 'ready'
    | 'planned'
    | 'in_progress'
    | 'blocked'
    | 'missed'
    | 'completed'
    | 'canceled'
    | 'archived';
  dueAt: string | null;
  dueVerification: VerificationStatus;
  estimatedMinutes: number | null;
  minimumMinutes: number | null;
  energyRequirement: EnergyRequirement;
  flexibility: Flexibility;
  /** 0–100, user-selected consequence of delay. */
  consequenceLevel: number;
  /** 0–1 reliability of this task's own inputs. */
  confidence: number;
  costCents: number | null;
  locationLabel: string | null;
  /** Count of not-yet-complete tasks that depend on this one. */
  downstreamTaskCount: number;
  /** True when this task has an unresolved finish_to_start dependency. */
  isBlockedByDependency: boolean;
  /** True when the task belongs to a goal the user marked protected. */
  isProtectedGoal: boolean;
  hasLinkedGoal: boolean;
  isExplicitTopOutcome: boolean;
  /** Manual pin, 0–100, contributing up to +20 points. */
  manualPriority: number | null;
  manualPriorityExpiresAt: string | null;
  /** Health/safety weighting only from explicit user configuration. */
  healthSafetyImpact: number;
  /** Financial impact class from entered amounts. */
  financialImpact: number;
  /** Recent meaningful consistency, 0–100. */
  momentum: number;
  /** Set when the task has an open missed commitment. */
  recovery: {
    recoveryWindowHoursRemaining: number | null;
    weeklyTargetAtRisk: boolean;
    priorMissCount: number;
  } | null;
  lastProgressAt: string | null;
  userBlockedForPeriod: boolean;
}

export interface PriorityContext {
  /** ISO-8601 instant treated as "now". Injected so results are reproducible. */
  now: string;
  timezone: string;
  currentEnergy: EnergyLevel;
  /** Windows that remain open today, largest usable time first is not assumed. */
  openWindows: TimeWindow[];
  /** Minutes of capacity left in the day before contingency. */
  capacityRemainingMinutes: number;
  contingencyRemainingMinutes: number;
  /** Committed minutes over capacity, if any. */
  committedMinutes: number;
  capacityMinutes: number;
  hardDailyLoadPercent: number;
  /** Locations/resources currently reachable. Empty means "unconstrained". */
  availableLocations: string[];
  /** Hard budget ceiling in cents, or null for unconstrained. */
  hardBudgetCents: number | null;
  contextKey: string;
}

export type HardFilterReason =
  | 'status_not_actionable'
  | 'dependency_unresolved'
  | 'location_unavailable'
  | 'does_not_fit_window'
  | 'user_blocked'
  | 'over_hard_budget';

export interface ComponentScores {
  deadlineProximity: number;
  consequenceOfDelay: number;
  strategicValue: number;
  dependencyImpact: number;
  healthSafetyImpact: number;
  financialImpact: number;
  opportunityValue: number;
  momentumValue: number;
  recoveryUrgency: number;
  energyCompatibility: number;
  calendarFit: number;
  flexibilityPressure: number;
}

export interface ScoredTask {
  taskId: string;
  title: string;
  eligible: boolean;
  hardFilters: HardFilterReason[];
  components: ComponentScores;
  baseScore: number;
  confidence: number;
  confidenceMultiplier: number;
  effortPenalty: number;
  overloadPenalty: number;
  overrideAdjustment: number;
  finalScore: number;
  /** Rank among eligible tasks, 1-based. Null when excluded. */
  rank: number | null;
  /** True when this task may occupy one of the three dominant slots. */
  dominantEligible: boolean;
  explanation: string;
  engineVersion: string;
}

export interface PriorityResult {
  engineVersion: string;
  contextKey: string;
  generatedAt: string;
  ranked: ScoredTask[];
  excluded: ScoredTask[];
  /** At most three (DECISION_LOG D-015). */
  dominantOutcomes: ScoredTask[];
}
