import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import 'dotenv/config';
import { properties } from '@schema/properties';
import { users } from '@schema/users';
import { sql } from 'drizzle-orm';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!.replace('sslmode=require', 'sslmode=no-verify'),
  connectionTimeoutMillis: 15000,
});
const db = drizzle(pool);

async function main() {
  const props = await db.execute(
    sql`SELECT id, "tenantId" FROM "Property" WHERE id LIKE 'soralia-%' ORDER BY id`
  );
  console.log('Properties with soralia- prefix:', (props as any).rows);

  const tenants = await db.execute(sql`SELECT id, slug, name FROM "Tenant" ORDER BY name`);
  console.log('\nAll tenants:', (tenants as any).rows);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
