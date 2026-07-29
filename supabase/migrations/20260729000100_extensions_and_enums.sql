-- Slice 1: extensions and enums.
-- Source: docs/personal-mission-control-os/DATABASE_SCHEMA.sql

create extension if not exists pgcrypto with schema extensions;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'source_type') then
    create type public.source_type as enum ('user','calendar','starter','provider','derived','system');
  end if;
  if not exists (select 1 from pg_type where typname = 'verification_status') then
    create type public.verification_status as enum ('unverified','user_confirmed','provider_confirmed','conflicting','expired','invalid');
  end if;
  if not exists (select 1 from pg_type where typname = 'inbox_item_type') then
    create type public.inbox_item_type as enum ('task','idea','purchase','errand','event','goal','opportunity','note','problem','habit','trip_requirement','unknown');
  end if;
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type public.task_status as enum ('inbox','ready','planned','in_progress','blocked','missed','completed','canceled','archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'project_status') then
    create type public.project_status as enum ('proposed','active','paused','completed','canceled','archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'energy_level') then
    create type public.energy_level as enum ('very_low','low','normal','high','very_high');
  end if;
  if not exists (select 1 from pg_type where typname = 'energy_requirement') then
    create type public.energy_requirement as enum ('low','medium','high','any');
  end if;
  if not exists (select 1 from pg_type where typname = 'flexibility_level') then
    create type public.flexibility_level as enum ('fixed','low','medium','high');
  end if;
  if not exists (select 1 from pg_type where typname = 'completion_type') then
    create type public.completion_type as enum ('full','minimum_viable','partial','delegated','canceled','intentional_skip');
  end if;
  if not exists (select 1 from pg_type where typname = 'approval_status') then
    create type public.approval_status as enum ('pending','approved','rejected','expired','canceled');
  end if;
  if not exists (select 1 from pg_type where typname = 'proposal_status') then
    create type public.proposal_status as enum ('draft','ready_for_approval','approved','executing','executed','rejected','expired','stale','failed','canceled');
  end if;
  if not exists (select 1 from pg_type where typname = 'connection_status') then
    create type public.connection_status as enum ('pending','connected','degraded','reconnect_required','disconnected');
  end if;
  if not exists (select 1 from pg_type where typname = 'sync_status') then
    create type public.sync_status as enum ('never','queued','running','succeeded','partial','failed','stale');
  end if;
  if not exists (select 1 from pg_type where typname = 'recovery_root_cause') then
    create type public.recovery_root_cause as enum ('avoidance','bad_estimate','unexpected_interruption','low_energy','missing_resource','calendar_conflict','financial_constraint','deliberate_reprioritization','travel_or_location','provider_or_system_failure','health_or_safety_constraint','unknown');
  end if;
  if not exists (select 1 from pg_type where typname = 'recovery_option_type') then
    create type public.recovery_option_type as enum ('full_today','equivalent_substitute','minimum_viable','move_within_window','split','intentional_skip','clarify_or_block');
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_urgency') then
    create type public.notification_urgency as enum ('critical','high','normal','low');
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_state') then
    create type public.notification_state as enum ('pending','delivered','acknowledged','snoozed','suppressed','failed','expired');
  end if;
  if not exists (select 1 from pg_type where typname = 'opportunity_recommendation') then
    create type public.opportunity_recommendation as enum ('pursue','review','watch','dismiss');
  end if;
  if not exists (select 1 from pg_type where typname = 'opportunity_decision_type') then
    create type public.opportunity_decision_type as enum ('pursue','review','watch','dismiss');
  end if;
  if not exists (select 1 from pg_type where typname = 'job_state') then
    create type public.job_state as enum ('queued','leased','running','succeeded','retry_wait','failed','dead_letter','canceled');
  end if;
end $$;
