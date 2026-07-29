-- Personal Mission Control OS
-- PostgreSQL / Supabase baseline schema
-- Architecture date: 2026-07-28
-- Apply through timestamped Supabase migrations. Do not run unreviewed against production.

begin;

create extension if not exists pgcrypto with schema extensions;

create type public.source_type as enum ('user','calendar','starter','provider','derived','system');
create type public.verification_status as enum ('unverified','user_confirmed','provider_confirmed','conflicting','expired','invalid');
create type public.inbox_item_type as enum ('task','idea','purchase','errand','event','goal','opportunity','note','problem','habit','trip_requirement','unknown');
create type public.task_status as enum ('inbox','ready','planned','in_progress','blocked','missed','completed','canceled','archived');
create type public.project_status as enum ('proposed','active','paused','completed','canceled','archived');
create type public.energy_level as enum ('very_low','low','normal','high','very_high');
create type public.energy_requirement as enum ('low','medium','high','any');
create type public.flexibility_level as enum ('fixed','low','medium','high');
create type public.completion_type as enum ('full','minimum_viable','partial','delegated','canceled','intentional_skip');
create type public.approval_status as enum ('pending','approved','rejected','expired','canceled');
create type public.proposal_status as enum ('draft','ready_for_approval','approved','executing','executed','rejected','expired','stale','failed','canceled');
create type public.connection_status as enum ('pending','connected','degraded','reconnect_required','disconnected');
create type public.sync_status as enum ('never','queued','running','succeeded','partial','failed','stale');
create type public.recovery_root_cause as enum ('avoidance','bad_estimate','unexpected_interruption','low_energy','missing_resource','calendar_conflict','financial_constraint','deliberate_reprioritization','travel_or_location','provider_or_system_failure','health_or_safety_constraint','unknown');
create type public.recovery_option_type as enum ('full_today','equivalent_substitute','minimum_viable','move_within_window','split','intentional_skip','clarify_or_block');
create type public.notification_urgency as enum ('critical','high','normal','low');
create type public.notification_state as enum ('pending','delivered','acknowledged','snoozed','suppressed','failed','expired');
create type public.opportunity_recommendation as enum ('pursue','review','watch','dismiss');
create type public.opportunity_decision_type as enum ('pursue','review','watch','dismiss');
create type public.job_state as enum ('queued','leased','running','succeeded','retry_wait','failed','dead_letter','canceled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  home_timezone text not null default 'America/New_York',
  locale text not null default 'en-US',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_timezone_nonempty check (length(trim(home_timezone)) > 0)
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  planning_horizon_days smallint not null default 14 check (planning_horizon_days between 1 and 90),
  default_transition_minutes smallint not null default 10 check (default_transition_minutes between 0 and 180),
  default_travel_buffer_minutes smallint not null default 20 check (default_travel_buffer_minutes between 0 and 240),
  contingency_percent smallint not null default 15 check (contingency_percent between 0 and 50),
  hard_daily_load_percent smallint not null default 110 check (hard_daily_load_percent between 80 and 150),
  quiet_hours_start time,
  quiet_hours_end time,
  daily_notification_cap smallint not null default 6 check (daily_notification_cap between 0 and 50),
  starter_data_installed_at timestamptz,
  starter_data_removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.life_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  is_protected boolean not null default false,
  sort_order smallint not null default 0,
  source public.source_type not null default 'user',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_text text not null check (length(trim(raw_text)) > 0),
  item_type public.inbox_item_type not null default 'unknown',
  suggested_type public.inbox_item_type,
  classification_confidence numeric(4,3) check (classification_confidence between 0 and 1),
  suggested_fields jsonb not null default '{}'::jsonb,
  duplicate_candidates jsonb not null default '[]'::jsonb,
  conversion_entity_type text,
  conversion_entity_id uuid,
  resolved_at timestamptz,
  source public.source_type not null default 'user',
  client_capture_id uuid,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_capture_id)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  life_area_id uuid references public.life_areas(id) on delete set null,
  title text not null,
  description text,
  target_date date,
  is_protected boolean not null default false,
  status text not null default 'active' check (status in ('active','paused','completed','canceled','archived')),
  source public.source_type not null default 'user',
  verification_status public.verification_status not null default 'user_confirmed',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  life_area_id uuid references public.life_areas(id) on delete set null,
  title text not null,
  outcome text not null,
  status public.project_status not null default 'proposed',
  target_date date,
  budget_cents bigint check (budget_cents is null or budget_cents >= 0),
  currency_code char(3) not null default 'USD',
  next_action_task_id uuid,
  source public.source_type not null default 'user',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  life_area_id uuid references public.life_areas(id) on delete set null,
  parent_task_id uuid references public.tasks(id) on delete set null,
  title text not null,
  description text,
  status public.task_status not null default 'ready',
  manual_priority smallint check (manual_priority between 0 and 100),
  manual_priority_expires_at timestamptz,
  due_at timestamptz,
  due_timezone text,
  preferred_date date,
  earliest_start_at timestamptz,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes between 1 and 2880),
  minimum_minutes integer check (minimum_minutes is null or minimum_minutes between 1 and 1440),
  energy_requirement public.energy_requirement not null default 'any',
  location_label text,
  cost_cents bigint check (cost_cents is null or cost_cents >= 0),
  currency_code char(3) not null default 'USD',
  consequence_level smallint not null default 25 check (consequence_level between 0 and 100),
  consequence_reason text,
  flexibility public.flexibility_level not null default 'medium',
  minimum_viable_definition text,
  recovery_window_hours integer check (recovery_window_hours is null or recovery_window_hours between 0 and 2160),
  definition_of_done text,
  recurrence_rule text,
  source public.source_type not null default 'user',
  source_ref text,
  confidence numeric(4,3) not null default 1 check (confidence between 0 and 1),
  verification_status public.verification_status not null default 'user_confirmed',
  last_progress_at timestamptz,
  completed_at timestamptz,
  version integer not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_min_not_gt_est check (minimum_minutes is null or estimated_minutes is null or minimum_minutes <= estimated_minutes)
);

