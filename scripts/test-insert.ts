import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import 'dotenv/config';
import { properties } from '@schema/properties';
import { eq } from 'drizzle-orm';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!.replace('sslmode=require', 'sslmode=no-verify'),
  connectionTimeoutMillis: 15000,
});
const db = drizzle(pool);

async function main() {
  // Try inserting one property
  const tenantId = '3f55f1d1-4c6d-4f94-bfe9-136afa482ba6'; // soralia
  try {
    const res = await db
      .insert(properties)
      .values({
        id: 'soralia-prop-001',
        tenantId,
        platformAddress: 'unit012@soralia.org',
        street: 'Pagoda Rd',
        unit: '12',
        ownerId: 'soralia-user-john-smith',
        homeImage: '/assets/images/home1.jpg',
      })
      .onConflictDoNothing()
      .returning();
    console.log('Insert result:', res);
  } catch (e) {
    console.error('Insert error:', (e as any).cause?.message ?? e);
  }

  // Now read back
  const r = await db.select().from(properties).where(eq(properties.id, 'soralia-prop-001'));
  console.log('Read back:', r);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
