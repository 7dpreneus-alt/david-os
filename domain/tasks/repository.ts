import { randomUUID } from 'node:crypto';
import type { DbSession } from '@/lib/db/session';
import { withService, withUser } from '@/lib/db/session';
import { ApiError, notFound } from '@/lib/http/errors';
import type {
  CreateTaskInput,
  TaskListQuery,
  UpdateTaskInput,
} from './schemas';
import type { InboxItemRecord, ProjectRecord, TaskRecord, Warning } from './types';

/**
 * Task, project, and inbox persistence.
 *
 * Every read and write runs through `withUser`, so PostgreSQL RLS is the
 * authoritative boundary. Ownership is still checked in SQL (`user_id = $n`)
 * because SECURITY_AND_PRIVACY.md §4 requires defence in depth.
 */

const TASK_COLUMNS = `
  t.id, t.user_id, t.project_id, t.goal_id, t.life_area_id, t.title, t.description,
  t.status, t.due_at, t.due_timezone, t.preferred_date, t.earliest_start_at,
  t.estimated_minutes, t.minimum_minutes, t.energy_requirement, t.location_label,
  t.cost_cents, t.consequence_level, t.consequence_reason, t.flexibility,
  t.minimum_viable_definition, t.recovery_window_hours, t.definition_of_done,
  t.manual_priority, t.manual_priority_expires_at, t.source, t.confidence,
  t.verification_status, t.last_progress_at, t.completed_at, t.version,
  t.created_at, t.updated_at
`;

interface TaskRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  project_id: string | null;
  goal_id: string | null;
  life_area_id: string | null;
  title: string;
  description: string | null;
  status: TaskRecord['status'];
  due_at: Date | null;
  due_timezone: string | null;
  preferred_date: Date | string | null;
  earliest_start_at: Date | null;
  estimated_minutes: number | null;
  minimum_minutes: number | null;
  energy_requirement: TaskRecord['energyRequirement'];
  location_label: string | null;
  cost_cents: string | number | null;
  consequence_level: number;
  consequence_reason: string | null;
  flexibility: TaskRecord['flexibility'];
  minimum_viable_definition: string | null;
  recovery_window_hours: number | null;
  definition_of_done: string | null;
  manual_priority: number | null;
  manual_priority_expires_at: Date | null;
  source: TaskRecord['source'];
  confidence: string | number;
  verification_status: string;
  last_progress_at: Date | null;
  completed_at: Date | null;
  version: number;
  created_at: Date;
  updated_at: Date;
  is_blocked: boolean | null;
  downstream_count: string | number | null;
  project_title: string | null;
  life_area_name: string | null;
}

function iso(value: Date | null | undefined): string | null {
  return value == null ? null : new Date(value).toISOString();
}

function dateOnly(value: Date | string | null): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function num(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  return typeof value === 'number' ? value : Number(value);
}

function mapTask(row: TaskRow): TaskRecord {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    goalId: row.goal_id,
    lifeAreaId: row.life_area_id,
    title: row.title,
    description: row.description,
    status: row.status,
    dueAt: iso(row.due_at),
    dueTimezone: row.due_timezone,
    preferredDate: dateOnly(row.preferred_date),
    earliestStartAt: iso(row.earliest_start_at),
    estimatedMinutes: row.estimated_minutes,
    minimumMinutes: row.minimum_minutes,
    energyRequirement: row.energy_requirement,
    locationLabel: row.location_label,
    costCents: num(row.cost_cents),
    consequenceLevel: row.consequence_level,
    consequenceReason: row.consequence_reason,
    flexibility: row.flexibility,
    minimumViableDefinition: row.minimum_viable_definition,
    recoveryWindowHours: row.recovery_window_hours,
    definitionOfDone: row.definition_of_done,
    manualPriority: row.manual_priority,
    manualPriorityExpiresAt: iso(row.manual_priority_expires_at),
    source: row.source,
    confidence: Number(row.confidence),
    verificationStatus: row.verification_status,
    lastProgressAt: iso(row.last_progress_at),
    completedAt: iso(row.completed_at),
    version: row.version,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    isBlockedByDependency: row.is_blocked === true,
    downstreamTaskCount: Number(row.downstream_count ?? 0),
    projectTitle: row.project_title,
    lifeAreaName: row.life_area_name,
  };
}