alter table public.projects
  add constraint projects_next_action_fk
  foreign key (next_action_task_id) references public.tasks(id) on delete set null;

create table public.task_dependencies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  depends_on_task_id uuid not null references public.tasks(id) on delete cascade,
  dependency_type text not null default 'finish_to_start' check (dependency_type in ('finish_to_start','resource','information','approval')),
  created_at timestamptz not null default now(),
  constraint task_dependency_no_self check (task_id <> depends_on_task_id),
  unique (task_id, depends_on_task_id, dependency_type)
);

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  life_area_id uuid references public.life_areas(id) on delete set null,
  title text not null,
  recurrence_rule text not null,
  target_frequency_per_week smallint check (target_frequency_per_week is null or target_frequency_per_week between 1 and 21),
  default_estimated_minutes integer check (default_estimated_minutes between 1 and 1440),
  minimum_minutes integer check (minimum_minutes is null or minimum_minutes between 1 and 1440),
  recovery_window_hours integer check (recovery_window_hours is null or recovery_window_hours between 0 and 720),
  protected boolean not null default false,
  active boolean not null default true,
  source public.source_type not null default 'user',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.routine_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  local_date date not null,
  planned_start_at timestamptz,
  state text not null default 'planned' check (state in ('planned','completed','missed','skipped','canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (routine_id, local_date)
);

create table public.task_completion_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  completion_type public.completion_type not null,
  actual_minutes integer check (actual_minutes is null or actual_minutes between 0 and 2880),
  evidence jsonb not null default '{}'::jsonb,
  note text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  weekday smallint check (weekday between 0 and 6),
  starts_local time,
  ends_local time,
  timezone text not null default 'America/New_York',
  rule_type text not null check (rule_type in ('available','unavailable','protected_rest','meal','commute')),
  effective_from date,
  effective_to date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_time_order check (starts_local is null or ends_local is null or starts_local <> ends_local)
);

