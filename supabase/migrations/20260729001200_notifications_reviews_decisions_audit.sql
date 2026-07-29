-- Slice 12: notifications, reviews, decisions, audit, mutations, jobs, rolling state.

create table if not exists public.notification_preferences (
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

create table if not exists public.notifications (
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

create table if not exists public.notification_deliveries (
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

comment on table public.notification_deliveries is
  'A row here is written only from real provider results. In-app delivery is the only channel implemented in Phase 1.';

create table if not exists public.weekly_reviews (
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

create table if not exists public.decisions (
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

create table if not exists public.audit_events (
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

create table if not exists public.mutation_history (
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

create table if not exists public.job_runs (
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

create table if not exists public.rolling_state_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  schema_version text not null,
  as_of timestamptz not null,
  source_freshness jsonb not null,
  state_json jsonb not null,
  state_markdown text not null,
  created_at timestamptz not null default now()
);
