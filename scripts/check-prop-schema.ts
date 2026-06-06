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
  const r = await db.execute(
    sql`SELECT column_name, is_nullable, column_default, data_type
        FROM information_schema.columns
        WHERE table_name = 'Property'
        ORDER BY ordinal_position`
  );
  for (const row of (r as any).rows) {
    console.log(`  ${row.column_name.padEnd(25)} ${row.data_type.padEnd(20)} nullable=${row.is_nullable} default=${row.column_default ?? 'NULL'}`);
  }
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