create table public.energy_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  level public.energy_level not null,
  reason text,
  valid_until timestamptz,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.capacity_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weekday_capacity_minutes integer not null default 180 check (weekday_capacity_minutes between 0 and 960),
  weekend_capacity_minutes integer not null default 300 check (weekend_capacity_minutes between 0 and 1200),
  max_high_energy_minutes integer not null default 120 check (max_high_energy_minutes between 0 and 600),
  max_context_switches smallint not null default 6 check (max_context_switches between 0 and 30),
  learned_suggestion jsonb not null default '{}'::jsonb,
  suggestion_status text not null default 'none' check (suggestion_status in ('none','pending','accepted','rejected')),
  updated_at timestamptz not null default now()
);

create table public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'google' check (provider = 'google'),
  provider_subject text not null,
  provider_email_masked text,
  granted_scopes text[] not null default '{}',
  encrypted_access_token bytea,
  encrypted_refresh_token bytea,
  token_expires_at timestamptz,
  encryption_key_version smallint,
  status public.connection_status not null default 'pending',
  last_refresh_error_code text,
  disconnected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_subject)
);

create table public.external_calendars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.calendar_connections(id) on delete cascade,
  provider_calendar_id text not null,
  summary text not null,
  timezone text,
  access_role text,
  is_primary boolean not null default false,
  is_selected boolean not null default false,
  is_write_target boolean not null default false,
  sync_paused boolean not null default false,
  color_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, provider_calendar_id)
);

create table public.calendar_sync_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  external_calendar_id uuid not null references public.external_calendars(id) on delete cascade,
  sync_token text,
  query_shape_hash text,
  status public.sync_status not null default 'never',
  lease_owner text,
  lease_expires_at timestamptz,
  last_started_at timestamptz,
  last_succeeded_at timestamptz,
  last_error_code text,
  last_error_summary text,
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  updated_at timestamptz not null default now(),
  unique (external_calendar_id)
);

create table public.external_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  external_calendar_id uuid not null references public.external_calendars(id) on delete cascade,
  provider_event_id text not null,
  recurrence_instance_key text not null default '',
  etag text,
  provider_updated_at timestamptz,
  status text,
  summary text,
  description text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  start_date date,
  end_date_exclusive date,
  event_timezone text,
  is_all_day boolean not null default false,
  is_busy boolean not null default true,
  recurring_master_id text,
  original_start_at timestamptz,
  recurrence_rules text[] not null default '{}',
  private_operation_id uuid,
  is_deleted boolean not null default false,
  deleted_at_provider timestamptz,
  payload_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, external_calendar_id, provider_event_id, recurrence_instance_key),
  constraint external_event_time_shape check (
    (is_all_day and start_date is not null and end_date_exclusive is not null)
    or
    (not is_all_day and starts_at is not null and ends_at is not null and ends_at > starts_at)
  )
);

create table public.task_event_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  external_event_id uuid not null references public.external_events(id) on delete cascade,
  link_type text not null default 'scheduled_as' check (link_type in ('scheduled_as','related_to','created_from')),
  event_is_flexible boolean not null default false,
  created_at timestamptz not null default now(),
  unique (task_id, external_event_id, link_type)
);

create table public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  timezone text not null,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft','active','superseded','closed')),
  energy_checkin_id uuid references public.energy_checkins(id) on delete set null,
  generated_reason text,
  capacity_minutes integer not null default 0 check (capacity_minutes >= 0),
  committed_minutes integer not null default 0 check (committed_minutes >= 0),
  contingency_minutes integer not null default 0 check (contingency_minutes >= 0),
  engine_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_date, version)
);

create table public.daily_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_plan_id uuid not null references public.daily_plans(id) on delete cascade,
  item_type text not null check (item_type in ('external_event','task','buffer','travel','rest','open_window')),
  task_id uuid references public.tasks(id) on delete set null,
  external_event_id uuid references public.external_events(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_fixed boolean not null default false,
  dominant_priority_rank smallint check (dominant_priority_rank between 1 and 3),
  reason text,
  created_at timestamptz not null default now(),
  constraint daily_plan_item_time_order check (ends_at > starts_at)
);

