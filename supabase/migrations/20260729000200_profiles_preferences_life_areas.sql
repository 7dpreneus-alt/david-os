-- Slice 2: profiles, preferences, life areas.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  home_timezone text not null default 'America/New_York',
  locale text not null default 'en-US',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_timezone_nonempty check (length(trim(home_timezone)) > 0)
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  planning_horizon_days smallint not null default 14 check (planning_horizon_days between 1 and 90),
  default_transition_minutes smallint not null default 10 check (default_transition_minutes between 0 and 180),
  default_travel_buffer_minutes smallint not null default 20 check (default_travel_buffer_minutes between 0 and 240),
  contingency_percent smallint not null default 15 check (contingency_percent between 0 and 50),
  hard_daily_load_percent smallint not null default 110 check (hard_daily_load_percent between 80 and 150),
  quiet_hours_start time,
  quiet_hours_end time,
  daily_notification_cap smallint not null default 6 check (daily_notification_cap between 0 and 50),
  sync_event_descriptions boolean not null default false,
  starter_data_installed_at timestamptz,
  starter_data_removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.user_preferences.sync_event_descriptions is
  'SECURITY_AND_PRIVACY.md §7 data minimization: when false, calendar event descriptions are not mirrored.';

create table if not exists public.life_areas (
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
