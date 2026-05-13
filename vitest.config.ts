import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export default defineConfig({
  plugins: [react()],
  define: {
    'server-only': '{}',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@api': path.resolve(__dirname, './src/shared/api'),
      '@entities': path.resolve(__dirname, './src/entities'),
      '@features': path.resolve(__dirname, './src/features'),
      '@widgets': path.resolve(__dirname, './src/widgets'),
      '@pages': path.resolve(__dirname, './src/page-modules'),
      '@processes': path.resolve(__dirname, './src/processes'),
      '@prisma': path.resolve(__dirname, './prisma/drizzle'),
    },
  },
  test: {
    env: {
      DATABASE_URL: process.env.DATABASE_URL,
    },
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'src/test/platform-flags.test.ts',
      'src/test/registry.test.ts',
      'src/test/schemas.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/shared/**/*.{ts,tsx}',
        'src/entities/**/*.{ts,tsx}',
        'src/features/**/*.{ts,tsx}',
        'src/widgets/**/*.{ts,tsx}',
        'src/page-modules/**/*.{ts,tsx}',
      ],
      exclude: ['src/**/*.d.ts', 'src/shared/api/db.ts'],
    },
  },
});
