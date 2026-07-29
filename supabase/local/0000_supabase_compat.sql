-- Supabase compatibility layer for a plain PostgreSQL server.
--
-- Applied ONLY to local/CI databases by scripts/local-postgres.ts and
-- scripts/apply-migrations.ts. A hosted Supabase project already provides all
-- of this; running it there would fail on existing roles.
--
-- It reproduces the parts of Supabase that the application schema depends on:
--   * the `auth` schema and `auth.users` table
--   * the `anon`, `authenticated`, and `service_role` roles
--   * `auth.uid()` / `auth.jwt()` reading from the `request.jwt.claims` GUC
--   * default privileges so RLS (not missing GRANTs) is what blocks access
--
-- Keeping the shape identical is what makes local RLS tests meaningful.

create schema if not exists extensions;
create schema if not exists auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;

-- Minimal stand-in for Supabase GoTrue's identity table. Only the columns the
-- application and its foreign keys rely on are reproduced.
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  encrypted_password text,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );
$$;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select auth.jwt() ->> 'role';
$$;

grant execute on function auth.uid(), auth.jwt(), auth.role()
  to anon, authenticated, service_role;

-- Supabase grants table privileges to anon/authenticated by default; RLS is the
-- thing that restricts rows. Reproduce that so a missing GRANT never masks a
-- missing policy in tests.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