/** Append-only audit record. Written with the service role; never user-writable. */
export async function recordAudit(params: {
  userId: string;
  eventType: string;
  entityType: string;
  entityId: string | null;
  correlationId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await withService(async (db) => {
    await db.query(
      `insert into public.audit_events
         (user_id, actor_type, event_type, entity_type, entity_id, correlation_id, metadata)
       values ($1, 'user', $2, $3, $4, $5, $6)`,
      [
        params.userId,
        params.eventType,
        params.entityType,
        params.entityId,
        params.correlationId,
        JSON.stringify(params.metadata ?? {}),
      ],
    );
  });
}

/**
 * Record a reversible mutation. `inverseOperation` describes how to undo it;
 * `POST /mutations/undo-last` replays it.
 */
async function recordMutation(
  db: DbSession,
  params: {
    userId: string;
    operationType: string;
    entityType: string;
    entityId: string;
    beforeState: unknown;
    afterState: unknown;
    inverseOperation: unknown;
    idempotencyKey: string;
    reversibleForMinutes?: number;
  },
): Promise<void> {
  void db;
  await withService(async (service) => {
    await service.query(
      `insert into public.mutation_history
         (user_id, operation_type, entity_type, entity_id, before_state, after_state,
          inverse_operation, reversible_until, idempotency_key)
       values ($1,$2,$3,$4,$5,$6,$7, now() + make_interval(mins => $8), $9)
       on conflict (user_id, idempotency_key) do nothing`,
      [
        params.userId,
        params.operationType,
        params.entityType,
        params.entityId,
        params.beforeState === null ? null : JSON.stringify(params.beforeState),
        params.afterState === null ? null : JSON.stringify(params.afterState),
        JSON.stringify(params.inverseOperation),
        params.reversibleForMinutes ?? 60,
        params.idempotencyKey,
      ],
    );
  });
}

/** The subset of task fields that determine confidence and warnings. */
export interface TaskCompletenessInput {
  estimatedMinutes?: number | null | undefined;
  dueAt?: string | null | undefined;
  definitionOfDone?: string | null | undefined;
}

/** Warnings that lower confidence without blocking creation (D-014). */
export function clarificationWarnings(input: TaskCompletenessInput): Warning[] {
  const warnings: Warning[] = [];
  if (input.estimatedMinutes == null) {
    warnings.push({
      code: 'MISSING_DURATION',
      field: 'estimatedMinutes',
      message: 'Without a duration this task cannot be scheduled into an open window.',
    });
  }
  if (input.dueAt == null) {
    warnings.push({
      code: 'MISSING_DEADLINE',
      field: 'dueAt',
      message: 'No deadline, so deadline pressure will not raise its priority.',
    });
  }
  if (input.definitionOfDone == null) {
    warnings.push({
      code: 'MISSING_DEFINITION_OF_DONE',
      field: 'definitionOfDone',
      message: 'No definition of done, so completion will be a judgement call.',
    });
  }
  return warnings;
}

/** Confidence derived from how completely the task is specified. */
export function confidenceFor(input: TaskCompletenessInput): number {
  let confidence = 1;
  if (input.estimatedMinutes == null) confidence -= 0.25;
  if (input.dueAt == null) confidence -= 0.15;
  if (input.definitionOfDone == null) confidence -= 0.1;
  return Math.max(0.3, Math.round(confidence * 1000) / 1000);
}

export interface CreateTaskResult {
  task: TaskRecord;
  warnings: Warning[];
}

export async function createTask(
  userId: string,
  input: CreateTaskInput,
  options: { correlationId: string; idempotencyKey: string; source?: TaskRecord['source'] },
): Promise<CreateTaskResult> {
  const warnings = clarificationWarnings(input);
  const confidence = confidenceFor(input);

  const task = await withUser(userId, async (db) => {
    if (input.projectId != null) {
      const project = await db.query('select id from public.projects where id = $1', [
        input.projectId,
      ]);
      if (project.rowCount === 0) {
        throw new ApiError('VALIDATION_ERROR', 'That project could not be found.', {
          fieldErrors: { projectId: ['Project not found.'] },
        });
      }
    }

    const inserted = await db.query<TaskRow>(
      `insert into public.tasks (
         user_id, project_id, goal_id, life_area_id, title, description, status,
         due_at, due_timezone, preferred_date, earliest_start_at, estimated_minutes,
         minimum_minutes, energy_requirement, location_label, cost_cents,
         consequence_level, consequence_reason, flexibility, minimum_viable_definition,
         recovery_window_hours, definition_of_done, source, confidence
       ) values (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
       )
       returning ${TASK_COLUMNS.replaceAll('t.', '')}`,
      [
        userId,
        input.projectId ?? null,
        input.goalId ?? null,
        input.lifeAreaId ?? null,
        input.title,
        input.description ?? null,
        input.status,
        input.dueAt ?? null,
        input.dueTimezone ?? null,
        input.preferredDate ?? null,
        input.earliestStartAt ?? null,
        input.estimatedMinutes ?? null,
        input.minimumMinutes ?? null,
        input.energyRequirement,
        input.locationLabel ?? null,
        input.costCents ?? null,
        input.consequenceLevel,
        input.consequenceReason ?? null,
        input.flexibility,
        input.minimumViableDefinition ?? null,
        input.recoveryWindowHours ?? null,
        input.definitionOfDone ?? null,
        options.source ?? 'user',
        confidence,
      ],
    );

    const row = inserted.rows[0];
    if (row === undefined) {
      throw new ApiError('INTERNAL_ERROR', 'The task could not be created.');
    }

    for (const dependsOnId of input.dependsOnTaskIds) {
      if (dependsOnId === row.id) continue;
      if (await wouldCreateCycle(db, row.id, dependsOnId)) {
        throw new ApiError('VALIDATION_ERROR', 'That dependency would create a cycle.', {
          fieldErrors: { dependsOnTaskIds: ['This dependency would create a cycle.'] },
        });
      }
      await db.query(
        `insert into public.task_dependencies (user_id, task_id, depends_on_task_id)
         values ($1,$2,$3) on conflict do nothing`,
        [userId, row.id, dependsOnId],
      );
    }

    await recordMutation(db, {
      userId,
      operationType: 'create',
      entityType: 'task',
      entityId: row.id,
      beforeState: null,
      afterState: { id: row.id, title: row.title },
      inverseOperation: { type: 'soft_delete_task', taskId: row.id },
      idempotencyKey: options.idempotencyKey,
    });

    return mapTask(row);
  });

  await recordAudit({
    userId,
    eventType: 'task.created',
    entityType: 'task',
    entityId: task.id,
    correlationId: options.correlationId,
  });

  return { task, warnings };
}

/** Depth-limited cycle check across finish_to_start dependencies. */
async function wouldCreateCycle(
  db: DbSession,
  taskId: string,
  dependsOnId: string,
): Promise<boolean> {
  const result = await db.query<{ reachable: boolean }>(
    `with recursive chain(id) as (
       select depends_on_task_id from public.task_dependencies where task_id = $1
       union
       select d.depends_on_task_id
       from public.task_dependencies d
       join chain c on d.task_id = c.id
     )
     select exists(select 1 from chain where id = $2) as reachable`,
    [dependsOnId, taskId],
  );
  return result.rows[0]?.reachable === true;
}

export async function getTask(userId: string, taskId: string): Promise<TaskRecord | null> {
  return withUser(userId, async (db) => {
    const result = await db.query<TaskRow>(
      `select ${TASK_COLUMNS},
              public.task_is_blocked(t.id) as is_blocked,
              (select count(*) from public.task_dependencies d
                 join public.tasks dt on dt.id = d.task_id
                where d.depends_on_task_id = t.id
                  and dt.deleted_at is null
                  and dt.status not in ('completed','canceled','archived')) as downstream_count,
              p.title as project_title,
              la.name as life_area_name
         from public.tasks t
         left join public.projects p on p.id = t.project_id
         left join public.life_areas la on la.id = t.life_area_id
        where t.id = $1 and t.deleted_at is null`,
      [taskId],
    );
    const row = result.rows[0];
    return row === undefined ? null : mapTask(row);
  });
}

export interface TaskListResult {
  tasks: TaskRecord[];
  total: number;
}

const SORT_COLUMNS: Record<TaskListQuery['sort'], string> = {
  due_at: 't.due_at',
  created_at: 't.created_at',
  updated_at: 't.updated_at',
  title: 't.title',
  consequence: 't.consequence_level',
};

export async function listTasks(
  userId: string,
  query: TaskListQuery,
): Promise<TaskListResult> {
  return withUser(userId, async (db) => {
    const conditions: string[] = ['t.deleted_at is null'];
    const values: unknown[] = [];

    if (query.status !== undefined && query.status.length > 0) {
      values.push(query.status);
      conditions.push(`t.status = any($${values.length}::public.task_status[])`);
    } else if (!query.includeArchived) {
      conditions.push(`t.status <> 'archived'`);
    }
    if (query.projectId !== undefined) {
      values.push(query.projectId);
      conditions.push(`t.project_id = $${values.length}`);
    }
    if (query.lifeAreaId !== undefined) {
      values.push(query.lifeAreaId);
      conditions.push(`t.life_area_id = $${values.length}`);
    }
    if (query.search !== undefined && query.search.length > 0) {
      values.push(`%${query.search}%`);
      conditions.push(
        `(t.title ilike $${values.length} or coalesce(t.description,'') ilike $${values.length})`,
      );
    }

    const where = conditions.join(' and ');
    // Sort column and direction come from a closed enum, never from raw input.
    const orderBy = `${SORT_COLUMNS[query.sort]} ${query.direction === 'asc' ? 'asc' : 'desc'} nulls last, t.id asc`;

    const countResult = await db.query<{ count: string }>(
      `select count(*)::text as count from public.tasks t where ${where}`,
      values,
    );

    values.push(query.limit, query.offset);
    const result = await db.query<TaskRow>(
      `select ${TASK_COLUMNS},
              public.task_is_blocked(t.id) as is_blocked,
              (select count(*) from public.task_dependencies d
                 join public.tasks dt on dt.id = d.task_id
                where d.depends_on_task_id = t.id
                  and dt.deleted_at is null
                  and dt.status not in ('completed','canceled','archived')) as downstream_count,
              p.title as project_title,
              la.name as life_area_name
         from public.tasks t
         left join public.projects p on p.id = t.project_id
         left join public.life_areas la on la.id = t.life_area_id
        where ${where}
        order by ${orderBy}
        limit $${values.length - 1} offset $${values.length}`,
      values,
    );

    return {
      tasks: result.rows.map(mapTask),
      total: Number(countResult.rows[0]?.count ?? 0),
    };
  });
}

const UPDATABLE_COLUMNS: Record<string, string> = {
  title: 'title',
  description: 'description',
  projectId: 'project_id',
  goalId: 'goal_id',
  lifeAreaId: 'life_area_id',
  dueAt: 'due_at',
  dueTimezone: 'due_timezone',
  preferredDate: 'preferred_date',
  earliestStartAt: 'earliest_start_at',
  estimatedMinutes: 'estimated_minutes',
  minimumMinutes: 'minimum_minutes',
  energyRequirement: 'energy_requirement',
  locationLabel: 'location_label',
  costCents: 'cost_cents',
  consequenceLevel: 'consequence_level',
  consequenceReason: 'consequence_reason',
  flexibility: 'flexibility',
  minimumViableDefinition: 'minimum_viable_definition',
  recoveryWindowHours: 'recovery_window_hours',
  definitionOfDone: 'definition_of_done',
  status: 'status',
  manualPriority: 'manual_priority',
  manualPriorityExpiresAt: 'manual_priority_expires_at',
};

export async function updateTask(
  userId: string,
  taskId: string,
  input: UpdateTaskInput,
  options: { correlationId: string; idempotencyKey: string },
): Promise<TaskRecord> {
  const updated = await withUser(userId, async (db) => {
    const current = await db.query<TaskRow>(
      `select ${TASK_COLUMNS.replaceAll('t.', '')} from public.tasks t where t.id = $1 and t.deleted_at is null`,
      [taskId],
    );
    const before = current.rows[0];
    if (before === undefined) throw notFound('That task could not be found.');
    if (before.version !== input.version) {
      throw new ApiError(
        'VERSION_CONFLICT',
        'This task changed since you opened it. Reload to see the current version.',
        { logContext: { taskId, expected: input.version, actual: before.version } },
      );
    }

    const assignments: string[] = [];
    const values: unknown[] = [];
    for (const [field, column] of Object.entries(UPDATABLE_COLUMNS)) {
      const value = (input as Record<string, unknown>)[field];
      if (value === undefined) continue;
      values.push(value);
      assignments.push(`${column} = $${values.length}`);
    }

    if (input.status === 'completed') {
      assignments.push('completed_at = now()');
    } else if (input.status !== undefined) {
      assignments.push('completed_at = null');
    }

    if (assignments.length === 0) return mapTask(before);

    values.push(taskId);
    const result = await db.query<TaskRow>(
      `update public.tasks set ${assignments.join(', ')}
        where id = $${values.length} and deleted_at is null
        returning ${TASK_COLUMNS.replaceAll('t.', '')}`,
      values,
    );
    const row = result.rows[0];
    if (row === undefined) throw notFound('That task could not be found.');

    await recordMutation(db, {
      userId,
      operationType: 'update',
      entityType: 'task',
      entityId: taskId,
      beforeState: { version: before.version, status: before.status },
      afterState: { version: row.version, status: row.status },
      inverseOperation: {
        type: 'restore_task_fields',
        taskId,
        fields: Object.fromEntries(
          Object.keys(UPDATABLE_COLUMNS)
            .filter((field) => (input as Record<string, unknown>)[field] !== undefined)
            .map((field) => [field, (before as Record<string, unknown>)[UPDATABLE_COLUMNS[field] ?? '']]),
        ),
        version: row.version,
      },
      idempotencyKey: options.idempotencyKey,
    });

    return mapTask(row);
  });

  await recordAudit({
    userId,
    eventType: 'task.updated',
    entityType: 'task',
    entityId: taskId,
    correlationId: options.correlationId,
  });
  return updated;
}

export async function completeTask(
  userId: string,
  taskId: string,
  input: { completionType: string; actualMinutes?: number | null; note?: string | null },
  options: { correlationId: string; idempotencyKey: string },
): Promise<TaskRecord> {
  const task = await withUser(userId, async (db) => {
    const current = await db.query<TaskRow>(
      `select ${TASK_COLUMNS.replaceAll('t.', '')} from public.tasks t where t.id = $1 and t.deleted_at is null`,
      [taskId],
    );
    const before = current.rows[0];
    if (before === undefined) throw notFound('That task could not be found.');

    // RECOVERY_ENGINE.md: a minimum-viable completion is never recorded as full.
    const nextStatus =
      input.completionType === 'intentional_skip' || input.completionType === 'canceled'
        ? 'canceled'
        : 'completed';

    const result = await db.query<TaskRow>(
      `update public.tasks
          set status = $1::public.task_status,
              completed_at = now(),
              last_progress_at = now()
        where id = $2 and deleted_at is null
        returning ${TASK_COLUMNS.replaceAll('t.', '')}`,
      [nextStatus, taskId],
    );
    const row = result.rows[0];
    if (row === undefined) throw notFound('That task could not be found.');

    await db.query(
      `insert into public.task_completion_events
         (user_id, task_id, completion_type, actual_minutes, note)
       values ($1,$2,$3::public.completion_type,$4,$5)`,
      [userId, taskId, input.completionType, input.actualMinutes ?? null, input.note ?? null],
    );

    // Resolve any open missed commitment for this task.
    await db.query(
      `update public.missed_commitments
          set resolved_at = now()
        where task_id = $1 and resolved_at is null`,
      [taskId],
    );

    await recordMutation(db, {
      userId,
      operationType: 'complete',
      entityType: 'task',
      entityId: taskId,
      beforeState: { status: before.status, completedAt: iso(before.completed_at) },
      afterState: { status: row.status, completionType: input.completionType },
      inverseOperation: {
        type: 'reopen_task',
        taskId,
        previousStatus: before.status,
      },
      idempotencyKey: options.idempotencyKey,
    });

    return mapTask(row);
  });

  await recordAudit({
    userId,
    eventType: 'task.completed',
    entityType: 'task',
    entityId: taskId,
    correlationId: options.correlationId,
    metadata: { completionType: input.completionType },
  });
  return task;
}

export async function reopenTask(
  userId: string,
  taskId: string,
  options: { correlationId: string; idempotencyKey: string },
): Promise<TaskRecord> {
  const task = await withUser(userId, async (db) => {
    const result = await db.query<TaskRow>(
      `update public.tasks
          set status = 'ready', completed_at = null
        where id = $1 and deleted_at is null
        returning ${TASK_COLUMNS.replaceAll('t.', '')}`,
      [taskId],
    );
    const row = result.rows[0];
    if (row === undefined) throw notFound('That task could not be found.');
    await recordMutation(db, {
      userId,
      operationType: 'reopen',
      entityType: 'task',
      entityId: taskId,
      beforeState: { status: 'completed' },
      afterState: { status: 'ready' },
      inverseOperation: { type: 'complete_task', taskId },
      idempotencyKey: options.idempotencyKey,
    });
    return mapTask(row);
  });
  await recordAudit({
    userId,
    eventType: 'task.reopened',
    entityType: 'task',
    entityId: taskId,
    correlationId: options.correlationId,
  });
  return task;
}

/** Soft delete. The row is retained so undo can restore it. */
export async function deleteTask(
  userId: string,
  taskId: string,
  options: { correlationId: string; idempotencyKey: string },
): Promise<void> {
  await withUser(userId, async (db) => {
    const result = await db.query(
      `update public.tasks set deleted_at = now()
        where id = $1 and deleted_at is null returning id`,
      [taskId],
    );
    if (result.rowCount === 0) throw notFound('That task could not be found.');
    await recordMutation(db, {
      userId,
      operationType: 'delete',
      entityType: 'task',
      entityId: taskId,
      beforeState: { deletedAt: null },
      afterState: { deletedAt: new Date().toISOString() },
      inverseOperation: { type: 'restore_task', taskId },
      idempotencyKey: options.idempotencyKey,
    });
  });
  await recordAudit({
    userId,
    eventType: 'task.deleted',
    entityType: 'task',
    entityId: taskId,
    correlationId: options.correlationId,
  });
}

export async function restoreTask(userId: string, taskId: string): Promise<void> {
  await withUser(userId, async (db) => {
    const result = await db.query(
      `update public.tasks set deleted_at = null where id = $1 and deleted_at is not null returning id`,
      [taskId],
    );
    if (result.rowCount === 0) throw notFound('That task could not be restored.');
  });
}

/* ---------------------------------------------------------------- projects */

interface ProjectRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  goal_id: string | null;
  life_area_id: string | null;
  title: string;
  outcome: string;
  status: ProjectRecord['status'];
  target_date: Date | string | null;
  budget_cents: string | number | null;
  next_action_task_id: string | null;
  source: string;
  created_at: Date;
  updated_at: Date;
  open_task_count: string | number | null;
  is_stalled: boolean | null;
}

