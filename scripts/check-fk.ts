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
  // Check if user exists
  const u = await db.execute(sql`SELECT id, email FROM "user" WHERE id = 'soralia-user-john-smith'`);
  console.log('User soralia-user-john-smith:', (u as any).rows);

  const u2 = await db.execute(sql`SELECT id, email FROM "user" WHERE id LIKE 'soralia-%' LIMIT 5`);
  console.log('Sample soralia users:', (u2 as any).rows);

  const u3 = await db.execute(sql`SELECT COUNT(*) FROM "user" WHERE id LIKE 'soralia-%'`);
  console.log('Total soralia users:', (u3 as any).rows[0]);

  const u4 = await db.execute(sql`SELECT COUNT(*) FROM "user"`);
  console.log('Total users in DB:', (u4 as any).rows[0]);

  const p = await db.execute(sql`SELECT id, "ownerId" FROM "Property" WHERE id = 'soralia-prop-001'`);
  console.log('Property soralia-prop-001:', (p as any).rows);

  const p2 = await db.execute(sql`SELECT id, "ownerId" FROM "Property" WHERE "ownerId" = 'soralia-user-john-smith'`);
  console.log('Properties owned by soralia-user-john-smith:', (p2 as any).rows);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
