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

async function main() {
  const data = {
    id: 'prop-001',
    platformAddress: 'unit012@soralia.org',
    street: 'Pagoda Rd',
    unit: '12',
    ownerId: 'user-john-smith',
    homeImage: '/assets/images/home1.jpg',
  };

  // Simulate the orchestrator's pipeline
  const prefixed = withTenantPrefix('soralia', [{ ...data, ownerId: 'user-john-smith' }]);
  console.log('After prefix:', prefixed);

  const now = new Date();
  const stamped = prefixed.map(r => ({ ...r, createdAt: now, updatedAt: now, tenantId: 'test-tenant' }));
  console.log('After stamp:', stamped);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