create table public.priority_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  context_key text not null,
  final_score numeric(5,2) not null check (final_score between 0 and 100),
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  rank integer,
  component_scores jsonb not null,
  hard_filters jsonb not null default '[]'::jsonb,
  explanation text not null,
  engine_version text not null,
  generated_at timestamptz not null default now()
);

create table public.schedule_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.proposal_status not null default 'draft',
  proposal_type text not null check (proposal_type in ('internal_plan','calendar_create','calendar_update','calendar_move','calendar_split','calendar_delete')),
  reason text not null,
  provider_state_hash text,
  expires_at timestamptz,
  engine_version text not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table public.schedule_proposal_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  proposal_id uuid not null references public.schedule_proposals(id) on delete cascade,
  operation text not null check (operation in ('create','update','move','split','delete','internal_schedule')),
  task_id uuid references public.tasks(id) on delete set null,
  external_event_id uuid references public.external_events(id) on delete set null,
  target_external_calendar_id uuid references public.external_calendars(id) on delete set null,
  before_state jsonb,
  after_state jsonb not null,
  displaced_entities jsonb not null default '[]'::jsonb,
  conflicts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  proposal_id uuid not null references public.schedule_proposals(id) on delete cascade,
  status public.approval_status not null default 'pending',
  decision_reason text,
  decided_at timestamptz,
  proposal_hash text not null,
  created_at timestamptz not null default now()
);

create table public.missed_commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  daily_plan_item_id uuid references public.daily_plan_items(id) on delete set null,
  planned_start_at timestamptz,
  planned_end_at timestamptz,
  detected_at timestamptz not null default now(),
  detection_source text not null check (detection_source in ('automatic','user','calendar_displacement','system')),
  root_cause public.recovery_root_cause not null default 'unknown',
  root_cause_note text,
  confirmed boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (task_id, planned_start_at, planned_end_at)
);

create table public.recovery_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  missed_commitment_id uuid not null references public.missed_commitments(id) on delete cascade,
  input_snapshot jsonb not null,
  status text not null default 'active' check (status in ('active','selected','expired','superseded','no_feasible_option')),
  engine_version text not null,
  generated_at timestamptz not null default now()
);

create table public.recovery_options (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recovery_plan_id uuid not null references public.recovery_plans(id) on delete cascade,
  option_type public.recovery_option_type not null,
  rank smallint not null check (rank > 0),
  score numeric(5,2) check (score between 0 and 100),
  feasible boolean not null,
  title text not null,
  explanation text not null,
  proposed_changes jsonb not null,
  displaced_work jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (recovery_plan_id, rank)
);

create table public.recovery_selections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recovery_plan_id uuid not null references public.recovery_plans(id) on delete cascade,
  recovery_option_id uuid not null references public.recovery_options(id) on delete restrict,
  schedule_proposal_id uuid references public.schedule_proposals(id) on delete set null,
  selected_at timestamptz not null default now(),
  unique (recovery_plan_id)
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  room_type text,
  current_use text,
  desired_state text,
  source public.source_type not null default 'user',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.home_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  name text not null,
  item_type text not null check (item_type in ('owned','supply','furnishing','appliance','purchase_candidate','declutter_candidate')),
  status text not null default 'active',
  priority smallint check (priority between 0 and 100),
  estimated_cost_cents bigint check (estimated_cost_cents is null or estimated_cost_cents >= 0),
  currency_code char(3) not null default 'USD',
  need_by_date date,
  definition_of_done text,
  source public.source_type not null default 'user',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cleaning_zones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  definition_of_done text not null,
  default_minutes integer not null check (default_minutes between 1 and 480),
  minimum_minutes integer check (minimum_minutes is null or minimum_minutes between 1 and 240),
  required_supplies text[] not null default '{}',
  recurrence_rule text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  title text not null,
  concern_type text not null,
  status text not null default 'open' check (status in ('open','monitoring','request_drafted','request_sent','scheduled','resolved','closed')),
  severity smallint not null default 25 check (severity between 0 and 100),
  observed_at timestamptz,
  next_follow_up_at timestamptz,
  history jsonb not null default '[]'::jsonb,
  landlord_request_status text,
  source public.source_type not null default 'user',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.room_use_options (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  estimated_cost_cents bigint check (estimated_cost_cents is null or estimated_cost_cents >= 0),
  income_potential_score smallint check (income_potential_score between 0 and 100),
  privacy_score smallint check (privacy_score between 0 and 100),
  lifestyle_benefit_score smallint check (lifestyle_benefit_score between 0 and 100),
  setup_effort_score smallint check (setup_effort_score between 0 and 100),
  flexibility_score smallint check (flexibility_score between 0 and 100),
  reversibility_score smallint check (reversibility_score between 0 and 100),
  assumptions jsonb not null default '{}'::jsonb,
  weighted_score numeric(5,2),
  selected boolean not null default false,
  revisit_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, name)
);

