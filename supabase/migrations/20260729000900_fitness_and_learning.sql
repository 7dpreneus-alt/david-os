-- Slice 9: fitness and learning.

create table if not exists public.fitness_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weekly_frequency_target smallint not null default 3 check (weekly_frequency_target between 0 and 14),
  default_gym_travel_minutes smallint not null default 20 check (default_gym_travel_minutes between 0 and 180),
  protected_window_rules jsonb not null default '[]'::jsonb,
  equipment jsonb not null default '[]'::jsonb,
  scheduling_constraints text[] not null default '{}',
  updated_at timestamptz not null default now()
);

comment on table public.fitness_profiles is
  'Scheduling support only. The product does not diagnose injuries or prescribe rehabilitation (ACCEPTANCE_CRITERIA.md Fitness).';

create table if not exists public.workout_templates (
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

create table if not exists public.workout_sessions (
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

create table if not exists public.learning_sessions (
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
