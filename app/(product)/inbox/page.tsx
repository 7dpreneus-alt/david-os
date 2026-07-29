import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { listInboxItems } from '@/domain/tasks/repository';
import { Badge, Button, Card, EmptyState } from '@/components/ui/primitives';
import { CaptureBox } from '@/components/capture/capture-box';
import { convertAction, discardCaptureAction } from './actions';

export const metadata: Metadata = { title: 'Inbox' };
export const dynamic = 'force-dynamic';

export default async function InboxPage() {
  const user = await requireUser();
  const items = await listInboxItems(user.id);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Inbox</h1>
        <p className="mt-1 text-sm text-text-muted">
          Capture needs only text. Classification is a suggestion — if it is wrong or
          fails, the capture is still saved exactly as you typed it.
        </p>
      </header>

      <CaptureBox />

      <section aria-label="Captured items" className="space-y-2">
        {items.length === 0 ? (
          <EmptyState
            title="Inbox clear"
            description="Nothing waiting to be sorted. Capture anything above and decide what it is later."
          />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <Card>
                  <p className="text-sm">{item.rawText}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {item.suggestedType !== null && (
                      <Badge tone="accent">
                        suggested: {item.suggestedType.replace('_', ' ')}
                        {item.classificationConfidence !== null &&
                          ` (${Math.round(item.classificationConfidence * 100)}%)`}
                      </Badge>
                    )}
                    {item.duplicateCandidates.length > 0 && (
                      <Badge tone="warning">
                        {item.duplicateCandidates.length} possible duplicate
                      </Badge>
                    )}
                    <Badge>
                      {new Date(item.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    {(['task', 'project', 'goal', 'note'] as const).map((target) => (
                      <form key={target} action={convertAction}>
                        <input type="hidden" name="inboxItemId" value={item.id} />
                        <input type="hidden" name="target" value={target} />
                        <Button
                          type="submit"
                          size="sm"
                          variant={target === 'task' ? 'primary' : 'secondary'}
                        >
                          Make {target}
                        </Button>
                      </form>
                    ))}
                    <form action={discardCaptureAction} className="ml-auto">
                      <input type="hidden" name="inboxItemId" value={item.id} />
                      <Button type="submit" size="sm" variant="ghost" className="text-danger">
                        Discard
                      </Button>
                    </form>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
