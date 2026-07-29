-- Slice 7: missed commitments and recovery.

create table if not exists public.missed_commitments (
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

create table if not exists public.recovery_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  missed_commitment_id uuid not null references public.missed_commitments(id) on delete cascade,
  input_snapshot jsonb not null,
  status text not null default 'active' check (status in ('active','selected','expired','superseded','no_feasible_option')),
  engine_version text not null,
  generated_at timestamptz not null default now()
);

create table if not exists public.recovery_options (
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

create table if not exists public.recovery_selections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recovery_plan_id uuid not null references public.recovery_plans(id) on delete cascade,
  recovery_option_id uuid not null references public.recovery_options(id) on delete restrict,
  schedule_proposal_id uuid references public.schedule_proposals(id) on delete set null,
  selected_at timestamptz not null default now(),
  unique (recovery_plan_id)
);
