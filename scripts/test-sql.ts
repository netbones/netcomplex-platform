import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import 'dotenv/config';
import { properties } from '@schema/properties';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!.replace('sslmode=require', 'sslmode=no-verify'),
  connectionTimeoutMillis: 15000,
});
const db = drizzle(pool);

async function main() {
  const now = new Date();
  const id = 'soralia-prop-showsql-' + Date.now();
  const q = db.insert(properties).values({
    id,
    tenantId: '3f55f1d1-4c6d-4f94-bfe9-136afa482ba6',
    platformAddress: 'sql@soralia.org',
    street: 'Test',
    unit: '99',
    ownerId: 'soralia-user-john-smith',
    homeImage: null,
    createdAt: now,
    updatedAt: now,
  }).onConflictDoNothing();

  console.log('SQL:', q.toSQL());
  console.log('Params:', q.toSQL().params);

  const r = await q.returning();
  console.log('Result:', r);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
