import { withUser } from '@/lib/db/session';
import { recordAudit } from '@/domain/tasks/repository';
import starterData from './starter-data.json';

/**
 * Starter-data installation and removal.
 *
 * Every record is written with `source = 'starter'` so the UI can show a
 * "Starter" badge and a single reviewed action can remove all of it
 * (INFORMATION_ARCHITECTURE.md global interaction rules). Starter data is never
 * installed implicitly: it requires an explicit user choice and the
 * FEATURE_STARTER_DATA flag.
 *
 * Houston trip dates stay null and `date_verification = 'unverified'`, so no
 * deadline automation can fire from them (DECISION_LOG D-011).
 */

interface StarterShape {
  schema_version: string;
  profile_defaults: {
    home_timezone: string;
    locale: string;
    planning_horizon_days: number;
    default_transition_minutes: number;
    default_travel_buffer_minutes: number;
    contingency_percent: number;
    daily_notification_cap: number;
  };
  life_areas: Array<{ key: string; name: string; protected: boolean }>;
  goals: Array<{
    key: string;
    life_area_key: string | null;
    title: string;
    description?: string;
    protected: boolean;
  }>;
  projects: Array<{
    key: string;
    goal_key: string | null;
    life_area_key: string | null;
    title: string;
    outcome: string;
    status: string;
    budget_cents: number | null;
  }>;
  tasks: Array<{
    key: string;
    life_area_key: string | null;
    project_key?: string | null;
    title: string;
    status: string;
    estimated_minutes?: number | null;
    minimum_minutes?: number | null;
    energy_requirement?: string;
    flexibility?: string;
    consequence_level?: number;
    definition_of_done?: string | null;
    minimum_viable_definition?: string | null;
    recovery_window_hours?: number | null;
  }>;
  routines: Array<{
    key: string;
    life_area_key: string | null;
    title: string;
    recurrence_rule: string;
    default_estimated_minutes: number;
    minimum_minutes?: number | null;
    recovery_window_hours?: number | null;
    protected?: boolean;
    target_frequency_per_week?: number | null;
  }>;
  rooms: Array<{
    key: string;
    name: string;
    room_type?: string | null;
    current_use?: string | null;
    desired_state?: string | null;
  }>;
  cleaning_zones: Array<{
    room_key: string;
    name: string;
    default_minutes: number;
    minimum_minutes?: number | null;
    definition_of_done: string;
    required_supplies?: string[];
  }>;
  maintenance_records: Array<{
    room_key: string | null;
    title: string;
    concern_type: string;
    status: string;
    severity: number;
    landlord_request_status?: string | null;
  }>;
  room_use_options: Array<{
    room_key: string;
    name: string;
    estimated_cost_cents: number | null;
    income_potential_score: number;
    privacy_score: number;
    lifestyle_benefit_score: number;
    setup_effort_score: number;
    flexibility_score: number;
    reversibility_score: number;
  }>;
  fitness: {
    weekly_frequency_target: number;
    default_gym_travel_minutes: number;
    equipment: string[];
    scheduling_constraints: string[];
    workout_templates: Array<{
      key: string;
      name: string;
      location_type: string;
      estimated_minutes: number;
      minimum_minutes: number | null;
      equipment: string[];
      approved_structure: Record<string, unknown>;
    }>;
  };
  learning_sessions: Array<{
    key: string;
    task_key: string;
    topic: string;
    source_name: string;
    source_reference: string | null;
    objective: string;
    practice_activity: string;
    completion_evidence: string;
    next_action: string | null;
  }>;
  trips: Array<{
    key: string;
    name: string;
    destination: string | null;
    trip_timezone: string | null;
    starts_on: string | null;
    ends_on: string | null;
    date_verification: string;
    booking_status: string;
    readiness_status: string;
  }>;
  notification_preferences: Array<{
    category: string;
    in_app_enabled: boolean;
    browser_enabled: boolean;
    email_enabled: boolean;
    minimum_urgency: string;
    digest_mode: string;
  }>;
}

const data = starterData as unknown as StarterShape;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export interface InstallResult {
  installed: boolean;
  counts: Record<string, number>;
}

