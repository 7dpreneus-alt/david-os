import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { listProjects, listTasks } from '@/domain/tasks/repository';
import { taskListQuerySchema } from '@/domain/tasks/schemas';
import { Badge, Card, EmptyState } from '@/components/ui/primitives';
import { TaskComposer } from '@/components/tasks/task-composer';
import { TaskFilters } from '@/components/tasks/task-filters';
import { TaskRow } from '@/components/tasks/task-row';

export const metadata: Metadata = { title: 'Tasks' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default async function TasksPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;

  const statusParam = first(params.status);
  const parsedQuery = taskListQuerySchema.safeParse({
    status: statusParam === undefined || statusParam === 'all' ? undefined : [statusParam],
    projectId: first(params.projectId),
    search: first(params.q),
    includeArchived: first(params.includeArchived) === 'true',
    sort: first(params.sort) ?? 'created_at',
    direction: first(params.direction) ?? 'desc',
    limit: 100,
    offset: 0,
  });

  // A malformed query string falls back to defaults rather than erroring out.
  const query = parsedQuery.success
    ? parsedQuery.data
    : taskListQuerySchema.parse({ limit: 100, offset: 0 });

  const [{ tasks, total }, projects] = await Promise.all([
    listTasks(user.id, query),
    listProjects(user.id),
  ]);

  const hasFilters =
    query.search !== undefined || statusParam !== undefined || query.projectId !== undefined;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Tasks</h1>
        <p className="mt-1 text-sm text-text-muted">
          The execution registry. Only a title is required; everything else raises how
          confidently the planner can schedule the work.
        </p>
      </header>

      <TaskComposer projects={projects.map((p) => ({ id: p.id, title: p.title }))} />

      <TaskFilters
        projects={projects.map((p) => ({ id: p.id, title: p.title }))}
        current={{
          status: statusParam ?? 'all',
          projectId: query.projectId ?? '',
          q: query.search ?? '',
          sort: query.sort,
          direction: query.direction,
          includeArchived: query.includeArchived,
        }}
      />

      <section aria-label="Task list" className="space-y-2">
        <p className="text-xs text-text-muted" role="status">
          {total === 0 ? 'No tasks match' : `${total} task${total === 1 ? '' : 's'}`}
          {hasFilters ? ' for these filters' : ''}
        </p>

        {tasks.length === 0 ? (
          hasFilters ? (
            <EmptyState
              title="Nothing matches these filters"
              description="Clear the search or status filter to see the rest of your tasks."
            />
          ) : (
            <EmptyState
              title="No tasks yet"
              description="Add your first task above. You can capture it with just a title and fill in duration, deadline, and definition of done later."
            />
          )
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id}>
                <TaskRow
                  task={task}
                  projects={projects.map((p) => ({ id: p.id, title: p.title }))}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {projects.some((project) => project.isStalled) && (
        <Card>
          <p className="text-sm">
            <Badge tone="warning">Stalled</Badge>{' '}
            {projects.filter((p) => p.isStalled).length} active project(s) have no viable
            next action.
          </p>
        </Card>
      )}
    </div>
  );
}
