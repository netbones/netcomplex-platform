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
  const id = 'soralia-prop-noocn-' + Date.now();
  try {
    const r = await db.insert(properties).values({
      id,
      tenantId: '3f55f1d1-4c6d-4f94-bfe9-136afa482ba6',
      platformAddress: 'noocn@soralia.org',
      street: 'Test',
      unit: '99',
      ownerId: 'soralia-user-john-smith',
      homeImage: null,
      createdAt: now,
      updatedAt: now,
    }).returning();
    console.log('NO OCN result:', r);
  } catch (e: any) {
    console.log('NO OCN THREW:', e.cause?.message ?? e.message);
  }

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
