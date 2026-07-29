-- Slice 3: inbox, goals, projects, tasks, dependencies, routines, completions.

create table if not exists public.inbox_items (
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

create table if not exists public.goals (
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

create table if not exists public.projects (
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

create table if not exists public.tasks (
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

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'projects_next_action_fk'
  ) then
    alter table public.projects
      add constraint projects_next_action_fk
      foreign key (next_action_task_id) references public.tasks(id) on delete set null;
  end if;
end $$;

create table if not exists public.task_dependencies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  depends_on_task_id uuid not null references public.tasks(id) on delete cascade,
  dependency_type text not null default 'finish_to_start' check (dependency_type in ('finish_to_start','resource','information','approval')),
  created_at timestamptz not null default now(),
  constraint task_dependency_no_self check (task_id <> depends_on_task_id),
  unique (task_id, depends_on_task_id, dependency_type)
);

create table if not exists public.routines (
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

create table if not exists public.routine_occurrences (
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

create table if not exists public.task_completion_events (
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
