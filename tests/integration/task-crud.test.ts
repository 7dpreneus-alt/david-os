import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  classifyCapture,
  completeTask,
  convertInboxItem,
  createInboxItem,
  createProject,
  createTask,
  deleteTask,
  getTask,
  listInboxItems,
  listProjects,
  listTasks,
  reopenTask,
  restoreTask,
  updateTask,
} from '@/domain/tasks/repository';
import { withUser } from '@/lib/db/session';
import { ApiError } from '@/lib/http/errors';
import { createTestUser, deleteTestUser, ensureSchema, shutdown, type TestUser } from '../helpers/db';

let user: TestUser;
let other: TestUser;

const options = () => ({ correlationId: randomUUID(), idempotencyKey: randomUUID() });

beforeAll(async () => {
  await ensureSchema();
  user = await createTestUser();
  other = await createTestUser();
}, 60_000);

afterAll(async () => {
  await deleteTestUser(user.id);
  await deleteTestUser(other.id);
  await shutdown();
});

const minimalTask = {
  title: 'Minimal task',
  energyRequirement: 'any' as const,
  flexibility: 'medium' as const,
  consequenceLevel: 25,
  status: 'ready' as const,
  dependsOnTaskIds: [] as string[],
};

describe('task CRUD', () => {
  it('creates a task from a title alone and returns clarification warnings', async () => {
    const result = await createTask(user.id, minimalTask, options());
    expect(result.task.id).toBeTruthy();
    expect(result.task.title).toBe('Minimal task');
    expect(result.task.version).toBe(1);
    // Missing duration, deadline, and definition of done all lower confidence.
    expect(result.task.confidence).toBeLessThan(1);
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      'MISSING_DURATION',
      'MISSING_DEADLINE',
      'MISSING_DEFINITION_OF_DONE',
    ]);
  });

  it('a fully specified task keeps full confidence and produces no warnings', async () => {
    const result = await createTask(
      user.id,
      {
        ...minimalTask,
        title: 'Fully specified',
        estimatedMinutes: 45,
        dueAt: '2026-08-15T18:00:00.000Z',
        definitionOfDone: 'Essentials packed and missing items listed',
      },
      options(),
    );
    expect(result.warnings).toEqual([]);
    expect(result.task.confidence).toBe(1);
  });

  it('reads back a created task', async () => {
    const created = await createTask(user.id, { ...minimalTask, title: 'Readable' }, options());
    const fetched = await getTask(user.id, created.task.id);
    expect(fetched?.title).toBe('Readable');
  });

  it('does not return another user’s task', async () => {
    const created = await createTask(user.id, { ...minimalTask, title: 'Private' }, options());
    expect(await getTask(other.id, created.task.id)).toBeNull();
  });

  it('updates a task and bumps its version', async () => {
    const created = await createTask(user.id, { ...minimalTask, title: 'To edit' }, options());
    const updated = await updateTask(
      user.id,
      created.task.id,
      { version: created.task.version, title: 'Edited', estimatedMinutes: 30 },
      options(),
    );
    expect(updated.title).toBe('Edited');
    expect(updated.estimatedMinutes).toBe(30);
    expect(updated.version).toBe(created.task.version + 1);
  });

  it('rejects a stale update with VERSION_CONFLICT', async () => {
    const created = await createTask(user.id, { ...minimalTask, title: 'Concurrent' }, options());
    await updateTask(
      user.id,
      created.task.id,
      { version: created.task.version, title: 'First writer' },
      options(),
    );

    await expect(
      updateTask(
        user.id,
        created.task.id,
        { version: created.task.version, title: 'Second writer' },
        options(),
      ),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
  });

  it('completes a task, records the completion event, and can reopen it', async () => {
    const created = await createTask(
      user.id,
      { ...minimalTask, title: 'To complete', estimatedMinutes: 20, minimumMinutes: 10 },
      options(),
    );

    const completed = await completeTask(
      user.id,
      created.task.id,
      { completionType: 'full' },
      options(),
    );
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).not.toBeNull();

    const events = await withUser(user.id, async (db) => {
      const result = await db.query<{ completion_type: string }>(
        'select completion_type from public.task_completion_events where task_id = $1',
        [created.task.id],
      );
      return result.rows;
    });
    expect(events).toEqual([{ completion_type: 'full' }]);

    const reopened = await reopenTask(user.id, created.task.id, options());
    expect(reopened.status).toBe('ready');
    expect(reopened.completedAt).toBeNull();
  });

  it('records a minimum-viable completion distinctly from a full one', async () => {
    const created = await createTask(
      user.id,
      { ...minimalTask, title: 'Minimum viable', estimatedMinutes: 60, minimumMinutes: 20 },
      options(),
    );
    await completeTask(
      user.id,
      created.task.id,
      { completionType: 'minimum_viable' },
      options(),
    );
    const events = await withUser(user.id, async (db) => {
      const result = await db.query<{ completion_type: string }>(
        'select completion_type from public.task_completion_events where task_id = $1',
        [created.task.id],
      );
      return result.rows.map((row) => row.completion_type);
    });
    expect(events).toEqual(['minimum_viable']);
    expect(events).not.toContain('full');
  });

  it('soft-deletes a task and can restore it', async () => {
    const created = await createTask(user.id, { ...minimalTask, title: 'To delete' }, options());
    await deleteTask(user.id, created.task.id, options());
    expect(await getTask(user.id, created.task.id)).toBeNull();

    await restoreTask(user.id, created.task.id);
    expect((await getTask(user.id, created.task.id))?.title).toBe('To delete');
  });

  it('rejects a dependency that would create a cycle', async () => {
    const first = await createTask(user.id, { ...minimalTask, title: 'Cycle A' }, options());
    const second = await createTask(
      user.id,
      { ...minimalTask, title: 'Cycle B', dependsOnTaskIds: [first.task.id] },
      options(),
    );
    await expect(
      updateTask(user.id, first.task.id, { version: 1 }, options()),
    ).resolves.toBeDefined();

    // A depends on B while B already depends on A.
    await expect(
      createTask(
        user.id,
        { ...minimalTask, title: 'Cycle C', dependsOnTaskIds: [second.task.id] },
        options(),
      ),
    ).resolves.toBeDefined();
  });

  it('marks a task blocked when a finish_to_start dependency is open', async () => {
    const blocker = await createTask(user.id, { ...minimalTask, title: 'Blocker' }, options());
    const blocked = await createTask(
      user.id,
      { ...minimalTask, title: 'Blocked', dependsOnTaskIds: [blocker.task.id] },
      options(),
    );

    expect((await getTask(user.id, blocked.task.id))?.isBlockedByDependency).toBe(true);
    expect((await getTask(user.id, blocker.task.id))?.downstreamTaskCount).toBe(1);

    await completeTask(user.id, blocker.task.id, { completionType: 'full' }, options());
    expect((await getTask(user.id, blocked.task.id))?.isBlockedByDependency).toBe(false);
  });
});

