-- Slice 4: availability, energy, capacity.

create table if not exists public.availability_rules (
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

create table if not exists public.energy_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  level public.energy_level not null,
  reason text,
  valid_until timestamptz,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.capacity_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weekday_capacity_minutes integer not null default 180 check (weekday_capacity_minutes between 0 and 960),
  weekend_capacity_minutes integer not null default 300 check (weekend_capacity_minutes between 0 and 1200),
  max_high_energy_minutes integer not null default 120 check (max_high_energy_minutes between 0 and 600),
  max_context_switches smallint not null default 6 check (max_context_switches between 0 and 30),
  learned_suggestion jsonb not null default '{}'::jsonb,
  suggestion_status text not null default 'none' check (suggestion_status in ('none','pending','accepted','rejected')),
  updated_at timestamptz not null default now()
);
