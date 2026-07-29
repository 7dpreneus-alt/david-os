/** Row shapes returned by the task/project/inbox repositories. */

export interface TaskRecord {
  id: string;
  userId: string;
  projectId: string | null;
  goalId: string | null;
  lifeAreaId: string | null;
  title: string;
  description: string | null;
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
  dueTimezone: string | null;
  preferredDate: string | null;
  earliestStartAt: string | null;
  estimatedMinutes: number | null;
  minimumMinutes: number | null;
  energyRequirement: 'low' | 'medium' | 'high' | 'any';
  locationLabel: string | null;
  costCents: number | null;
  consequenceLevel: number;
  consequenceReason: string | null;
  flexibility: 'fixed' | 'low' | 'medium' | 'high';
  minimumViableDefinition: string | null;
  recoveryWindowHours: number | null;
  definitionOfDone: string | null;
  manualPriority: number | null;
  manualPriorityExpiresAt: string | null;
  source: 'user' | 'calendar' | 'starter' | 'provider' | 'derived' | 'system';
  confidence: number;
  verificationStatus: string;
  lastProgressAt: string | null;
  completedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  /** Derived, not stored. */
  isBlockedByDependency: boolean;
  downstreamTaskCount: number;
  projectTitle: string | null;
  lifeAreaName: string | null;
}

export interface ProjectRecord {
  id: string;
  userId: string;
  goalId: string | null;
  lifeAreaId: string | null;
  title: string;
  outcome: string;
  status: 'proposed' | 'active' | 'paused' | 'completed' | 'canceled' | 'archived';
  targetDate: string | null;
  budgetCents: number | null;
  nextActionTaskId: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  openTaskCount: number;
  isStalled: boolean;
}

export interface InboxItemRecord {
  id: string;
  userId: string;
  rawText: string;
  itemType: string;
  suggestedType: string | null;
  classificationConfidence: number | null;
  duplicateCandidates: Array<{ id: string; title: string; similarity: number }>;
  conversionEntityType: string | null;
  conversionEntityId: string | null;
  resolvedAt: string | null;
  source: string;
  createdAt: string;
}

export interface GoalRecord {
  id: string;
  userId: string;
  lifeAreaId: string | null;
  title: string;
  description: string | null;
  targetDate: string | null;
  isProtected: boolean;
  status: string;
  source: string;
  createdAt: string;
}

export interface LifeAreaRecord {
  id: string;
  userId: string;
  name: string;
  slug: string;
  isProtected: boolean;
  sortOrder: number;
  source: string;
}

/** A non-blocking note attached to a successful mutation. */
export interface Warning {
  code: string;
  message: string;
  field?: string;
}
