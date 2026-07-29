import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local', quiet: true });

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

/**
 * Some sandboxes ship a pre-installed Chromium whose build number does not match
 * the one this @playwright/test version expects. Setting E2E_CHROMIUM_PATH makes
 * Playwright use that binary instead of downloading its own. Left unset, normal
 * `playwright install` behaviour applies.
 */
const executablePath = process.env.E2E_CHROMIUM_PATH;
const launchOptions = executablePath === undefined ? {} : { executablePath };

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: process.env.CI === 'true',
  retries: process.env.CI === 'true' ? 1 : 0,
  workers: 1,
  reporter: process.env.CI === 'true' ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], launchOptions },
    },
    {
      // ACCEPTANCE_CRITERIA.md: critical flows must pass at 360px and 390px.
      name: 'mobile-360',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions,
        viewport: { width: 360, height: 780 },
      },
    },
    {
      name: 'mobile-390',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions,
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    command: 'npx next start --port 3000',
    url: baseURL,
    reuseExistingServer: process.env.CI !== 'true',
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
