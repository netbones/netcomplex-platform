export default [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    ignores: ['node_modules/', 'dist/', 'build/', '.next/', 'src/**/*.html'],
  },
];