create table public.fitness_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weekly_frequency_target smallint not null default 3 check (weekly_frequency_target between 0 and 14),
  default_gym_travel_minutes smallint not null default 20 check (default_gym_travel_minutes between 0 and 180),
  protected_window_rules jsonb not null default '[]'::jsonb,
  equipment jsonb not null default '[]'::jsonb,
  scheduling_constraints text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  location_type text not null check (location_type in ('gym','home','outdoor','other')),
  workout_type text,
  estimated_minutes integer not null check (estimated_minutes between 1 and 240),
  minimum_minutes integer check (minimum_minutes is null or minimum_minutes between 1 and 120),
  equipment jsonb not null default '[]'::jsonb,
  approved_structure jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  source public.source_type not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null unique references public.tasks(id) on delete cascade,
  workout_template_id uuid references public.workout_templates(id) on delete set null,
  planned_location_type text,
  weekly_target_week date,
  session_state text not null default 'planned' check (session_state in ('planned','completed_full','completed_minimum','missed','skipped','canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null unique references public.tasks(id) on delete cascade,
  topic text not null,
  source_name text not null,
  source_reference text,
  objective text not null,
  practice_activity text not null,
  completion_evidence text not null,
  next_action text,
  review_date date,
  session_state text not null default 'planned' check (session_state in ('planned','in_progress','completed','missed','canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_objective_not_vague check (length(trim(objective)) >= 12)
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  destination text,
  trip_timezone text,
  starts_on date,
  ends_on date,
  date_verification public.verification_status not null default 'unverified',
  booking_status text not null default 'unknown',
  budget_cents bigint check (budget_cents is null or budget_cents >= 0),
  currency_code char(3) not null default 'USD',
  readiness_status text not null default 'unknown' check (readiness_status in ('unknown','not_started','in_progress','blocked','ready','completed')),
  source public.source_type not null default 'user',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_date_order check (starts_on is null or ends_on is null or ends_on >= starts_on)
);

create table public.trip_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  item_type text not null check (item_type in ('booking','lodging','transportation','event','packing','outfit','purchase','document','deadline','confirmation','return_reset')),
  title text not null,
  status text not null default 'not_started',
  due_at timestamptz,
  estimated_cost_cents bigint check (estimated_cost_cents is null or estimated_cost_cents >= 0),
  currency_code char(3) not null default 'USD',
  verification_status public.verification_status not null default 'unverified',
  masked_confirmation text,
  encrypted_detail bytea,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunity_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  source_type text not null check (source_type in ('official_api','partner_api','official_feed','user_source','search_provider','manual_review')),
  terms_reviewed_at timestamptz,
  authorized boolean not null default false,
  status text not null default 'disabled' check (status in ('disabled','sandbox','active','degraded','blocked')),
  policy_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  title text not null,
  summary text,
  sponsor text,
  source_url text,
  retrieved_at timestamptz not null,
  verification_status public.verification_status not null default 'unverified',
  eligibility jsonb not null default '{}'::jsonb,
  deadline_at timestamptz,
  deadline_timezone text,
  estimated_cost_cents bigint check (estimated_cost_cents is null or estimated_cost_cents >= 0),
  expected_value_cents bigint,
  currency_code char(3) not null default 'USD',
  effort_minutes integer check (effort_minutes is null or effort_minutes >= 0),
  calendar_compatibility smallint check (calendar_compatibility between 0 and 100),
  financial_compatibility smallint check (financial_compatibility between 0 and 100),
  fit_score numeric(5,2) check (fit_score between 0 and 100),
  confidence numeric(4,3) not null default 0 check (confidence between 0 and 1),
  duplicate_cluster_id uuid,
  expires_at timestamptz,
  recommendation public.opportunity_recommendation,
  reasoning text,
  content_hash text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunity_source_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  source_id uuid not null references public.opportunity_sources(id) on delete cascade,
  provider_record_id text,
  canonical_reference text,
  content_hash text not null,
  normalized_payload jsonb not null,
  retrieved_at timestamptz not null,
  unique (source_id, provider_record_id, content_hash)
);

create table public.opportunity_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  decision public.opportunity_decision_type not null,
  reason text,
  follow_up_at timestamptz,
  decided_at timestamptz not null default now()
);

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  in_app_enabled boolean not null default true,
  browser_enabled boolean not null default false,
  email_enabled boolean not null default false,
  minimum_urgency public.notification_urgency not null default 'normal',
  quiet_hours_override boolean not null default false,
  digest_mode text not null default 'immediate' check (digest_mode in ('immediate','daily','weekly','silenced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  urgency public.notification_urgency not null,
  state public.notification_state not null default 'pending',
  title text not null,
  body text not null,
  action_type text,
  action_entity_id uuid,
  dedupe_key text not null,
  deliver_after timestamptz not null default now(),
  expires_at timestamptz,
  snoozed_until timestamptz,
  acknowledged_at timestamptz,
  suppression_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  channel text not null check (channel in ('in_app','browser','email')),
  attempt smallint not null default 1,
  status text not null check (status in ('queued','sent','delivered','failed','suppressed')),
  provider_message_id text,
  provider_status_code text,
  error_summary text,
  attempted_at timestamptz not null default now(),
  unique (notification_id, channel, attempt)
);

create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  timezone text not null,
  status text not null default 'draft' check (status in ('draft','reviewed','approved','archived')),
  metrics jsonb not null,
  wins jsonb not null default '[]'::jsonb,
  misses jsonb not null default '[]'::jsonb,
  patterns jsonb not null default '[]'::jsonb,
  next_week_priorities jsonb not null default '[]'::jsonb,
  stop_doing jsonb not null default '[]'::jsonb,
  pending_decisions jsonb not null default '[]'::jsonb,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  decision text not null,
  context text not null,
  alternatives jsonb not null default '[]'::jsonb,
  reason text not null,
  expected_outcome text,
  actual_outcome text,
  revisit_on date,
  linked_entity_type text,
  linked_entity_id uuid,
  decided_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  actor_type text not null check (actor_type in ('user','system','job','provider')),
  event_type text not null,
  entity_type text,
  entity_id uuid,
  correlation_id uuid not null,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table public.mutation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  before_state jsonb,
  after_state jsonb,
  inverse_operation jsonb,
  reversible_until timestamptz,
  undone_at timestamptz,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table public.job_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  job_type text not null,
  subject_type text,
  subject_id uuid,
  scheduled_bucket text,
  idempotency_key text not null,
  payload_hash text,
  state public.job_state not null default 'queued',
  lease_owner text,
  lease_expires_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz,
  result_summary jsonb,
  last_error_code text,
  last_error_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_type, idempotency_key)
);

