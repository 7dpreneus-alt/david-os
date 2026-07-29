import type { Metadata } from 'next';
import Link from 'next/link';
import { DateTime } from 'luxon';
import { requireUser } from '@/lib/auth';
import { loadCommandCenter } from '@/domain/planning/command-center';
import { Badge, Button, Card, CardTitle, EmptyState } from '@/components/ui/primitives';
import { formatMinutes } from '@/lib/utils';
import { EnergyCheckIn } from '@/components/command-center/energy-checkin';
import { CompleteButton } from '@/components/command-center/complete-button';

export const metadata: Metadata = { title: 'Today' };
export const dynamic = 'force-dynamic';

const SOURCE_LABEL: Record<string, string> = {
  tasks: 'Tasks',
  calendar: 'Google Calendar',
  energy: 'Energy',
  plan: 'Day plan',
};

export default async function TodayPage() {
  const user = await requireUser();
  const data = await loadCommandCenter(user.id);

  const local = DateTime.fromISO(data.now).setZone(data.timezone);
  const nowRecommendation = data.priority.ranked[0] ?? null;
  const ignoreFirst = data.ignore[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">
          {local.toFormat('cccc, LLLL d')}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {data.timezone} · {local.toFormat('h:mm a')} ·{' '}
          {data.priority.engineVersion}
        </p>
      </header>

      {/* Source freshness. Failures are named, not hidden. */}
      <Card>
        <CardTitle>Source status</CardTitle>
        <ul className="mt-2 space-y-1.5">
          {data.sources.map((source) => (
            <li key={source.source} className="flex flex-wrap items-start gap-2 text-xs">
              <Badge
                tone={
                  source.state === 'ok'
                    ? 'positive'
                    : source.state === 'failed'
                      ? 'danger'
                      : 'warning'
                }
              >
                {SOURCE_LABEL[source.source] ?? source.source}
              </Badge>
              <span className="min-w-0 flex-1 text-text-muted">{source.detail}</span>
            </li>
          ))}
        </ul>
      </Card>

      {data.overcommitmentMinutes > 0 && (
        <Card className="border-warning">
          <CardTitle className="text-warning">Overcommitted</CardTitle>
          <p className="mt-1 text-sm text-text-muted">
            Planned work exceeds today&rsquo;s capacity by{' '}
            {formatMinutes(data.overcommitmentMinutes)} (
            {formatMinutes(data.committedMinutes)} planned against{' '}
            {formatMinutes(data.capacityMinutes)} capacity). Something has to move.
          </p>
        </Card>
      )}

      {/* Top three outcomes — never more (DECISION_LOG D-015). */}
      <section aria-labelledby="outcomes-heading">
        <h2 id="outcomes-heading" className="mb-2 text-sm font-semibold">
          Top outcomes
        </h2>
        {data.priority.dominantOutcomes.length === 0 ? (
          <EmptyState
            title="No dominant outcomes today"
            description={
              data.priority.ranked.length === 0
                ? 'Nothing is both actionable and able to fit the time you have left. Add a task, or shorten one so it fits.'
                : 'Everything actionable has low confidence. Add durations and deadlines so the planner can commit to something.'
            }
            action={
              <Button asChild variant="secondary">
                <Link href="/tasks">Open tasks</Link>
              </Button>
            }
          />
        ) : (
          <ol className="space-y-2">
            {data.priority.dominantOutcomes.map((scored, index) => {
              const task = data.tasksById.get(scored.taskId);
              return (
                <li key={scored.taskId}>
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          <span className="mr-2 text-text-muted">{index + 1}.</span>
                          {scored.title}
                        </p>
                        <p className="mt-1.5 text-xs text-text-muted">{scored.explanation}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge tone="accent">score {scored.finalScore.toFixed(1)}</Badge>
                          <Badge>{formatMinutes(task?.estimatedMinutes ?? null)}</Badge>
                          {task?.source === 'starter' && <Badge tone="starter">Starter</Badge>}
                        </div>
                      </div>
                      {task !== undefined && <CompleteButton taskId={task.id} />}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardTitle>What should I do now?</CardTitle>
          {nowRecommendation === null ? (
            <p className="mt-2 text-sm text-text-muted">
              Nothing feasible right now. {data.priority.excluded.length} task(s) were
              excluded — the most common reason is that they do not fit the time left today.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm font-medium">{nowRecommendation.title}</p>
              <p className="mt-1 text-xs text-text-muted">{nowRecommendation.explanation}</p>
            </>
          )}
        </Card>

        <Card>
          <CardTitle>What should I ignore?</CardTitle>
          {ignoreFirst === null ? (
            <p className="mt-2 text-sm text-text-muted">
              Nothing is safe to drop today. Everything open is either consequential or
              already blocked for a stated reason.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm font-medium">{ignoreFirst.title}</p>
              <p className="mt-1 text-xs text-text-muted">
                {ignoreFirst.action.replace('_', ' ')} — {ignoreFirst.reason}
              </p>
            </>
          )}
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardTitle>Open time</CardTitle>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {formatMinutes(data.openWindowMinutes)}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Remaining capacity after {formatMinutes(data.committedMinutes)} of planned work.
            Google Calendar is not connected, so fixed events are not subtracted yet.
          </p>
        </Card>

        <EnergyCheckIn
          currentEnergy={data.currentEnergy}
          checkedAt={data.energyCheckedAt}
        />
      </div>

      {data.atRisk.length > 0 && (
        <Card className="border-danger">
          <CardTitle className="text-danger">At risk</CardTitle>
          <ul className="mt-2 space-y-1">
            {data.atRisk.map((task) => (
              <li key={task.id} className="text-sm">
                {task.title}
                <span className="ml-2 text-xs text-text-muted">
                  due{' '}
                  {task.dueAt === null
                    ? 'unknown'
                    : DateTime.fromISO(task.dueAt)
                        .setZone(data.timezone)
                        .toFormat('LLL d, h:mm a')}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardTitle>Inbox</CardTitle>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{data.inboxCount}</p>
          <Link href="/inbox" className="mt-1 inline-block text-xs text-accent underline">
            Open inbox
          </Link>
        </Card>
        <Card>
          <CardTitle>Missed commitments</CardTitle>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{data.openMissedCount}</p>
          <p className="mt-1 text-xs text-text-muted">
            Recovery options are not built yet; see IMPLEMENTATION_STATUS.md.
          </p>
        </Card>
        <Card>
          <CardTitle>Pending approvals</CardTitle>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {data.pendingApprovalCount}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Google Calendar has not been changed by this application.
          </p>
        </Card>
      </div>
    </div>
  );
}
