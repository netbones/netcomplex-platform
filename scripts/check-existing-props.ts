import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import 'dotenv/config';
import { sql } from 'drizzle-orm';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!.replace('sslmode=require', 'sslmode=no-verify'),
  connectionTimeoutMillis: 15000,
});
const db = drizzle(pool);

async function main() {
  const r = await db.execute(sql`SELECT id, "ownerId", "tenantId" FROM "Property" WHERE "tenantId" = '3f55f1d1-4c6d-4f94-bfe9-136afa482ba6' ORDER BY id`);
  console.log('Soralia properties:');
  for (const row of (r as any).rows) console.log('  ', row);

  const r2 = await db.execute(sql`SELECT COUNT(*) FROM "Property"`);
  console.log('Total properties:', (r2 as any).rows[0]);

  // Check unique constraints on Property
  const r3 = await db.execute(`
    SELECT conname, contype
    FROM pg_constraint
    WHERE conrelid = '"Property"'::regclass
  `);
  console.log('\nProperty constraints:');
  for (const row of (r3 as any).rows) console.log('  ', row);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
