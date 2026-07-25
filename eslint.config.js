import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';

export default tseslint.config(
  ...tseslint.configs.recommended,

  {
    ignores: ['node_modules/', 'dist/', 'build/', '.next/', 'src/**/*.html'],
  },

  // Next.js plugin rules
  {
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },

  // Project rules + FSD deep-import guardrails
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'prefer-const': 'error',
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
            {
              regex:
                '^@shared/(?!lib/hooks|lib/agent-token|lib/sanitize|lib/i18n|lib/id|lib/format-date|lib/providers|lib/webhook|lib/utils|ui/)[^/]+/[^/]+$',
              message: 'Use public API from @shared instead of deep imports.',
            },
            {
              regex: '^@entities/(?!.*/server$)[^/]+/[^/@]',
              message:
                'Use public API from @entities/<slice> instead of deep imports. For server-only exports, use @entities/<slice>/server.',
            },
            {
              regex: '^@features/[^/]+/(?!server$)[^/@]',
              message:
                'Use public API from @features/<slice> instead of deep imports. For server-only exports, use @features/<slice>/server.',
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

  // @features/gate: allow deep import of @entities/tenant/api/gate/mappings
  // This is the canonical clean module (zero server deps) — importing from the
  // @entities/tenant/server barrel would pull ioredis → dns into client builds.
  {
    files: ['src/features/gate/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [],
          patterns: [
            {
              regex:
                '^@shared/(?!lib/hooks|lib/format-date|lib/providers|lib/utils|ui/)[^/]+/[^/]+$',
              message: 'Use public API from @shared instead of deep imports.',
            },
            {
              regex: '^@features/[^/]+/(?!server$)[^/@]',
              message:
                'Use public API from @features/<slice> instead of deep imports. For server-only exports, use @features/<slice>/server.',
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
  }
);
