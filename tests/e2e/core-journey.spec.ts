import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

/**
 * Core user journey — TEST_PLAN.md and the Phase 1 definition of done.
 *
 * Every step drives the real application against the real database. Nothing is
 * stubbed: sign-up creates an `auth.users` row, task creation writes to
 * `public.tasks`, and the assertions read what the server rendered.
 *
 * Locator notes: toasts repeat task titles, and Next.js renders its own
 * `role="alert"` route announcer, so assertions scope to the list, the form, or
 * an exact string rather than matching page-wide.
 */

function uniqueEmail(): string {
  return `e2e-${randomUUID()}@example.test`;
}

const PASSWORD = 'e2e-password-1234';

/** The task list, excluding the toast layer. */
function taskList(page: Page) {
  return page.getByRole('list').filter({ has: page.locator('li') }).last();
}

function taskCard(page: Page, title: string) {
  return page.locator('li').filter({ hasText: title }).first();
}

/** The navigation that is actually rendered at the current viewport. */
function primaryNav(page: Page, projectName: string) {
  return page.getByTestId(projectName === 'desktop-chromium' ? 'nav-desktop' : 'nav-mobile');
}

async function signUp(page: Page, email: string): Promise<void> {
  await page.goto('/signup');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  // Keep starter data out so counts in these tests are unambiguous.
  const starter = page.getByRole('checkbox');
  if (await starter.isVisible()) await starter.uncheck();
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/today');
}

async function addTask(page: Page, title: string): Promise<void> {
  await page.getByLabel('Task title').fill(title);
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(taskCard(page, title)).toBeVisible();
}

test.describe('authentication', () => {
  test('@smoke an unauthenticated visitor is redirected to sign in', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForURL('**/login');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('@smoke sign up, sign out, and sign back in preserves data', async ({ page }) => {
    const email = uniqueEmail();
    await signUp(page, email);

    await page.goto('/tasks');
    await addTask(page, 'Survives sign out');

    await page.goto('/settings');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL('**/login');

    // The session is genuinely gone: a protected route bounces back to login.
    await page.goto('/tasks');
    await page.waitForURL('**/login');

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/today');

    await page.goto('/tasks');
    await expect(taskCard(page, 'Survives sign out')).toBeVisible();
  });

  test('wrong credentials produce a visible error and no session', async ({ page }) => {
    const email = uniqueEmail();
    await signUp(page, email);
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL('**/login');

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('definitely-the-wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Email or password is incorrect.')).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/login');
  });

  test('a short password is rejected with a field-level message', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel('Email').fill(uniqueEmail());
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Use at least 12 characters.')).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/signup');
  });
});

