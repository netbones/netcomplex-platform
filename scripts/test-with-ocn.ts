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
  const id = 'soralia-prop-withocn-' + Date.now();
  try {
    const r = await db.insert(properties).values({
      id,
      tenantId: '3f55f1d1-4c6d-4f94-bfe9-136afa482ba6',
      platformAddress: 'ocn@soralia.org',
      street: 'Test',
      unit: '99',
      ownerId: 'soralia-user-john-smith',
      homeImage: null,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing().returning();
    console.log('WITH OCN result:', r);
  } catch (e: any) {
    console.log('WITH OCN THREW:', e.cause?.message ?? e.message);
  }

  // Check the DB
  const c = await db.execute(`SELECT id FROM "Property" WHERE id = '${id}'` as any);
  console.log('DB has it?', (c as any).rows);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
