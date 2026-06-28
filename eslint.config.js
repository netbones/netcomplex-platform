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
      // FSD guardrails: Re-enabled for audit.
      // Note: ESLint catches deep imports (@shared/*/*) inside the editor.
      // Steiger (steiger.config.js) is the source of truth for FSD architecture
      // rules — layer hierarchy, public API sidestep, public API presence, slice
      // hygiene, segment conventions. ESLint and Steiger share the same goal
      // (enforce FSD boundaries) but report different violation classes.
      // See AGENTS.md "FSD Architecture" for the split of responsibilities.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@shared/lib/hooks',
              importNames: ['usePageFlags'],
              message:
                'usePageFlags is @internal. Use useGateContext() from @features/gate instead.',
            },
          ],
          patterns: [
            // Enforce slice public API (no deep imports)
            {
              regex: '^@shared/(?!lib/hooks|lib/agent-token|lib/sanitize|lib/i18n)[^/]+/[^/]+$',
              message: 'Use public API from @shared instead of deep imports.',
            },
            // Block deep imports from entities except for the server.ts
            // sub-barrel pattern (ADR-020). @entities/*/server is the canonical
            // public API for server-only entity exports.
            {
              regex: '^@entities/(?!.*/server$)[^/]+/[^/@]',
              message:
                'Use public API from @entities/<slice> instead of deep imports. For server-only exports, use @entities/<slice>/server.',
            },
            {
              group: ['@features/*/*'],
              message: 'Use public API from @features/<slice> instead of deep imports.',
            },
            {
              group: ['@widgets/*/*'],
              message: 'Use public API from @widgets/<slice> instead of deep imports.',
            },
            {
              group: ['@pages/*/*'],
              message: 'Use public API from @pages/<slice> instead of deep imports.',
            },
            {
              group: ['@processes/*/*'],
              message: 'Use public API from @processes/<slice> instead of deep imports.',
            },
            // Block legacy bucket imports
            {
              group: ['@/components/**'],
              message: 'Legacy components bucket is deprecated. Use FSD layers instead.',
            },
            {
              group: ['@/lib/**'],
              message: 'Legacy lib bucket is deprecated. Use @shared/lib instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/(tenant)/admin/providers/**'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    // @features/gate imports mapping tables from @entities/tenant/api/gate/mappings.
    // This is the canonical clean module (zero server deps) — importing from the
    // @entities/tenant/server barrel would pull ioredis → dns into client builds.
    // See soralia-village-1eh for the build fix rationale.
    files: ['src/features/gate/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [],
          patterns: [
            // Keep all patterns EXCEPT the entities deep-import rule,
            // which traps the intentionally deep @entities/tenant/api/gate/mappings import.
            {
              regex: '^@shared/(?!lib/hooks)[^/]+/[^/]+$',
              message: 'Use public API from @shared instead of deep imports.',
            },
            {
              group: ['@features/*/*'],
              message: 'Use public API from @features/<slice> instead of deep imports.',
            },
            {
              group: ['@widgets/*/*'],
              message: 'Use public API from @widgets/<slice> instead of deep imports.',
            },
            {
              group: ['@pages/*/*'],
              message: 'Use public API from @pages/<slice> instead of deep imports.',
            },
            {
              group: ['@processes/*/*'],
              message: 'Use public API from @processes/<slice> instead of deep imports.',
            },
            {
              group: ['@/components/**'],
              message: 'Legacy components bucket is deprecated. Use FSD layers instead.',
            },
            {
              group: ['@/lib/**'],
              message: 'Legacy lib bucket is deprecated. Use @shared/lib instead.',
            },
          ],
        },
      ],
    },
  },
];
