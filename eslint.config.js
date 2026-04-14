import tseslint from 'typescript-eslint';

export default [
  ...tseslint.configs.recommended,
  {
    ignores: ['node_modules/', 'dist/', 'build/', '.next/', 'src/**/*.html'],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'prefer-const': 'error',
      // FSD guardrails (start permissive; tighten as slices migrate)
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            // Enforce slice public API (no deep imports)
            '@shared/*/*',
            '@entities/*/*',
            '@features/*/*',
            '@widgets/*/*',
            '@pages/*/*',
            '@processes/*/*',
          ],
        },
      ],
    },
  },
];
