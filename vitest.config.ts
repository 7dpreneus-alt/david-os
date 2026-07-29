import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    projects: [
      {
        plugins: [tsconfigPaths(), react()],
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./tests/setup/unit-setup.ts'],
          include: ['tests/unit/**/*.test.{ts,tsx}'],
        },
      },
      {
        plugins: [tsconfigPaths()],
        test: {
          name: 'integration',
          environment: 'node',
          globals: true,
          setupFiles: ['./tests/setup/integration-setup.ts'],
          include: ['tests/integration/**/*.test.ts'],
          // Integration tests share one PostgreSQL database; run them in a
          // single fork so per-test cleanup cannot race.
          pool: 'forks',
          poolOptions: { forks: { singleFork: true } },
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
