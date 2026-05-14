import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import boundaries from 'eslint-plugin-boundaries';

export default tseslint.config(
  // Ignore patterns
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**', '.next/**'],
  },

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Next.js plugin rules
  {
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },

  // Boundaries plugin + project rules
  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'schema', pattern: 'src/db/schema/**/*' },
        { type: 'shared', pattern: 'src/shared/**/*' },
        { type: 'entities', pattern: 'src/entities/**/*' },
        { type: 'features', pattern: 'src/features/**/*' },
        { type: 'widgets', pattern: 'src/widgets/**/*' },
        { type: 'app', pattern: 'src/app/**/*' },
        { type: 'pages', pattern: 'src/pages/**/*' },
        { type: 'processes', pattern: 'src/processes/**/*' },
      ],
      'boundaries/ignore': ['**/*.test.*', '**/*.spec.*', '**/index.ts'],
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'boundaries/no-unknown': 'error',
      'boundaries/no-unknown-files': 'error',
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'schema',    allow: ['schema'] },
            { from: 'shared',    allow: ['schema', 'shared'] },
            { from: 'entities',  allow: ['schema', 'shared', 'entities'] },
            { from: 'features',  allow: ['schema', 'shared', 'entities', 'features'] },
            { from: 'widgets',   allow: ['schema', 'shared', 'entities', 'features', 'widgets'] },
            { from: 'app',       allow: ['schema', 'shared', 'entities', 'features', 'widgets', 'app', 'processes'] },
            { from: 'pages',     allow: ['schema', 'shared', 'entities', 'features', 'widgets', 'pages', 'processes'] },
            { from: 'processes', allow: ['schema', 'shared', 'entities', 'features', 'processes'] },
          ],
        },
      ],
      'boundaries/no-cross-imports': [
        'error',
        {
          rules: [
            { from: 'shared', allow: ['shared'] },
            { from: 'entities', allow: ['entities'] },
            { from: 'features', allow: ['features'] },
            { from: 'widgets', allow: ['widgets'] },
          ],
        },
      ],
    },
  }
);
