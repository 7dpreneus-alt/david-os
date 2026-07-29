-- Slice 13: triggers and indexes.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  if tg_table_name = 'tasks' then
    new.version = old.version + 1;
  end if;
  return new;
end;
$$;

do $$
declare
  target text;
begin
  foreach target in array array[
    'profiles','user_preferences','life_areas','inbox_items','goals','projects','tasks','routines',
    'routine_occurrences','availability_rules','capacity_profiles','calendar_connections','external_calendars',
    'calendar_sync_states','external_events','daily_plans','schedule_proposals','rooms','home_items',
    'cleaning_zones','maintenance_records','room_use_options','fitness_profiles','workout_templates',
    'workout_sessions','learning_sessions','trips','trip_items','opportunity_sources','opportunities',
    'notification_preferences','notifications','weekly_reviews','decisions','job_runs'
  ]
  loop
    if not exists (
      select 1 from pg_trigger
      where tgname = format('trg_%s_updated_at', target)
        and tgrelid = format('public.%I', target)::regclass
    ) then
      execute format(
        'create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
        target, target
      );
    end if;
  end loop;
end $$;

create index if not exists tasks_user_status_due_idx on public.tasks(user_id, status, due_at) where deleted_at is null;
create index if not exists tasks_user_preferred_date_idx on public.tasks(user_id, preferred_date) where deleted_at is null;
create index if not exists projects_user_status_idx on public.projects(user_id, status) where deleted_at is null;
create index if not exists inbox_user_unresolved_idx on public.inbox_items(user_id, created_at desc) where resolved_at is null and deleted_at is null;
create index if not exists external_events_calendar_time_idx on public.external_events(external_calendar_id, starts_at, ends_at) where is_deleted = false;
create index if not exists external_events_user_date_idx on public.external_events(user_id, start_date, end_date_exclusive) where is_deleted = false;
create index if not exists priority_context_rank_idx on public.priority_snapshots(user_id, context_key, rank, generated_at desc);
create index if not exists proposals_user_status_idx on public.schedule_proposals(user_id, status, created_at desc);
create index if not exists recovery_active_idx on public.recovery_plans(user_id, status, generated_at desc);
create index if not exists notifications_delivery_idx on public.notifications(user_id, state, deliver_after, urgency);
create index if not exists opportunities_active_idx on public.opportunities(user_id, category, verification_status, expires_at) where deleted_at is null;
create index if not exists job_runs_claim_idx on public.job_runs(state, next_attempt_at, lease_expires_at);
create index if not exists audit_user_time_idx on public.audit_events(user_id, occurred_at desc);
create index if not exists oauth_states_expiry_idx on public.oauth_states(expires_at) where consumed_at is null;
create index if not exists missed_commitments_open_idx on public.missed_commitments(user_id, resolved_at, detected_at desc);
create index if not exists task_dependencies_reverse_idx on public.task_dependencies(user_id, depends_on_task_id);
