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
  const id = 'soralia-prop-explicit-' + Date.now();
  console.log('Trying id:', id);

  // Use explicit target
  const r = await db.insert(properties).values({
    id,
    tenantId: '3f55f1d1-4c6d-4f94-bfe9-136afa482ba6',
    platformAddress: 'expl@soralia.org',
    street: 'Test',
    unit: '99',
    ownerId: 'soralia-user-john-smith',
    homeImage: null,
    createdAt: now,
    updatedAt: now,
  }).onConflictDoNothing({ target: properties.id }).returning();
  console.log('Result:', r);

  // Check the DB
  const c = await db.execute(`SELECT id, "createdAt" FROM "Property" WHERE id = '${id}'` as any);
  console.log('DB has it?', (c as any).rows);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
