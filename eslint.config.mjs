import next from 'eslint-config-next';

/**
 * Flat ESLint config. `eslint-config-next` 16 ships flat configs directly, so
 * the legacy FlatCompat shim is not used.
 */
const config = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'nextjs-version/**',
      'vite-version/**',
      'docs/**',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
      '.pgdata/**',
      'next-env.d.ts',
    ],
  },
  ...next,
  {
    // The TypeScript rules below live in the `next/typescript` config's plugin
    // scope, so they are applied to the same file set.
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // SECURITY_AND_PRIVACY.md and AGENT_HANDOFF.md prohibit catch-all `any`
      // and swallowed exceptions.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CatchClause[param=null]',
          message:
            'Catch the error and handle it explicitly. Silent catch blocks are prohibited.',
        },
      ],
    },
  },
];

export default config;
