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
    alias: [
      // More specific paths first — Vite matches the first entry.
      {
        find: '@entities/tenant/server',
        replacement: path.resolve(__dirname, './src/entities/tenant/index.server'),
      },
      {
        find: '@entities/content/server',
        replacement: path.resolve(__dirname, './src/entities/content/index.server'),
      },
      {
        find: '@entities/maintenance/server',
        replacement: path.resolve(__dirname, './src/entities/maintenance/index.server'),
      },
      {
        find: '@entities/event/server',
        replacement: path.resolve(__dirname, './src/entities/event/index.server'),
      },
      {
        find: '@entities/booking/server',
        replacement: path.resolve(__dirname, './src/entities/booking/index.server'),
      },
      {
        find: '@entities/dispute/server',
        replacement: path.resolve(__dirname, './src/entities/dispute/index.server'),
      },
      {
        find: '@entities/marketplace/server',
        replacement: path.resolve(__dirname, './src/entities/marketplace/index.server'),
      },
      {
        find: '@entities/dwallet/server',
        replacement: path.resolve(__dirname, './src/entities/dwallet/index.server'),
      },
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: '@app', replacement: path.resolve(__dirname, './src/app') },
      { find: '@shared', replacement: path.resolve(__dirname, './src/shared') },
      { find: '@api', replacement: path.resolve(__dirname, './src/shared/api') },
      { find: '@entities', replacement: path.resolve(__dirname, './src/entities') },
      { find: '@features', replacement: path.resolve(__dirname, './src/features') },
      { find: '@widgets', replacement: path.resolve(__dirname, './src/widgets') },
      { find: '@pages', replacement: path.resolve(__dirname, './src/page-modules') },
      { find: '@processes', replacement: path.resolve(__dirname, './src/processes') },
      { find: '@prisma', replacement: path.resolve(__dirname, './prisma/drizzle') },
      { find: '@schema', replacement: path.resolve(__dirname, './src/db/schema') },
      { find: '@server', replacement: path.resolve(__dirname, './src/server') },
    ],
  },
  test: {
    env: {
      DATABASE_URL: process.env.DATABASE_URL,
      RESEND_API_KEY: process.env.RESEND_API_KEY || 'placeholder_re_123',
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
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
        'src/app/api/**/*.ts',
        'src/shared/**/*.{ts,tsx}',
        'src/entities/**/*.{ts,tsx}',
        'src/features/**/*.{ts,tsx}',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/shared/api/db.ts',
        'src/entities/**/index.{ts,tsx}',
        'src/features/**/index.{ts,tsx}',
      ],
      thresholds: {
        lines: 30,
        branches: 20,
        functions: 15,
      },
    },
  },
});
