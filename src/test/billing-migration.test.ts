/**
 * RED-phase test: Verifies that the 10 billing foundation tables exist.
 * Before migration, this SHOULD FAIL (0 tables found).
 * After migration (GREEN), it SHOULD PASS (10 tables found).
 */
import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const BILLING_TABLES = [
  'BillingPlan',
  'TenantSubscription',
  'TenantInvoice',
  'TenantPayment',
  'BillingAdjustment',
  'BillingEvent',
  'Coupon',
  'CouponRedemption',
  'TaxRate',
  'TaxJurisdiction',
];

describe('Billing Migration — 10 Foundation Tables', () => {
  it('should have all 10 billing tables in the database', async () => {
    const connectionString = (process.env.DATABASE_URL ?? '').replace(
      'sslmode=require',
      'sslmode=no-verify'
    );
    const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 10000 });

    try {
      const result = await pool.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1)`,
        [BILLING_TABLES]
      );
      const foundTables = result.rows.map((r: { table_name: string }) => r.table_name);
      const missing = BILLING_TABLES.filter(t => !foundTables.includes(t));

      expect(foundTables).toHaveLength(10);
      expect(missing).toEqual([]);
    } finally {
      await pool.end();
    }
  });
});
