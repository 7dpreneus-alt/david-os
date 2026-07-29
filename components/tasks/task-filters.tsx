'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useId, useTransition } from 'react';
import { Button, Card, Field, Input, Select } from '@/components/ui/primitives';

/**
 * Filter, search, and sort. State lives in the URL so a filtered view is
 * shareable and survives reload.
 */
export function TaskFilters({
  projects,
  current,
}: {
  projects: Array<{ id: string; title: string }>;
  current: {
    status: string;
    projectId: string;
    q: string;
    sort: string;
    direction: string;
    includeArchived: boolean;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const baseId = useId();

  function apply(next: Partial<Record<string, string>>): void {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === '' || value === 'all' || value === 'false') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    startTransition(() => router.push(`/tasks?${params.toString()}`));
  }

  const hasFilters =
    current.status !== 'all' ||
    current.projectId !== '' ||
    current.q !== '' ||
    current.includeArchived;

  return (
    <Card>
      <form
        role="search"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          apply({ q: String(data.get('q') ?? '') });
        }}
      >
        <div className="sm:col-span-2">
          <Field label="Search" htmlFor={`${baseId}-q`}>
            <Input
              id={`${baseId}-q`}
              name="q"
              type="search"
              defaultValue={current.q}
              placeholder="Search title and description"
            />
          </Field>
        </div>

        <Field label="Status" htmlFor={`${baseId}-status`}>
          <Select
            id={`${baseId}-status`}
            defaultValue={current.status}
            onChange={(event) => apply({ status: event.target.value })}
          >
            <option value="all">All active</option>
            <option value="ready">Ready</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In progress</option>
            <option value="blocked">Blocked</option>
            <option value="missed">Missed</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </Select>
        </Field>

        <Field label="Project" htmlFor={`${baseId}-project`}>
          <Select
            id={`${baseId}-project`}
            defaultValue={current.projectId}
            onChange={(event) => apply({ projectId: event.target.value })}
          >
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Sort by" htmlFor={`${baseId}-sort`}>
          <Select
            id={`${baseId}-sort`}
            defaultValue={current.sort}
            onChange={(event) => apply({ sort: event.target.value })}
          >
            <option value="created_at">Created</option>
            <option value="updated_at">Updated</option>
            <option value="due_at">Due date</option>
            <option value="title">Title</option>
            <option value="consequence">Consequence</option>
          </Select>
        </Field>

        <Field label="Direction" htmlFor={`${baseId}-direction`}>
          <Select
            id={`${baseId}-direction`}
            defaultValue={current.direction}
            onChange={(event) => apply({ direction: event.target.value })}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </Select>
        </Field>

        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
          <Button type="submit" variant="secondary" disabled={pending} aria-busy={pending}>
            {pending ? 'Applying…' : 'Apply search'}
          </Button>
          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => startTransition(() => router.push('/tasks'))}
            >
              Clear filters
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