function mapProject(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    lifeAreaId: row.life_area_id,
    title: row.title,
    outcome: row.outcome,
    status: row.status,
    targetDate: dateOnly(row.target_date),
    budgetCents: num(row.budget_cents),
    nextActionTaskId: row.next_action_task_id,
    source: row.source,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    openTaskCount: Number(row.open_task_count ?? 0),
    isStalled: row.is_stalled === true,
  };
}

const PROJECT_SELECT = `
  select p.id, p.user_id, p.goal_id, p.life_area_id, p.title, p.outcome, p.status,
         p.target_date, p.budget_cents, p.next_action_task_id, p.source,
         p.created_at, p.updated_at,
         h.open_task_count, h.is_stalled
    from public.projects p
    left join public.project_health h on h.id = p.id
`;

export async function listProjects(userId: string): Promise<ProjectRecord[]> {
  return withUser(userId, async (db) => {
    const result = await db.query<ProjectRow>(
      `${PROJECT_SELECT} where p.deleted_at is null order by p.created_at desc`,
    );
    return result.rows.map(mapProject);
  });
}

export async function getProject(
  userId: string,
  projectId: string,
): Promise<ProjectRecord | null> {
  return withUser(userId, async (db) => {
    const result = await db.query<ProjectRow>(
      `${PROJECT_SELECT} where p.id = $1 and p.deleted_at is null`,
      [projectId],
    );
    const row = result.rows[0];
    return row === undefined ? null : mapProject(row);
  });
}

