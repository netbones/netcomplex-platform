import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { contents } from '../src/db/schema/contents';

async function checkCategories() {
  const connectionString = (process.env.DATABASE_URL ?? '').replace(
    'sslmode=require',
    'sslmode=no-verify'
  );
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  try {
    const result = await db.select({ category: contents.category }).from(contents);
    const categories = new Set(result.map(r => r.category));
    console.log('Existing categories in Content table:', Array.from(categories));
  } catch (err) {
    console.error('Failed to query categories:', err);
  } finally {
    await pool.end();
  }
}

checkCategories();
