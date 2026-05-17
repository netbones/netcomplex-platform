import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { resources } from '../src/db/schema/resources';

async function checkResources() {
  const connectionString = (process.env.DATABASE_URL ?? '').replace(
    'sslmode=require',
    'sslmode=no-verify'
  );
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  try {
    const result = await db.select().from(resources);
    console.log('Total records in Resource table:', result.length);
  } catch (err) {
    console.error('Failed to query resources:', err);
  } finally {
    await pool.end();
  }
}

checkResources();