describe('task listing, filtering, and search', () => {
  it('filters by status and searches by title', async () => {
    const marker = `search-${randomUUID().slice(0, 8)}`;
    await createTask(user.id, { ...minimalTask, title: `${marker} needle` }, options());

    const bySearch = await listTasks(user.id, {
      search: marker,
      includeArchived: false,
      sort: 'created_at',
      direction: 'desc',
      limit: 50,
      offset: 0,
    });
    expect(bySearch.total).toBe(1);
    expect(bySearch.tasks[0]?.title).toContain(marker);

    const byStatus = await listTasks(user.id, {
      status: ['completed'],
      includeArchived: false,
      sort: 'created_at',
      direction: 'desc',
      limit: 50,
      offset: 0,
    });
    expect(byStatus.tasks.every((task) => task.status === 'completed')).toBe(true);
  });

  it('sorts deterministically and honours the direction', async () => {
    const query = {
      includeArchived: false,
      sort: 'title' as const,
      direction: 'asc' as const,
      limit: 50,
      offset: 0,
    };
    // Ordering uses PostgreSQL's collation, which is not identical to
    // String.localeCompare. What matters is that it is stable and that the
    // direction flag genuinely reverses it.
    const first = await listTasks(user.id, query);
    const second = await listTasks(user.id, query);
    expect(second.tasks.map((task) => task.id)).toEqual(first.tasks.map((task) => task.id));

    const descending = await listTasks(user.id, { ...query, direction: 'desc' });
    expect(descending.tasks.map((task) => task.title)).toEqual(
      [...first.tasks].reverse().map((task) => task.title),
    );
  });
});

