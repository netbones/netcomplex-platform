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
      // FSD guardrails (migration complete - enforce boundaries)
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            // Enforce slice public API (no deep imports)
            '@shared/*/*',
            '@entities/*/*',
            '@features/*/*',
            '@widgets/*/*',
            '@pages/*/*',
            '@processes/*/*',
            // Block legacy bucket imports
            {
              group: ['@/components/**', '@/lib/**'],
              message:
                'Do not import from legacy buckets. Use FSD layers: @shared, @entities, @features, @widgets, @pages',
            },
            // Allow specific infrastructure from lib/
            {
              group: ['@/lib/constants', '@/lib/constants/**'],
              message: 'Constants should be moved to @shared/lib/constants',
              allowTypeImports: false,
            },
            {
              group: ['@/lib/modules/**'],
              message: 'Module utilities should remain in lib/ for now',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
];
