-- Slice 14: row-level security and grants.
--
-- Every table listed in DATA_MODEL.md gets RLS enabled. Ordinary user-owned
-- tables get owner-only select/insert/update/delete. Sensitive and
-- append-oriented tables get RLS with NO authenticated policy: only the
-- service role (used exclusively by server code) may touch them.

do $$
declare
  target text;
begin
  foreach target in array array[
    'profiles','user_preferences','life_areas','inbox_items','goals','projects','tasks','task_dependencies',
    'routines','routine_occurrences','task_completion_events','availability_rules','energy_checkins','capacity_profiles',
    'calendar_connections','external_calendars','calendar_sync_states','external_events','task_event_links','daily_plans',
    'daily_plan_items','priority_snapshots','schedule_proposals','schedule_proposal_items','approvals','missed_commitments',
    'recovery_plans','recovery_options','recovery_selections','rooms','home_items','cleaning_zones','maintenance_records',
    'room_use_options','fitness_profiles','workout_templates','workout_sessions','learning_sessions','trips','trip_items',
    'opportunity_sources','opportunities','opportunity_source_records','opportunity_decisions','notification_preferences',
    'notifications','notification_deliveries','weekly_reviews','decisions','audit_events','mutation_history','job_runs',
    'rolling_state_snapshots','oauth_states'
  ]
  loop
    execute format('alter table public.%I enable row level security', target);
    execute format('alter table public.%I force row level security', target);
  end loop;
end $$;

-- profiles is keyed by id rather than user_id.
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy profiles_delete_own on public.profiles for delete to authenticated using ((select auth.uid()) = id);

do $$
declare
  target text;
begin
  foreach target in array array[
    'user_preferences','life_areas','inbox_items','goals','projects','tasks','task_dependencies','routines',
    'routine_occurrences','task_completion_events','availability_rules','energy_checkins','capacity_profiles',
    'external_calendars','external_events','task_event_links','daily_plans','daily_plan_items','priority_snapshots',
    'schedule_proposals','schedule_proposal_items','missed_commitments','recovery_plans','recovery_options',
    'recovery_selections','rooms','home_items','cleaning_zones','maintenance_records','room_use_options',
    'fitness_profiles','workout_templates','workout_sessions','learning_sessions','trips','trip_items',
    'opportunity_sources','opportunities','opportunity_decisions','notification_preferences','notifications',
    'weekly_reviews','decisions','rolling_state_snapshots'
  ]
  loop
    execute format('drop policy if exists %I_select_own on public.%I', target, target);
    execute format('drop policy if exists %I_insert_own on public.%I', target, target);
    execute format('drop policy if exists %I_update_own on public.%I', target, target);
    execute format('drop policy if exists %I_delete_own on public.%I', target, target);
    execute format('create policy %I_select_own on public.%I for select to authenticated using ((select auth.uid()) = user_id)', target, target);
    execute format('create policy %I_insert_own on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', target, target);
    execute format('create policy %I_update_own on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', target, target);
    execute format('create policy %I_delete_own on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', target, target);
  end loop;
end $$;

-- Sensitive and append-oriented tables intentionally have no authenticated
-- policy: calendar_connections, calendar_sync_states, approvals, oauth_states,
-- opportunity_source_records, notification_deliveries, audit_events,
-- mutation_history, job_runs.

revoke all on public.calendar_connections from anon, authenticated;
revoke all on public.calendar_sync_states from anon, authenticated;
revoke all on public.oauth_states from anon, authenticated;
revoke all on public.audit_events from anon, authenticated;
revoke all on public.mutation_history from anon, authenticated;
revoke all on public.job_runs from anon, authenticated;
revoke all on public.opportunity_source_records from anon, authenticated;
revoke all on public.notification_deliveries from anon, authenticated;

-- `approvals` is readable by its owner (the approvals screen) but only server
-- code may create or decide one, so no insert/update/delete policy exists.
grant select on public.approvals to authenticated;
drop policy if exists approvals_select_own on public.approvals;
create policy approvals_select_own on public.approvals for select to authenticated using ((select auth.uid()) = user_id);

-- The anon role must not read any application data.
do $$
declare
  target text;
begin
  foreach target in array array[
    'profiles','user_preferences','life_areas','inbox_items','goals','projects','tasks','task_dependencies',
    'routines','routine_occurrences','task_completion_events','availability_rules','energy_checkins','capacity_profiles',
    'external_calendars','external_events','task_event_links','daily_plans','daily_plan_items','priority_snapshots',
    'schedule_proposals','schedule_proposal_items','approvals','missed_commitments','recovery_plans','recovery_options',
    'recovery_selections','rooms','home_items','cleaning_zones','maintenance_records','room_use_options',
    'fitness_profiles','workout_templates','workout_sessions','learning_sessions','trips','trip_items',
    'opportunity_sources','opportunities','opportunity_decisions','notification_preferences','notifications',
    'weekly_reviews','decisions','rolling_state_snapshots'
  ]
  loop
    execute format('revoke all on public.%I from anon', target);
  end loop;
end $$;
