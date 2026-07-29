-- Slice 10: travel.

create table if not exists public.trips (
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

create table if not exists public.trip_items (
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

comment on column public.trip_items.masked_confirmation is
  'Only the masked form is stored in plain columns; full confirmations belong in encrypted_detail (SECURITY_AND_PRIVACY.md §7).';