export async function installStarterData(
  userId: string,
  options: { correlationId: string },
): Promise<InstallResult> {
  const counts: Record<string, number> = {};

  const result = await withUser(userId, async (db) => {
    const already = await db.query<{ starter_data_installed_at: Date | null }>(
      'select starter_data_installed_at from public.user_preferences where user_id = $1',
      [userId],
    );
    if (already.rows[0]?.starter_data_installed_at != null) {
      return { installed: false, counts } satisfies InstallResult;
    }

    const defaults = data.profile_defaults;
    await db.query(
      `update public.user_preferences
          set planning_horizon_days = $2,
              default_transition_minutes = $3,
              default_travel_buffer_minutes = $4,
              contingency_percent = $5,
              daily_notification_cap = $6,
              starter_data_installed_at = now(),
              starter_data_removed_at = null
        where user_id = $1`,
      [
        userId,
        defaults.planning_horizon_days,
        defaults.default_transition_minutes,
        defaults.default_travel_buffer_minutes,
        defaults.contingency_percent,
        defaults.daily_notification_cap,
      ],
    );
    await db.query(
      `update public.profiles set home_timezone = $2, locale = $3 where id = $1`,
      [userId, defaults.home_timezone, defaults.locale],
    );

    const lifeAreaIds = new Map<string, string>();
    for (const [index, area] of data.life_areas.entries()) {
      const inserted = await db.query<{ id: string }>(
        `insert into public.life_areas (user_id, name, slug, is_protected, sort_order, source)
         values ($1,$2,$3,$4,$5,'starter')
         on conflict (user_id, slug) do update set name = excluded.name
         returning id`,
        [userId, area.name, slugify(area.key), area.protected, index],
      );
      const id = inserted.rows[0]?.id;
      if (id !== undefined) lifeAreaIds.set(area.key, id);
    }
    counts.lifeAreas = lifeAreaIds.size;

    const goalIds = new Map<string, string>();
    for (const goal of data.goals) {
      const inserted = await db.query<{ id: string }>(
        `insert into public.goals (user_id, life_area_id, title, description, is_protected, source)
         values ($1,$2,$3,$4,$5,'starter') returning id`,
        [
          userId,
          goal.life_area_key === null ? null : (lifeAreaIds.get(goal.life_area_key) ?? null),
          goal.title,
          goal.description ?? null,
          goal.protected,
        ],
      );
      const id = inserted.rows[0]?.id;
      if (id !== undefined) goalIds.set(goal.key, id);
    }
    counts.goals = goalIds.size;

    const projectIds = new Map<string, string>();
    for (const project of data.projects) {
      const inserted = await db.query<{ id: string }>(
        `insert into public.projects
           (user_id, goal_id, life_area_id, title, outcome, status, budget_cents, source)
         values ($1,$2,$3,$4,$5,$6::public.project_status,$7,'starter') returning id`,
        [
          userId,
          project.goal_key === null ? null : (goalIds.get(project.goal_key) ?? null),
          project.life_area_key === null
            ? null
            : (lifeAreaIds.get(project.life_area_key) ?? null),
          project.title,
          project.outcome,
          project.status,
          project.budget_cents,
        ],
      );
      const id = inserted.rows[0]?.id;
      if (id !== undefined) projectIds.set(project.key, id);
    }
    counts.projects = projectIds.size;

    const taskIds = new Map<string, string>();
    for (const task of data.tasks) {
      const inserted = await db.query<{ id: string }>(
        `insert into public.tasks
           (user_id, life_area_id, project_id, title, status, estimated_minutes,
            minimum_minutes, energy_requirement, flexibility, consequence_level,
            definition_of_done, minimum_viable_definition, recovery_window_hours,
            source, confidence)
         values ($1,$2,$3,$4,$5::public.task_status,$6,$7,
                 $8::public.energy_requirement,$9::public.flexibility_level,$10,
                 $11,$12,$13,'starter',0.8)
         returning id`,
        [
          userId,
          task.life_area_key === null || task.life_area_key === undefined
            ? null
            : (lifeAreaIds.get(task.life_area_key) ?? null),
          task.project_key == null ? null : (projectIds.get(task.project_key) ?? null),
          task.title,
          task.status,
          task.estimated_minutes ?? null,
          task.minimum_minutes ?? null,
          task.energy_requirement ?? 'any',
          task.flexibility ?? 'medium',
          task.consequence_level ?? 25,
          task.definition_of_done ?? null,
          task.minimum_viable_definition ?? null,
          task.recovery_window_hours ?? null,
        ],
      );
      const id = inserted.rows[0]?.id;
      if (id !== undefined) taskIds.set(task.key, id);
    }
    counts.tasks = taskIds.size;

    for (const routine of data.routines) {
      await db.query(
        `insert into public.routines
           (user_id, life_area_id, title, recurrence_rule, default_estimated_minutes,
            minimum_minutes, recovery_window_hours, protected, target_frequency_per_week, source)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'starter')`,
        [
          userId,
          routine.life_area_key === null ? null : (lifeAreaIds.get(routine.life_area_key) ?? null),
          routine.title,
          routine.recurrence_rule,
          routine.default_estimated_minutes,
          routine.minimum_minutes ?? null,
          routine.recovery_window_hours ?? null,
          routine.protected ?? false,
          routine.target_frequency_per_week ?? null,
        ],
      );
    }
    counts.routines = data.routines.length;

    const roomIds = new Map<string, string>();
    for (const room of data.rooms) {
      const inserted = await db.query<{ id: string }>(
        `insert into public.rooms (user_id, name, room_type, current_use, desired_state, source)
         values ($1,$2,$3,$4,$5,'starter')
         on conflict (user_id, name) do update set desired_state = excluded.desired_state
         returning id`,
        [
          userId,
          room.name,
          room.room_type ?? null,
          room.current_use ?? null,
          room.desired_state ?? null,
        ],
      );
      const id = inserted.rows[0]?.id;
      if (id !== undefined) roomIds.set(room.key, id);
    }
    counts.rooms = roomIds.size;

    for (const zone of data.cleaning_zones) {
      const roomId = roomIds.get(zone.room_key);
      if (roomId === undefined) continue;
      await db.query(
        `insert into public.cleaning_zones
           (user_id, room_id, name, definition_of_done, default_minutes, minimum_minutes, required_supplies)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [
          userId,
          roomId,
          zone.name,
          zone.definition_of_done,
          zone.default_minutes,
          zone.minimum_minutes ?? null,
          zone.required_supplies ?? [],
        ],
      );
    }
    counts.cleaningZones = data.cleaning_zones.length;

    for (const record of data.maintenance_records) {
      await db.query(
        `insert into public.maintenance_records
           (user_id, room_id, title, concern_type, status, severity, landlord_request_status, source)
         values ($1,$2,$3,$4,$5,$6,$7,'starter')`,
        [
          userId,
          record.room_key === null ? null : (roomIds.get(record.room_key) ?? null),
          record.title,
          record.concern_type,
          record.status,
          record.severity,
          record.landlord_request_status ?? null,
        ],
      );
    }
    counts.maintenanceRecords = data.maintenance_records.length;

    for (const option of data.room_use_options) {
      const roomId = roomIds.get(option.room_key);
      if (roomId === undefined) continue;
      await db.query(
        `insert into public.room_use_options
           (user_id, room_id, name, estimated_cost_cents, income_potential_score,
            privacy_score, lifestyle_benefit_score, setup_effort_score,
            flexibility_score, reversibility_score, selected)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false)
         on conflict (room_id, name) do nothing`,
        [
          userId,
          roomId,
          option.name,
          option.estimated_cost_cents,
          option.income_potential_score,
          option.privacy_score,
          option.lifestyle_benefit_score,
          option.setup_effort_score,
          option.flexibility_score,
          option.reversibility_score,
        ],
      );
    }
    counts.roomUseOptions = data.room_use_options.length;

    await db.query(
      `insert into public.fitness_profiles
         (user_id, weekly_frequency_target, default_gym_travel_minutes, equipment, scheduling_constraints)
       values ($1,$2,$3,$4,$5)
       on conflict (user_id) do update
         set weekly_frequency_target = excluded.weekly_frequency_target,
             default_gym_travel_minutes = excluded.default_gym_travel_minutes,
             equipment = excluded.equipment,
             scheduling_constraints = excluded.scheduling_constraints`,
      [
        userId,
        data.fitness.weekly_frequency_target,
        data.fitness.default_gym_travel_minutes,
        JSON.stringify(data.fitness.equipment),
        data.fitness.scheduling_constraints,
      ],
    );

    for (const template of data.fitness.workout_templates) {
      await db.query(
        `insert into public.workout_templates
           (user_id, name, location_type, estimated_minutes, minimum_minutes,
            equipment, approved_structure, source)
         values ($1,$2,$3,$4,$5,$6,$7,'starter')`,
        [
          userId,
          template.name,
          template.location_type,
          template.estimated_minutes,
          template.minimum_minutes,
          JSON.stringify(template.equipment),
          JSON.stringify(template.approved_structure),
        ],
      );
    }
    counts.workoutTemplates = data.fitness.workout_templates.length;

    for (const session of data.learning_sessions) {
      const taskId = taskIds.get(session.task_key);
      if (taskId === undefined) continue;
      await db.query(
        `insert into public.learning_sessions
           (user_id, task_id, topic, source_name, source_reference, objective,
            practice_activity, completion_evidence, next_action)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         on conflict (task_id) do nothing`,
        [
          userId,
          taskId,
          session.topic,
          session.source_name,
          session.source_reference,
          session.objective,
          session.practice_activity,
          session.completion_evidence,
          session.next_action,
        ],
      );
    }
    counts.learningSessions = data.learning_sessions.length;

    for (const trip of data.trips) {
      await db.query(
        `insert into public.trips
           (user_id, name, destination, trip_timezone, starts_on, ends_on,
            date_verification, booking_status, readiness_status, source)
         values ($1,$2,$3,$4,$5,$6,$7::public.verification_status,$8,$9,'starter')`,
        [
          userId,
          trip.name,
          trip.destination,
          trip.trip_timezone,
          // Dates stay null until the user confirms them (D-011).
          trip.starts_on,
          trip.ends_on,
          trip.date_verification,
          trip.booking_status,
          trip.readiness_status,
        ],
      );
    }
    counts.trips = data.trips.length;

    for (const preference of data.notification_preferences) {
      await db.query(
        `insert into public.notification_preferences
           (user_id, category, in_app_enabled, browser_enabled, email_enabled,
            minimum_urgency, digest_mode)
         values ($1,$2,$3,$4,$5,$6::public.notification_urgency,$7)
         on conflict (user_id, category) do nothing`,
        [
          userId,
          preference.category,
          preference.in_app_enabled,
          // Browser and email delivery are not implemented in Phase 1; the
          // starter data must not imply otherwise.
          false,
          false,
          preference.minimum_urgency,
          preference.digest_mode,
        ],
      );
    }
    counts.notificationPreferences = data.notification_preferences.length;

    return { installed: true, counts } satisfies InstallResult;
  });

  if (result.installed) {
    await recordAudit({
      userId,
      eventType: 'starter_data.installed',
      entityType: 'user',
      entityId: userId,
      correlationId: options.correlationId,
      metadata: { schemaVersion: data.schema_version, counts: result.counts },
    });
  }
  return result;
}

/** Tables that carry a `source` column and can hold starter rows. */
const STARTER_TABLES = [
  'tasks',
  'projects',
  'goals',
  'routines',
  'maintenance_records',
  'trips',
  'workout_templates',
  'home_items',
  'rooms',
  'life_areas',
] as const;

/** Remove every starter row in one reviewed action. */
export async function removeStarterData(
  userId: string,
  options: { correlationId: string },
): Promise<{ removed: Record<string, number> }> {
  const removed: Record<string, number> = {};

  await withUser(userId, async (db) => {
    for (const table of STARTER_TABLES) {
      const result = await db.query(
        `delete from public.${table} where user_id = $1 and source = 'starter'`,
        [userId],
      );
      removed[table] = result.rowCount;
    }
    await db.query(
      `update public.user_preferences
          set starter_data_removed_at = now(), starter_data_installed_at = null
        where user_id = $1`,
      [userId],
    );
  });

  await recordAudit({
    userId,
    eventType: 'starter_data.removed',
    entityType: 'user',
    entityId: userId,
    correlationId: options.correlationId,
    metadata: { removed },
  });
  return { removed };
}
