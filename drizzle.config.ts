import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/drizzle/schema.ts',
  out: './src/drizzle',
  dbCredentials: {
    url: 'postgresql://postgres:TXd*1FyKWM*!EF^NY9Es@db.dbbiluuzbapldtzjlliz.supabase.co:5432/postgres?sslmode=require&search_path=public',
  },
  verbose: true,
  strict: true,
});
