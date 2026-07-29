-- Slice 5: calendar connections, calendars, sync state, event mirror, links.

create table if not exists public.calendar_connections (
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

comment on table public.calendar_connections is
  'Holds encrypted OAuth material. RLS is enabled with no authenticated policy: only server services using the service role may read it.';

create table if not exists public.external_calendars (
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

create table if not exists public.calendar_sync_states (
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

create table if not exists public.external_events (
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

create table if not exists public.task_event_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  external_event_id uuid not null references public.external_events(id) on delete cascade,
  link_type text not null default 'scheduled_as' check (link_type in ('scheduled_as','related_to','created_from')),
  event_is_flexible boolean not null default false,
  created_at timestamptz not null default now(),
  unique (task_id, external_event_id, link_type)
);

-- OAuth state is single-use and short-lived (SECURITY_AND_PRIVACY.md §12).
-- Not part of the architecture baseline; added because the callback route needs
-- server-side replay protection that a cookie alone cannot provide.
create table if not exists public.oauth_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state_hash text not null unique,
  code_verifier_encrypted bytea not null,
  encryption_key_version smallint not null,
  return_path text not null default '/settings/calendar',
  consumed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
