import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import 'dotenv/config';
import { properties } from '@schema/properties';
import { withTenantId, withTenantPrefix } from './seed-data/builder';
import { SORALIA_VILLAGE } from './seed-data/soralia-village';

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
  const tenantId = '3f55f1d1-4c6d-4f94-bfe9-136afa482ba6'; // real soralia
  const propRows = withTimestamps(
    withTenantId(tenantId, withTenantPrefix(SORALIA_VILLAGE.tenant.slug, SORALIA_VILLAGE.properties))
  );
  console.log(`Got ${propRows.length} properties to insert`);
  for (const p of propRows) {
    console.log('  ', p.id, '→ owner:', p.ownerId);
  }

  // Try inserting just the first one
  try {
    const r = await db.insert(properties).values(propRows[0]).onConflictDoNothing().returning();
    console.log('inserted:', r);
  } catch (e: any) {
    console.error('FAIL on', propRows[0].id, ':', e.cause?.message ?? e.message);
  }

  // Now insert them all one by one and report each
  for (let i = 0; i < propRows.length; i++) {
    try {
      const r = await db.insert(properties).values(propRows[i]).onConflictDoNothing().returning();
      console.log(`  ${i + 1}/${propRows.length} ${propRows[i].id}: ${r.length} row(s)`);
      // After each insert, check what's in the DB
      if (i === 0) {
        const check = await db.execute(`SELECT id FROM "Property" WHERE id = '${propRows[i].id}'` as any);
        console.log(`    DB has ${propRows[i].id}?`, (check as any).rows);
      }
    } catch (e: any) {
      console.error(`  ${i + 1}/${propRows.length} ${propRows[i].id} FAILED:`, e.cause?.message ?? e.message);
    }
  }

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