export async function createProject(
  userId: string,
  input: {
    title: string;
    outcome: string;
    goalId?: string | null;
    lifeAreaId?: string | null;
    status: ProjectRecord['status'];
    targetDate?: string | null;
    budgetCents?: number | null;
  },
  options: { correlationId: string },
): Promise<ProjectRecord> {
  const project = await withUser(userId, async (db) => {
    const result = await db.query<ProjectRow>(
      `insert into public.projects
         (user_id, goal_id, life_area_id, title, outcome, status, target_date, budget_cents)
       values ($1,$2,$3,$4,$5,$6::public.project_status,$7,$8)
       returning id, user_id, goal_id, life_area_id, title, outcome, status, target_date,
                 budget_cents, next_action_task_id, source, created_at, updated_at,
                 0 as open_task_count, false as is_stalled`,
      [
        userId,
        input.goalId ?? null,
        input.lifeAreaId ?? null,
        input.title,
        input.outcome,
        input.status,
        input.targetDate ?? null,
        input.budgetCents ?? null,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) throw new ApiError('INTERNAL_ERROR', 'The project could not be created.');
    return mapProject(row);
  });
  await recordAudit({
    userId,
    eventType: 'project.created',
    entityType: 'project',
    entityId: project.id,
    correlationId: options.correlationId,
  });
  return project;
}

export async function updateProject(
  userId: string,
  projectId: string,
  input: Record<string, unknown>,
  options: { correlationId: string },
): Promise<ProjectRecord> {
  const columns: Record<string, string> = {
    title: 'title',
    outcome: 'outcome',
    goalId: 'goal_id',
    lifeAreaId: 'life_area_id',
    status: 'status',
    targetDate: 'target_date',
    budgetCents: 'budget_cents',
    nextActionTaskId: 'next_action_task_id',
  };

  const project = await withUser(userId, async (db) => {
    const assignments: string[] = [];
    const values: unknown[] = [];
    for (const [field, column] of Object.entries(columns)) {
      const value = input[field];
      if (value === undefined) continue;
      values.push(value);
      assignments.push(
        column === 'status'
          ? `${column} = $${values.length}::public.project_status`
          : `${column} = $${values.length}`,
      );
    }
    if (assignments.length === 0) {
      const existing = await getProject(userId, projectId);
      if (existing === null) throw notFound('That project could not be found.');
      return existing;
    }
    values.push(projectId);
    const result = await db.query(
      `update public.projects set ${assignments.join(', ')}
        where id = $${values.length} and deleted_at is null returning id`,
      values,
    );
    if (result.rowCount === 0) throw notFound('That project could not be found.');
    const refreshed = await db.query<ProjectRow>(
      `${PROJECT_SELECT} where p.id = $1`,
      [projectId],
    );
    const row = refreshed.rows[0];
    if (row === undefined) throw notFound('That project could not be found.');
    return mapProject(row);
  });

  await recordAudit({
    userId,
    eventType: 'project.updated',
    entityType: 'project',
    entityId: projectId,
    correlationId: options.correlationId,
  });
  return project;
}

export async function deleteProject(
  userId: string,
  projectId: string,
  options: { correlationId: string },
): Promise<void> {
  await withUser(userId, async (db) => {
    const result = await db.query(
      `update public.projects set deleted_at = now() where id = $1 and deleted_at is null returning id`,
      [projectId],
    );
    if (result.rowCount === 0) throw notFound('That project could not be found.');
    // Detach tasks rather than deleting them; the work may still be real.
    await db.query(`update public.tasks set project_id = null where project_id = $1`, [projectId]);
  });
  await recordAudit({
    userId,
    eventType: 'project.deleted',
    entityType: 'project',
    entityId: projectId,
    correlationId: options.correlationId,
  });
}

/* ------------------------------------------------------------------- inbox */

interface InboxRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  raw_text: string;
  item_type: string;
  suggested_type: string | null;
  classification_confidence: string | number | null;
  duplicate_candidates: Array<{ id: string; title: string; similarity: number }>;
  conversion_entity_type: string | null;
  conversion_entity_id: string | null;
  resolved_at: Date | null;
  source: string;
  created_at: Date;
}

