import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import 'dotenv/config';
import { properties } from '@schema/properties';
import { withTenantId, withTenantPrefix } from './seed-data/builder';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!.replace('sslmode=require', 'sslmode=no-verify'),
  connectionTimeoutMillis: 15000,
});
const db = drizzle(pool);

function withTimestamps<T extends object>(records: T[]): Array<T & { createdAt: Date; updatedAt: Date }> {
  const now = new Date();
  return records.map(r => ({ ...r, createdAt: now, updatedAt: now })) as Array<T & { createdAt: Date; updatedAt: Date }>;
}

async function main() {
  const data = [{
    id: 'prop-001',
    platformAddress: 'unit012@soralia.org',
    street: 'Pagoda Rd',
    unit: '12',
    ownerId: 'user-john-smith',
    homeImage: '/assets/images/home1.jpg',
  }];

  // EXACTLY what the orchestrator does
  const propRows = withTimestamps(withTenantId('test-tenant-uuid', withTenantPrefix('soralia', data)));
  console.log('Final row to insert:', JSON.stringify(propRows, null, 2));

  try {
    const res = await db.insert(properties).values(propRows[0]).onConflictDoNothing().returning();
    console.log('Insert result:', res);
  } catch (e) {
    console.error('Insert error:', (e as any).cause?.message ?? e);
  }

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
