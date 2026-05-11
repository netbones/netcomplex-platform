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
      // FSD guardrails (migration in progress - guardrails disabled)
      // 'no-restricted-imports': [
      //   'error',
      //   {
      //     patterns: [
      //       // Enforce slice public API (no deep imports)
      //       '@shared/*/*',
      //       '@entities/*/*',
      //       '@features/*/*',
      //       '@widgets/*/*',
      //       '@pages/*/*',
      //       '@processes/*/*',
      //       // Block legacy bucket imports
      //       '@/components/**',
      //       '@/lib/**',
      //       // Allow specific infrastructure from lib/
      //       '@/lib/constants',
      //       '@/lib/constants/**',
      //       '@/lib/modules/**',
      //     ],
      //   },
      // ],
    },
  },
];