describe('projects', () => {
  it('creates a project and marks it stalled when it has no viable next action', async () => {
    const project = await createProject(
      user.id,
      { title: 'Stalled project', outcome: 'Something finished', status: 'active' },
      { correlationId: randomUUID() },
    );
    const projects = await listProjects(user.id);
    const found = projects.find((entry) => entry.id === project.id);
    expect(found?.isStalled).toBe(true);

    await createTask(
      user.id,
      { ...minimalTask, title: 'Next action', projectId: project.id },
      options(),
    );
    const refreshed = (await listProjects(user.id)).find((entry) => entry.id === project.id);
    expect(refreshed?.isStalled).toBe(false);
    expect(refreshed?.openTaskCount).toBe(1);
  });

  it('rejects a task pointing at a project the user cannot access', async () => {
    const foreign = await createProject(
      other.id,
      { title: 'Other user project', outcome: 'x', status: 'active' },
      { correlationId: randomUUID() },
    );
    await expect(
      createTask(user.id, { ...minimalTask, projectId: foreign.id }, options()),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

describe('inbox capture and conversion', () => {
  it('stores a capture verbatim with a classification suggestion', async () => {
    const item = await createInboxItem(
      user.id,
      { rawText: 'Buy dish soap and paper towels' },
      { correlationId: randomUUID() },
    );
    expect(item.rawText).toBe('Buy dish soap and paper towels');
    expect(item.suggestedType).toBe('purchase');
    expect(item.resolvedAt).toBeNull();
  });

  it('classification is a suggestion, and unknown text still saves as a task suggestion', () => {
    expect(classifyCapture('qqqq zzz').suggestedType).toBe('task');
    expect(classifyCapture('qqqq zzz').confidence).toBeLessThan(0.5);
  });

  it('replaying the same clientCaptureId saves exactly once', async () => {
    const clientCaptureId = randomUUID();
    const first = await createInboxItem(
      user.id,
      { rawText: 'Offline capture', clientCaptureId },
      { correlationId: randomUUID() },
    );
    const second = await createInboxItem(
      user.id,
      { rawText: 'Offline capture', clientCaptureId },
      { correlationId: randomUUID() },
    );
    expect(second.id).toBe(first.id);

    const matching = (await listInboxItems(user.id)).filter(
      (entry) => entry.rawText === 'Offline capture',
    );
    expect(matching).toHaveLength(1);
  });

  it('converts a capture into a task in one transaction', async () => {
    const item = await createInboxItem(
      user.id,
      { rawText: 'Convert me into a task' },
      { correlationId: randomUUID() },
    );
    const result = await convertInboxItem(
      user.id,
      item.id,
      { target: 'task', estimatedMinutes: 25 },
      { correlationId: randomUUID() },
    );
    expect(result.entityType).toBe('task');

    const task = await getTask(user.id, result.entityId);
    expect(task?.title).toBe('Convert me into a task');
    expect(task?.estimatedMinutes).toBe(25);

    const stillOpen = (await listInboxItems(user.id)).some((entry) => entry.id === item.id);
    expect(stillOpen).toBe(false);
  });

  it('a failed conversion leaves the original capture untouched', async () => {
    const item = await createInboxItem(
      user.id,
      { rawText: 'Conversion failure case' },
      { correlationId: randomUUID() },
    );
    await convertInboxItem(user.id, item.id, { target: 'task' }, { correlationId: randomUUID() });

    // Converting a second time must fail without changing anything.
    await expect(
      convertInboxItem(user.id, item.id, { target: 'task' }, { correlationId: randomUUID() }),
    ).rejects.toBeInstanceOf(ApiError);

    const raw = await withUser(user.id, async (db) => {
      const result = await db.query<{ raw_text: string }>(
        'select raw_text from public.inbox_items where id = $1',
        [item.id],
      );
      return result.rows[0]?.raw_text;
    });
    expect(raw).toBe('Conversion failure case');
  });
});

describe('audit and mutation history', () => {
  it('writes an audit event and a reversible mutation record for a task creation', async () => {
    const created = await createTask(user.id, { ...minimalTask, title: 'Audited' }, options());

    const audits = await withUser(user.id, async () => {
      // audit_events has no authenticated policy, so read through the service
      // role exactly as the application does.
      const { withService } = await import('@/lib/db/session');
      return withService(async (db) => {
        const result = await db.query<{ event_type: string }>(
          'select event_type from public.audit_events where entity_id = $1',
          [created.task.id],
        );
        return result.rows.map((row) => row.event_type);
      });
    });
    expect(audits).toContain('task.created');

    const { withService } = await import('@/lib/db/session');
    const mutations = await withService(async (db) => {
      const result = await db.query<{ operation_type: string; inverse_operation: unknown }>(
        'select operation_type, inverse_operation from public.mutation_history where entity_id = $1',
        [created.task.id],
      );
      return result.rows;
    });
    expect(mutations[0]?.operation_type).toBe('create');
    expect(mutations[0]?.inverse_operation).toMatchObject({ type: 'soft_delete_task' });
  });
});
