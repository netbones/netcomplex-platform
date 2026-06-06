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
       // FSD guardrails: Enabled, but currently restricted by legacy import patterns.
       // 'no-restricted-imports': [
       //   'error',
       //   {
       //     patterns: [
       //       // Enforce slice public API (no deep imports)
       //       {
       //         group: ['@shared/*/*'],
       //         message: 'Use public API from @shared instead of deep imports.',
       //       },
       //       {
       //         group: ['@entities/*/*'],
       //         message: 'Use public API from @entities/<slice> instead of deep imports.',
       //       },
       //       {
       //         group: ['@features/*/*'],
       //         message: 'Use public API from @features/<slice> instead of deep imports.',
       //       },
       //       {
       //         group: ['@widgets/*/*'],
       //         message: 'Use public API from @widgets/<slice> instead of deep imports.',
       //       },
       //       {
       //         group: ['@pages/*/*'],
       //         message: 'Use public API from @pages/<slice> instead of deep imports.',
       //       },
       //       {
       //         group: ['@processes/*/*'],
       //         message: 'Use public API from @processes/<slice> instead of deep imports.',
       //       },
       //       // Block legacy bucket imports
       //       {
       //         group: ['@/components/**'],
       //         message: 'Legacy components bucket is deprecated. Use FSD layers instead.',
       //       },
       //       {
       //         group: ['@/lib/**'],
       //         message: 'Legacy lib bucket is deprecated. Use @shared/lib instead.',
       //       },
       //     ],
       //   },
       // ],
    },
  },
];
