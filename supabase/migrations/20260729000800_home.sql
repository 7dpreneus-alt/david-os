-- Slice 8: home operations.

create table if not exists public.rooms (
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

create table if not exists public.home_items (
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

create table if not exists public.cleaning_zones (
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

create table if not exists public.maintenance_records (
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

comment on table public.maintenance_records is
  'Tracks observations and follow-ups only. The product does not diagnose structural or medical conditions (ACCEPTANCE_CRITERIA.md Home).';

create table if not exists public.room_use_options (
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