create table public.rolling_state_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  schema_version text not null,
  as_of timestamptz not null,
  source_freshness jsonb not null,
  state_json jsonb not null,
  state_markdown text not null,
  created_at timestamptz not null default now()
);

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

-- Attach updated_at trigger only to tables with an updated_at column.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles','user_preferences','life_areas','inbox_items','goals','projects','tasks','routines',
    'routine_occurrences','availability_rules','capacity_profiles','calendar_connections','external_calendars',
    'calendar_sync_states','external_events','daily_plans','schedule_proposals','rooms','home_items',
    'cleaning_zones','maintenance_records','room_use_options','fitness_profiles','workout_templates',
    'workout_sessions','learning_sessions','trips','trip_items','opportunity_sources','opportunities',
    'notification_preferences','notifications','weekly_reviews','decisions','job_runs'
  ]
  loop
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

-- Indexes for daily operations and provider reconciliation.
create index tasks_user_status_due_idx on public.tasks(user_id, status, due_at) where deleted_at is null;
create index tasks_user_preferred_date_idx on public.tasks(user_id, preferred_date) where deleted_at is null;
create index projects_user_status_idx on public.projects(user_id, status) where deleted_at is null;
create index inbox_user_unresolved_idx on public.inbox_items(user_id, created_at desc) where resolved_at is null and deleted_at is null;
create index external_events_calendar_time_idx on public.external_events(external_calendar_id, starts_at, ends_at) where is_deleted = false;
create index external_events_user_date_idx on public.external_events(user_id, start_date, end_date_exclusive) where is_deleted = false;
create index priority_context_rank_idx on public.priority_snapshots(user_id, context_key, rank, generated_at desc);
create index proposals_user_status_idx on public.schedule_proposals(user_id, status, created_at desc);
create index recovery_active_idx on public.recovery_plans(user_id, status, generated_at desc);
create index notifications_delivery_idx on public.notifications(user_id, state, deliver_after, urgency);
create index opportunities_active_idx on public.opportunities(user_id, category, verification_status, expires_at) where deleted_at is null;
create index job_runs_claim_idx on public.job_runs(state, next_attempt_at, lease_expires_at);
create index audit_user_time_idx on public.audit_events(user_id, occurred_at desc);