function mapInbox(row: InboxRow): InboxItemRecord {
  return {
    id: row.id,
    userId: row.user_id,
    rawText: row.raw_text,
    itemType: row.item_type,
    suggestedType: row.suggested_type,
    classificationConfidence: num(row.classification_confidence),
    duplicateCandidates: row.duplicate_candidates ?? [],
    conversionEntityType: row.conversion_entity_type,
    conversionEntityId: row.conversion_entity_id,
    resolvedAt: iso(row.resolved_at),
    source: row.source,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

const INBOX_COLUMNS = `id, user_id, raw_text, item_type, suggested_type,
  classification_confidence, duplicate_candidates, conversion_entity_type,
  conversion_entity_id, resolved_at, source, created_at`;

/**
 * Capture requires only text. Classification is a rule-based suggestion, never
 * a gate: if it produces nothing useful the capture is still stored verbatim
 * (ACCEPTANCE_CRITERIA.md "Classification failure does not lose capture").
 */
export async function createInboxItem(
  userId: string,
  input: { rawText: string; clientCaptureId?: string },
  options: { correlationId: string },
): Promise<InboxItemRecord> {
  const { suggestedType, confidence } = classifyCapture(input.rawText);

  const item = await withUser(userId, async (db) => {
    if (input.clientCaptureId !== undefined) {
      const existing = await db.query<InboxRow>(
        `select ${INBOX_COLUMNS} from public.inbox_items
          where client_capture_id = $1 and deleted_at is null`,
        [input.clientCaptureId],
      );
      const found = existing.rows[0];
      // Replaying a queued offline capture returns the original row.
      if (found !== undefined) return mapInbox(found);
    }

    // Duplicate detection is a suggestion, never a block
    // (ACCEPTANCE_CRITERIA.md "Duplicate candidates are suggestions").
    // Exact case-insensitive title match keeps this dependency-free; fuzzy
    // matching would need pg_trgm and is deferred.
    const duplicates = await db.query<{ id: string; title: string; similarity: number }>(
      `select id, title, 1.0 as similarity
         from public.tasks
        where deleted_at is null
          and status not in ('completed','canceled','archived')
          and lower(title) = lower($1)
        limit 5`,
      [input.rawText],
    );

    const inserted = await db.query<InboxRow>(
      `insert into public.inbox_items
         (user_id, raw_text, suggested_type, classification_confidence,
          duplicate_candidates, client_capture_id)
       values ($1,$2,$3::public.inbox_item_type,$4,$5,$6)
       returning ${INBOX_COLUMNS}`,
      [
        userId,
        input.rawText,
        suggestedType,
        confidence,
        JSON.stringify(duplicates.rows),
        input.clientCaptureId ?? null,
      ],
    );
    const row = inserted.rows[0];
    if (row === undefined) throw new ApiError('INTERNAL_ERROR', 'The capture could not be saved.');
    return mapInbox(row);
  });

  await recordAudit({
    userId,
    eventType: 'inbox.captured',
    entityType: 'inbox_item',
    entityId: item.id,
    correlationId: options.correlationId,
  });
  return item;
}

/**
 * Rule-based capture classification. Deterministic and inspectable; there is no
 * model call here (DECISION_LOG D-003). Confidence stays low on purpose so the
 * suggestion is presented as a suggestion.
 */
export function classifyCapture(text: string): {
  suggestedType: string;
  confidence: number;
} {
  const lowered = text.toLowerCase();
  const rules: Array<[RegExp, string, number]> = [
    [/\b(buy|order|purchase|pick up|get more)\b/, 'purchase', 0.6],
    [/\b(call|email|drop off|return|mail|pick up from)\b/, 'errand', 0.5],
    [/\b(learn|study|practice|read|course|lesson)\b/, 'note', 0.45],
    [/\b(meeting|appointment|flight|wedding|dinner at)\b/, 'event', 0.55],
    [/\b(idea|maybe|someday|what if)\b/, 'idea', 0.5],
    [/\b(broken|leak|mold|not working|fix)\b/, 'problem', 0.55],
    [/\b(every day|daily|weekly|habit|routine)\b/, 'habit', 0.5],
    [/\b(pack|packing|trip|travel|hotel)\b/, 'trip_requirement', 0.5],
  ];
  for (const [pattern, type, confidence] of rules) {
    if (pattern.test(lowered)) return { suggestedType: type, confidence };
  }
  return { suggestedType: 'task', confidence: 0.3 };
}

export async function listInboxItems(
  userId: string,
  options: { includeResolved?: boolean } = {},
): Promise<InboxItemRecord[]> {
  return withUser(userId, async (db) => {
    const result = await db.query<InboxRow>(
      `select ${INBOX_COLUMNS} from public.inbox_items
        where deleted_at is null
          ${options.includeResolved === true ? '' : 'and resolved_at is null'}
        order by created_at desc
        limit 200`,
    );
    return result.rows.map(mapInbox);
  });
}

/**
 * Convert an inbox item into a task/project/goal in one transaction. If the
 * conversion fails, the original capture is untouched
 * (INFORMATION_ARCHITECTURE.md Inbox → Error).
 */
export async function convertInboxItem(
  userId: string,
  inboxItemId: string,
  input: {
    target: 'task' | 'project' | 'goal' | 'note';
    title?: string;
    outcome?: string;
    estimatedMinutes?: number | null;
    dueAt?: string | null;
  },
  options: { correlationId: string },
): Promise<{ entityType: string; entityId: string }> {
  const result = await withUser(userId, async (db) => {
    const current = await db.query<InboxRow>(
      `select ${INBOX_COLUMNS} from public.inbox_items
        where id = $1 and deleted_at is null`,
      [inboxItemId],
    );
    const item = current.rows[0];
    if (item === undefined) throw notFound('That capture could not be found.');
    if (item.resolved_at !== null) {
      throw new ApiError('VALIDATION_ERROR', 'That capture was already resolved.');
    }

    const title = input.title ?? item.raw_text.slice(0, 300);
    let entityType: string;
    let entityId: string;

    if (input.target === 'project') {
      const inserted = await db.query<{ id: string }>(
        `insert into public.projects (user_id, title, outcome, status)
         values ($1,$2,$3,'active') returning id`,
        [userId, title, input.outcome ?? title],
      );
      entityType = 'project';
      entityId = inserted.rows[0]?.id ?? '';
    } else if (input.target === 'goal') {
      const inserted = await db.query<{ id: string }>(
        `insert into public.goals (user_id, title) values ($1,$2) returning id`,
        [userId, title],
      );
      entityType = 'goal';
      entityId = inserted.rows[0]?.id ?? '';
    } else if (input.target === 'note') {
      // A note stays in the inbox as a resolved record; nothing else is created.
      entityType = 'note';
      entityId = inboxItemId;
    } else {
      const confidence = confidenceFor({
        estimatedMinutes: input.estimatedMinutes,
        dueAt: input.dueAt,
        definitionOfDone: null,
      });
      const inserted = await db.query<{ id: string }>(
        `insert into public.tasks (user_id, title, estimated_minutes, due_at, confidence)
         values ($1,$2,$3,$4,$5) returning id`,
        [userId, title, input.estimatedMinutes ?? null, input.dueAt ?? null, confidence],
      );
      entityType = 'task';
      entityId = inserted.rows[0]?.id ?? '';
    }

    if (entityId === '') {
      throw new ApiError('INTERNAL_ERROR', 'The conversion did not complete.');
    }

    await db.query(
      `update public.inbox_items
          set resolved_at = now(),
              item_type = $2::public.inbox_item_type,
              conversion_entity_type = $3,
              conversion_entity_id = $4
        where id = $1`,
      [
        inboxItemId,
        input.target === 'note' ? 'note' : input.target,
        entityType,
        entityId,
      ],
    );

    return { entityType, entityId };
  });

  await recordAudit({
    userId,
    eventType: 'inbox.converted',
    entityType: 'inbox_item',
    entityId: inboxItemId,
    correlationId: options.correlationId,
    metadata: { target: input.target },
  });
  return result;
}

export async function deleteInboxItem(userId: string, inboxItemId: string): Promise<void> {
  await withUser(userId, async (db) => {
    const result = await db.query(
      `update public.inbox_items set deleted_at = now()
        where id = $1 and deleted_at is null returning id`,
      [inboxItemId],
    );
    if (result.rowCount === 0) throw notFound('That capture could not be found.');
  });
}

export function newIdempotencyKey(): string {
  return randomUUID();
}
