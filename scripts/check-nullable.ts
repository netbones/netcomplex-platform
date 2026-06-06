import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!.replace('sslmode=require', 'sslmode=no-verify'),
  connectionTimeoutMillis: 15000,
});
const db = drizzle(pool);

async function main() {
  const TABLES = [
    'Household', 'Profile', 'StandardSeat', 'communityServiceListing', 'communityServiceReview',
    'group', 'UserGroup', 'Resource', 'Content', 'Event',
    'Survey', 'Question', 'Response', 'Competition',
    'MaintenanceCategory', 'MaintenanceTeam', 'ServiceProvider',
    'MaintenanceRequest', 'Setting', 'user', 'Property',
  ];

  for (const t of TABLES) {
    const result = await db.execute(
      `SELECT column_name, is_nullable, data_type
       FROM information_schema.columns
       WHERE table_name = '${t}'
         AND (column_name LIKE '%organization%' OR column_name = 'subcategory')
       ORDER BY column_name` as any
    );
    const rows = (result as any).rows || [];
    if (rows.length > 0) {
      console.log(`${t}:`, rows.map((r: any) => `${r.column_name}=${r.is_nullable}`).join(', '));
    }
  }
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
