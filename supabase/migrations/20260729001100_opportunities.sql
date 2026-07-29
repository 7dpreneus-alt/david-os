-- Slice 11: opportunities schema.
--
-- Phase 3 feature. The schema exists so that manual entry can be captured, but
-- FEATURE_OPPORTUNITY_RADAR defaults to false and no ingestion path exists.
-- Every source starts unauthorized and disabled.

create table if not exists public.opportunity_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  source_type text not null check (source_type in ('official_api','partner_api','official_feed','user_source','search_provider','manual_review')),
  terms_reviewed_at timestamptz,
  authorized boolean not null default false,
  status text not null default 'disabled' check (status in ('disabled','sandbox','active','degraded','blocked')),
  policy_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  title text not null,
  summary text,
  sponsor text,
  source_url text,
  retrieved_at timestamptz not null,
  verification_status public.verification_status not null default 'unverified',
  eligibility jsonb not null default '{}'::jsonb,
  deadline_at timestamptz,
  deadline_timezone text,
  estimated_cost_cents bigint check (estimated_cost_cents is null or estimated_cost_cents >= 0),
  expected_value_cents bigint,
  currency_code char(3) not null default 'USD',
  effort_minutes integer check (effort_minutes is null or effort_minutes >= 0),
  calendar_compatibility smallint check (calendar_compatibility between 0 and 100),
  financial_compatibility smallint check (financial_compatibility between 0 and 100),
  fit_score numeric(5,2) check (fit_score between 0 and 100),
  confidence numeric(4,3) not null default 0 check (confidence between 0 and 1),
  duplicate_cluster_id uuid,
  expires_at timestamptz,
  recommendation public.opportunity_recommendation,
  reasoning text,
  content_hash text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opportunity_source_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  source_id uuid not null references public.opportunity_sources(id) on delete cascade,
  provider_record_id text,
  canonical_reference text,
  content_hash text not null,
  normalized_payload jsonb not null,
  retrieved_at timestamptz not null,
  unique (source_id, provider_record_id, content_hash)
);

create table if not exists public.opportunity_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  decision public.opportunity_decision_type not null,
  reason text,
  follow_up_at timestamptz,
  decided_at timestamptz not null default now()
);
