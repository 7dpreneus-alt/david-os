import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { listProjects, listTasks } from '@/domain/tasks/repository';
import { Badge, Button, Card, EmptyState } from '@/components/ui/primitives';
import { ProjectComposer } from '@/components/tasks/project-composer';
import { ConfirmAction } from '@/components/confirm-action';
import { deleteProjectAction } from '../tasks/actions';

export const metadata: Metadata = { title: 'Projects' };
export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await listProjects(user.id);
  const { tasks } = await listTasks(user.id, {
    includeArchived: false,
    sort: 'created_at',
    direction: 'desc',
    limit: 200,
    offset: 0,
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Projects</h1>
        <p className="mt-1 text-sm text-text-muted">
          A project needs a title and a desired outcome. An active project with no viable
          next action is marked stalled rather than quietly sitting there.
        </p>
      </header>

      <ProjectComposer />

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create one above, or convert an inbox capture into a project."
          action={
            <Button asChild variant="secondary">
              <Link href="/inbox">Go to inbox</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {projects.map((project) => {
            const projectTasks = tasks.filter((task) => task.projectId === project.id);
            const nextAction = projectTasks.find(
              (task) =>
                !task.isBlockedByDependency &&
                ['ready', 'planned', 'in_progress'].includes(task.status),
            );
            return (
              <li key={project.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{project.title}</p>
                      <p className="mt-1 text-xs text-text-muted">
                        Outcome: {project.outcome}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge>{project.status}</Badge>
                        {project.source === 'starter' && <Badge tone="starter">Starter</Badge>}
                        <Badge>{project.openTaskCount} open task(s)</Badge>
                        {project.isStalled ? (
                          <Badge tone="warning">Stalled — no viable next action</Badge>
                        ) : (
                          nextAction !== undefined && (
                            <Badge tone="positive">Next: {nextAction.title}</Badge>
                          )
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/tasks?projectId=${project.id}`}>View tasks</Link>
                      </Button>
                      <ConfirmAction
                        action={deleteProjectAction}
                        hidden={{ projectId: project.id }}
                        triggerLabel="Delete"
                        question="Delete this project? Its tasks are kept and detached."
                      />
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
