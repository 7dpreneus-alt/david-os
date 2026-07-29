-- Slice 6: daily plans, priority snapshots, schedule proposals, approvals.

create table if not exists public.daily_plans (
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

create table if not exists public.daily_plan_items (
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

create table if not exists public.priority_snapshots (
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

create table if not exists public.schedule_proposals (
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

create table if not exists public.schedule_proposal_items (
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

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  proposal_id uuid not null references public.schedule_proposals(id) on delete cascade,
  status public.approval_status not null default 'pending',
  decision_reason text,
  decided_at timestamptz,
  proposal_hash text not null,
  created_at timestamptz not null default now()
);
