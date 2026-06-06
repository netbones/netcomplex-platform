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
  // Insert with valid data
  const now = new Date();
  try {
    const res = await db.insert(properties).values({
      id: 'test-prop-' + Date.now(),
      tenantId: '3f55f1d1-4c6d-4f94-bfe9-136afa482ba6',
      platformAddress: 'test@soralia.org',
      street: 'Test St',
      unit: '1',
      ownerId: 'soralia-user-john-smith',
      homeImage: null,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing().returning();
    console.log('1st insert result:', res);
  } catch (e: any) {
    console.log('1st insert THREW:', e.cause?.message ?? e.message);
  }

  // Insert with valid id but FK violation on ownerId
  try {
    const res = await db.insert(properties).values({
      id: 'test-prop-fk-fail',
      tenantId: '3f55f1d1-4c6d-4f94-bfe9-136afa482ba6',
      platformAddress: 'test2@soralia.org',
      street: 'Test St',
      unit: '2',
      ownerId: 'NONEXISTENT-USER',
      homeImage: null,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing().returning();
    console.log('FK-violation insert result (returning):', res);
  } catch (e: any) {
    console.log('FK-violation insert THREW:', e.cause?.message ?? e.message);
  }

  // Check if any test-prop-* rows exist
  const r = await db.execute(`SELECT id, "ownerId" FROM "Property" WHERE id LIKE 'test-prop-%'` as any);
  console.log('test-prop-* rows:', (r as any).rows);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
