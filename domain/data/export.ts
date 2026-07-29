import { withUser } from '@/lib/db/session';
import { recordAudit } from '@/domain/tasks/repository';

/**
 * User data export — SECURITY_AND_PRIVACY.md §15.
 *
 * Excludes secrets and encrypted blobs entirely: `calendar_connections`,
 * `oauth_states`, and `trip_items.encrypted_detail` are never read here. Each
 * export carries a schema version and generation time.
 */

export const EXPORT_SCHEMA_VERSION = '1.0.0';

/** Tables exported verbatim, minus any excluded columns. */
const EXPORTED: Array<{ table: string; columns: string }> = [
  { table: 'profiles', columns: 'id, display_name, home_timezone, locale, created_at' },
  {
    table: 'user_preferences',
    columns:
      'planning_horizon_days, default_transition_minutes, default_travel_buffer_minutes, contingency_percent, hard_daily_load_percent, daily_notification_cap, sync_event_descriptions, starter_data_installed_at',
  },
  { table: 'life_areas', columns: 'id, name, slug, is_protected, sort_order, source' },
  { table: 'goals', columns: 'id, life_area_id, title, description, target_date, status, source' },
  {
    table: 'projects',
    columns:
      'id, goal_id, life_area_id, title, outcome, status, target_date, budget_cents, next_action_task_id, source, created_at',
  },
  {
    table: 'tasks',
    columns:
      'id, project_id, goal_id, life_area_id, title, description, status, due_at, due_timezone, preferred_date, estimated_minutes, minimum_minutes, energy_requirement, location_label, cost_cents, consequence_level, flexibility, minimum_viable_definition, recovery_window_hours, definition_of_done, source, confidence, completed_at, version, created_at',
  },
  { table: 'task_dependencies', columns: 'task_id, depends_on_task_id, dependency_type' },
  {
    table: 'task_completion_events',
    columns: 'task_id, completion_type, actual_minutes, note, occurred_at',
  },
  { table: 'routines', columns: 'id, title, recurrence_rule, default_estimated_minutes, active, source' },
  { table: 'inbox_items', columns: 'id, raw_text, item_type, resolved_at, source, created_at' },
  { table: 'energy_checkins', columns: 'level, reason, checked_at' },
  { table: 'capacity_profiles', columns: 'weekday_capacity_minutes, weekend_capacity_minutes, max_high_energy_minutes' },
  { table: 'rooms', columns: 'id, name, room_type, current_use, desired_state, source' },
  { table: 'cleaning_zones', columns: 'id, room_id, name, definition_of_done, default_minutes' },
  {
    table: 'maintenance_records',
    columns: 'id, room_id, title, concern_type, status, severity, next_follow_up_at, source',
  },
  { table: 'room_use_options', columns: 'id, room_id, name, weighted_score, selected, revisit_date' },
  { table: 'fitness_profiles', columns: 'weekly_frequency_target, default_gym_travel_minutes, equipment' },
  { table: 'workout_templates', columns: 'id, name, location_type, estimated_minutes, minimum_minutes, active' },
  {
    table: 'learning_sessions',
    columns: 'id, task_id, topic, source_name, objective, practice_activity, completion_evidence, session_state',
  },
  {
    table: 'trips',
    columns: 'id, name, destination, trip_timezone, starts_on, ends_on, date_verification, readiness_status, source',
  },
  // masked_confirmation only; encrypted_detail is deliberately excluded.
  {
    table: 'trip_items',
    columns: 'id, trip_id, item_type, title, status, due_at, verification_status, masked_confirmation',
  },
  { table: 'decisions', columns: 'id, decision, context, reason, expected_outcome, actual_outcome, revisit_on, decided_at' },
  { table: 'daily_plans', columns: 'id, local_date, timezone, version, status, capacity_minutes, committed_minutes, engine_version' },
  {
    table: 'priority_snapshots',
    columns: 'task_id, context_key, final_score, confidence, rank, explanation, engine_version, generated_at',
  },
];

export interface ExportPayload {
  schemaVersion: string;
  generatedAt: string;
  excluded: string[];
  data: Record<string, unknown[]>;
}

export async function exportUserData(
  userId: string,
  options: { correlationId: string },
): Promise<ExportPayload> {
  const data: Record<string, unknown[]> = {};

  await withUser(userId, async (db) => {
    for (const entry of EXPORTED) {
      // Table and column lists are compile-time constants, never user input.
      const result = await db.query(`select ${entry.columns} from public.${entry.table}`);
      data[entry.table] = result.rows;
    }
  });

  await recordAudit({
    userId,
    eventType: 'data.exported',
    entityType: 'user',
    entityId: userId,
    correlationId: options.correlationId,
    metadata: { tableCount: EXPORTED.length },
  });

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    excluded: [
      'calendar_connections (encrypted OAuth tokens)',
      'oauth_states (single-use OAuth material)',
      'trip_items.encrypted_detail (encrypted confirmations)',
      'audit_events (security log, retained separately)',
    ],
    data,
  };
}