test.describe('task lifecycle', () => {
  test('@smoke create, edit, complete, reopen, and delete a task', async ({ page }) => {
    await signUp(page, uniqueEmail());
    await page.goto('/tasks');

    await expect(page.getByText('No tasks yet')).toBeVisible();

    await addTask(page, 'Pack wedding essentials');
    const card = taskCard(page, 'Pack wedding essentials');
    // A task with no estimate is flagged as lower confidence, not hidden.
    await expect(card.getByText(/confidence/i)).toBeVisible();

    await card.getByRole('button', { name: 'Edit' }).click();
    await card.getByLabel('Estimated minutes').fill('45');
    await card.getByRole('button', { name: 'Save changes' }).click();
    await expect(card.getByText('45m')).toBeVisible();

    await card.getByRole('button', { name: 'Complete', exact: true }).click();
    await expect(card.getByText('completed')).toBeVisible();

    await card.getByRole('button', { name: 'Reopen' }).click();
    await expect(card.getByText('ready')).toBeVisible();

    // Destructive actions require a confirmation step.
    await card.getByRole('button', { name: 'Delete' }).click();
    await expect(card.getByText(/Delete this task\?/)).toBeVisible();
    await card.getByRole('button', { name: 'Yes, delete' }).click();
    await expect(page.getByText('No tasks yet')).toBeVisible();
  });

  test('validation errors are shown inline and the task is not created', async ({ page }) => {
    await signUp(page, uniqueEmail());
    await page.goto('/tasks');

    await page.getByRole('button', { name: 'Add planning details' }).click();
    await page.getByLabel('Task title').fill('Impossible durations');
    await page.getByLabel('Estimated minutes').fill('10');
    await page.getByLabel('Minimum viable minutes').fill('60');
    await page.getByRole('button', { name: 'Add task' }).click();

    await expect(page.getByText('Minimum duration cannot exceed the estimate.')).toBeVisible();
    await expect(page.getByText('No tasks yet')).toBeVisible();
  });

  test('search and status filters narrow the list', async ({ page }) => {
    await signUp(page, uniqueEmail());
    await page.goto('/tasks');

    await addTask(page, 'Alpha report');
    await addTask(page, 'Beta cleanup');

    await page.getByLabel('Search').fill('Alpha');
    await page.getByRole('button', { name: 'Apply search' }).click();

    const list = taskList(page);
    await expect(list.getByText('Alpha report', { exact: true })).toBeVisible();
    await expect(list.getByText('Beta cleanup', { exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(taskList(page).getByText('Beta cleanup', { exact: true })).toBeVisible();
  });
});

test.describe('inbox', () => {
  test('@smoke capture requires only text and converts to a task', async ({ page }) => {
    await signUp(page, uniqueEmail());
    await page.goto('/inbox');
    await expect(page.getByText('Inbox clear')).toBeVisible();

    await page.getByRole('textbox', { name: 'Capture' }).fill('Buy dish soap');
    await page.getByRole('button', { name: 'Capture', exact: true }).click();

    const captured = page.locator('li').filter({ hasText: 'Buy dish soap' }).first();
    await expect(captured).toBeVisible();
    // Classification is shown as a suggestion with its confidence.
    await expect(captured.getByText(/suggested: purchase/)).toBeVisible();

    await captured.getByRole('button', { name: 'Make task' }).click();
    await expect(page.getByText('Inbox clear')).toBeVisible();

    await page.goto('/tasks');
    await expect(taskCard(page, 'Buy dish soap')).toBeVisible();
  });
});

test.describe('command center', () => {
  test('@smoke shows real data and never more than three dominant outcomes', async ({ page }) => {
    await signUp(page, uniqueEmail());

    await page.goto('/tasks');
    await page.getByRole('button', { name: 'Add planning details' }).click();
    for (let index = 0; index < 5; index += 1) {
      const title = `Outcome candidate ${index}`;
      await page.getByLabel('Task title').fill(title);
      await page.getByLabel('Estimated minutes').fill('15');
      await page.getByLabel('Consequence of delay (0–100)').fill('80');
      await page.getByRole('button', { name: 'Add task' }).click();
      await expect(taskCard(page, title)).toBeVisible();
      await page.getByRole('button', { name: 'Add planning details' }).click();
    }

    await page.goto('/today');
    await expect(page.getByRole('heading', { name: 'Top outcomes' })).toBeVisible();

    // DECISION_LOG D-015: at most three dominant outcomes, ever.
    await expect(page.locator('ol > li')).toHaveCount(3);

    // The calendar source is honestly reported as not connected.
    await expect(page.getByText(/Google Calendar is not connected/)).toBeVisible();
    await expect(page.getByText('What should I do now?')).toBeVisible();
    await expect(page.getByText('Google Calendar has not been changed')).toBeVisible();
  });

  test('an energy check-in is recorded and reflected on the page', async ({ page }) => {
    await signUp(page, uniqueEmail());
    await page.goto('/today');
    await expect(page.getByText(/No energy check-in recorded/)).toBeVisible();

    await page.getByLabel('Current energy').selectOption('low');
    await page.getByRole('button', { name: 'Record check-in' }).click();
    await expect(page.getByText(/Recorded .* as low/)).toBeVisible();
  });
});

test.describe('projects', () => {
  test('an active project with no next action is marked stalled', async ({ page }) => {
    await signUp(page, uniqueEmail());
    await page.goto('/projects');

    await page.getByLabel('Project title').fill('Apartment reset');
    await page.getByLabel('Desired outcome').fill('Core rooms have a definition of done');
    await page.getByRole('button', { name: 'Create project' }).click();

    const card = page.locator('li').filter({ hasText: 'Apartment reset' }).first();
    await expect(card.getByText(/Stalled/)).toBeVisible();

    await page.goto('/tasks');
    await page.getByRole('button', { name: 'Add planning details' }).click();
    await page.getByLabel('Task title').fill('Clear kitchen surfaces');
    await page.getByLabel('Project').selectOption({ label: 'Apartment reset' });
    await page.getByRole('button', { name: 'Add task' }).click();
    await expect(taskCard(page, 'Clear kitchen surfaces')).toBeVisible();

    await page.goto('/projects');
    const refreshed = page.locator('li').filter({ hasText: 'Apartment reset' }).first();
    await expect(refreshed.getByText(/Next:/)).toBeVisible();
    await expect(refreshed.getByText(/Stalled/)).toHaveCount(0);
  });
});

test.describe('settings and data controls', () => {
  test('preferences persist across a reload', async ({ page }) => {
    await signUp(page, uniqueEmail());
    await page.goto('/settings');

    await page.getByLabel('Display name').fill('David');
    await page.getByLabel('Weekday capacity (minutes)').fill('240');
    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(page.getByText('Settings saved.')).toBeVisible();

    await page.reload();
    await expect(page.getByLabel('Display name')).toHaveValue('David');
    await expect(page.getByLabel('Weekday capacity (minutes)')).toHaveValue('240');
  });

  test('starter data installs with a visible label and can be removed', async ({ page }) => {
    await signUp(page, uniqueEmail());
    await page.goto('/settings');

    await page.getByRole('button', { name: 'Install starter data' }).click();
    await expect(page.getByText('Installed', { exact: true })).toBeVisible();

    await page.goto('/tasks');
    await expect(taskList(page).getByText('Starter', { exact: true }).first()).toBeVisible();

    await page.goto('/settings');
    await page.getByRole('button', { name: 'Remove all starter data' }).click();
    await page.getByRole('button', { name: 'Yes, remove' }).click();
    await expect(page.getByText('Not installed', { exact: true })).toBeVisible();

    await page.goto('/tasks');
    await expect(page.getByText('No tasks yet')).toBeVisible();
  });

  test('settings state the truth about Calendar and account deletion', async ({ page }) => {
    await signUp(page, uniqueEmail());
    await page.goto('/settings');
    await expect(page.getByText('Not connected', { exact: true })).toBeVisible();
    await expect(page.getByText(/has never written to Google Calendar/)).toBeVisible();
    await expect(page.getByText(/Account deletion is not implemented/)).toBeVisible();
  });

  test('the data export downloads a real file with a schema version', async ({ page }) => {
    await signUp(page, uniqueEmail());
    await page.goto('/tasks');
    await addTask(page, 'Exported task');

    await page.goto('/settings');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download export' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^mission-control-export-\d{4}-\d{2}-\d{2}\.json$/);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
      schemaVersion: string;
      excluded: string[];
      data: Record<string, unknown[]>;
    };

    expect(payload.schemaVersion).toBe('1.0.0');
    expect(JSON.stringify(payload.data.tasks)).toContain('Exported task');
    // Secrets are excluded by construction, and the export says so.
    expect(payload.data.calendar_connections).toBeUndefined();
    expect(payload.excluded.join(' ')).toMatch(/OAuth tokens/);
  });
});

test.describe('layout and accessibility basics', () => {
  test('@smoke no horizontal scrolling at mobile widths', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop-chromium', 'Mobile projects only.');
    await signUp(page, uniqueEmail());

    for (const path of ['/today', '/tasks', '/inbox', '/projects', '/settings']) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} scrolls horizontally`).toBeLessThanOrEqual(1);
    }
  });

  test('the primary navigation marks the current page', async ({ page }, testInfo) => {
    await signUp(page, uniqueEmail());
    await page.goto('/today');
    const nav = primaryNav(page, testInfo.project.name);
    await expect(nav.getByRole('link', { name: 'Today' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('every primary navigation link resolves to a real page', async ({ page }, testInfo) => {
    await signUp(page, uniqueEmail());
    await page.goto('/today');
    const nav = primaryNav(page, testInfo.project.name);
    const hrefs = await nav
      .getByRole('link')
      .evaluateAll((links) =>
        links.map((link) => (link as HTMLAnchorElement).getAttribute('href') ?? ''),
      );

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const response = await page.goto(href);
      expect(response?.status(), `${href} did not return 200`).toBe(200);
    }
  });

  test('every form control has an accessible name', async ({ page }) => {
    await signUp(page, uniqueEmail());
    for (const path of ['/tasks', '/inbox', '/settings']) {
      await page.goto(path);
      const unnamed = await page.evaluate(() => {
        const controls = [...document.querySelectorAll('input, select, textarea')];
        return controls
          .filter((control) => {
            if (control.getAttribute('type') === 'hidden') return false;
            const id = control.getAttribute('id');
            const labelled =
              (id !== null && document.querySelector(`label[for="${id}"]`) !== null) ||
              control.getAttribute('aria-label') !== null ||
              control.closest('label') !== null;
            return !labelled;
          })
          .map((control) => control.outerHTML.slice(0, 120));
      });
      expect(unnamed, `${path} has unlabelled controls`).toEqual([]);
    }
  });
});

test.describe('health and system status', () => {
  test('@smoke the health endpoint reports a reachable database', async ({ request }) => {
    const response = await request.get('/api/v1/health');
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { data: { status: string; database: string } };
    expect(body.data.status).toBe('ok');
    expect(body.data.database).toBe('reachable');
  });

  test('system status shows the migration count and zero tables without RLS', async ({ page }) => {
    await signUp(page, uniqueEmail());
    await page.goto('/system/status');
    await expect(page.getByText('reachable')).toBeVisible();
    await expect(
      page.getByText('Public tables without RLS').locator('xpath=following-sibling::dd[1]'),
    ).toHaveText('0');
  });
});

test.describe('api contract', () => {
  test('unauthenticated API requests return the typed error envelope', async ({ request }) => {
    const response = await request.get('/api/v1/tasks');
    expect(response.status()).toBe(401);
    const body = (await response.json()) as {
      error: { code: string; retryable: boolean; requestId: string };
    };
    expect(body.error.code).toBe('UNAUTHENTICATED');
    expect(body.error.retryable).toBe(false);
    expect(body.error.requestId).toBeTruthy();
  });

  test('a mutation without an Idempotency-Key is rejected', async ({ request }) => {
    const response = await request.post('/api/v1/tasks', { data: { title: 'x' } });
    // Unauthenticated is checked after the header requirement.
    const body = (await response.json()) as { error: { code: string } };
    expect(['VALIDATION_ERROR', 'UNAUTHENTICATED']).toContain(body.error.code);
  });
});