-- Row-level security.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles','user_preferences','life_areas','inbox_items','goals','projects','tasks','task_dependencies',
    'routines','routine_occurrences','task_completion_events','availability_rules','energy_checkins','capacity_profiles',
    'calendar_connections','external_calendars','calendar_sync_states','external_events','task_event_links','daily_plans',
    'daily_plan_items','priority_snapshots','schedule_proposals','schedule_proposal_items','approvals','missed_commitments',
    'recovery_plans','recovery_options','recovery_selections','rooms','home_items','cleaning_zones','maintenance_records',
    'room_use_options','fitness_profiles','workout_templates','workout_sessions','learning_sessions','trips','trip_items',
    'opportunity_sources','opportunities','opportunity_source_records','opportunity_decisions','notification_preferences',
    'notifications','notification_deliveries','weekly_reviews','decisions','audit_events','mutation_history','job_runs',
    'rolling_state_snapshots'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

-- Profile uses id as owner key.
create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy profiles_delete_own on public.profiles for delete to authenticated using ((select auth.uid()) = id);

-- Normal user-owned tables. Server routes still enforce domain rules and version checks.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
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
    execute format('create policy %I_select_own on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name, table_name);
    execute format('create policy %I_insert_own on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name, table_name);
    execute format('create policy %I_update_own on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name, table_name);
    execute format('create policy %I_delete_own on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name, table_name);
  end loop;
end $$;

-- Sensitive and append-oriented tables intentionally have no direct authenticated policies:
-- calendar_connections, calendar_sync_states, approvals, opportunity_source_records,
-- notification_deliveries, audit_events, mutation_history, and job_runs.
-- They are accessed through authenticated server services with explicit user scoping.

-- Ensure internal schemas are not accidentally exposed through default grants.
revoke all on public.calendar_connections from anon;
revoke all on public.calendar_sync_states from anon;
revoke all on public.approvals from anon;
revoke all on public.audit_events from anon;
revoke all on public.mutation_history from anon;
revoke all on public.job_runs from anon;

commit;
