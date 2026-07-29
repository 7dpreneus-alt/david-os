-- Slice 15: safe read helpers and views.
--
-- All views use security_invoker so that the querying user's RLS policies
-- apply. A view that bypassed RLS would be an authorization hole.

-- True when a task has at least one incomplete finish_to_start dependency.
create or replace function public.task_is_blocked(p_task_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.task_dependencies d
    join public.tasks blocker on blocker.id = d.depends_on_task_id
    where d.task_id = p_task_id
      and d.dependency_type = 'finish_to_start'
      and blocker.deleted_at is null
      and blocker.status not in ('completed','canceled','archived')
  );
$$;

-- Projects with their next-action state. `stalled` means an active project has
-- no viable next action (ACCEPTANCE_CRITERIA.md "Inbox and registry").
create or replace view public.project_health with (security_invoker = true) as
select
  p.id,
  p.user_id,
  p.title,
  p.status,
  p.next_action_task_id,
  (
    select count(*)
    from public.tasks t
    where t.project_id = p.id
      and t.deleted_at is null
      and t.status not in ('completed','canceled','archived')
  ) as open_task_count,
  (
    p.status = 'active'
    and not exists (
      select 1
      from public.tasks t
      where t.project_id = p.id
        and t.deleted_at is null
        and t.status in ('ready','planned','in_progress')
        and not public.task_is_blocked(t.id)
    )
  ) as is_stalled
from public.projects p
where p.deleted_at is null;

grant select on public.project_health to authenticated;
revoke all on public.project_health from anon;
