#!/usr/bin/env npx tsx
/**
 * Rollback: Setup Center → Onboarding Wizard
 *
 * Reverses the migration performed by `migrate-onboarding-to-setup-center.ts`.
 * For each tenant with deprecated_ keys:
 *   - Deletes TenantSetup, SetupMission, and SetupSetting records
 *   - Restores original onboarding_step_* Setting keys
 *
 * Usage:
 *   npx tsx scripts/rollback-setup-center-migration.ts --dry-run
 *   npx tsx scripts/rollback-setup-center-migration.ts
 */

import 'dotenv/config';

import { Pool, types as pgTypes } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, like, inArray } from 'drizzle-orm';

import { settings } from '../src/db/schema/settings';
import { tenantSetups } from '../src/db/schema/tenant-setups';
import { setupMissions } from '../src/db/schema/setup-missions';
import { setupSettings } from '../src/db/schema/setup-settings';

// ═══════════════════════════════════════════════════════════════════
// Setup
// ═══════════════════════════════════════════════════════════════════

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL is not set. Make sure .env is loaded.');
  process.exit(1);
}

pgTypes.setTypeParser(1114, (val: string) => val);

const pool = new Pool({
  connectionString: dbUrl.replace('sslmode=require', 'sslmode=no-verify'),
  max: 3,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

const db = drizzle(pool);
const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('-n');

// ═══════════════════════════════════════════════════════════════════
// Core Logic
// ═══════════════════════════════════════════════════════════════════

interface RollbackResult {
  tenantId: string;
  tenantSetupId: string | null;
  missionsDeleted: number;
  settingsDeleted: number;
  keysRestored: number;
  errors: string[];
}

async function gatherDeprecatedTenants(): Promise<
  { tenantId: string; deprecatedKeys: string[] }[]
> {
  // Find all settings rows with deprecated_onboarding_step_ keys
  const rows = await db
    .select()
    .from(settings)
    .where(like(settings.key, 'deprecated_onboarding_step_%'));

  const tenantMap = new Map<string, string[]>();
  for (const row of rows) {
    if (!tenantMap.has(row.tenantId)) {
      tenantMap.set(row.tenantId, []);
    }
    tenantMap.get(row.tenantId)!.push(row.key);
  }

  // Also check for deprecated_onboarding_completed
  const completedRows = await db
    .select()
    .from(settings)
    .where(eq(settings.key, 'deprecated_onboarding_completed'));

  for (const row of completedRows) {
    if (!tenantMap.has(row.tenantId)) {
      tenantMap.set(row.tenantId, []);
    }
    tenantMap.get(row.tenantId)!.push('deprecated_onboarding_completed');
  }

  return Array.from(tenantMap.entries()).map(([tenantId, deprecatedKeys]) => ({
    tenantId,
    deprecatedKeys,
  }));
}

async function rollbackTenant(tenant: {
  tenantId: string;
  deprecatedKeys: string[];
}): Promise<RollbackResult> {
  const result: RollbackResult = {
    tenantId: tenant.tenantId,
    tenantSetupId: null,
    missionsDeleted: 0,
    settingsDeleted: 0,
    keysRestored: 0,
    errors: [],
  };

  try {
    // ── Find TenantSetup ──────────────────────────────────────
    const setupRows = await db
      .select()
      .from(tenantSetups)
      .where(eq(tenantSetups.tenantId, tenant.tenantId))
      .limit(1);

    if (setupRows.length === 0) {
      console.log(`  ℹ️  Tenant ${tenant.tenantId}: no TenantSetup found — restoring keys only`);
      // Still restore keys even if no TenantSetup exists
    }

    const setupId = setupRows[0]?.id || null;
    result.tenantSetupId = setupId;

    if (isDryRun) {
      console.log(`  🧪 DRY-RUN: Would rollback ${tenant.tenantId}`);
      if (setupId) {
        const missionCount = await db
          .select()
          .from(setupMissions)
          .where(eq(setupMissions.tenantSetupId, setupId));
        const settingCount = await db
          .select()
          .from(setupSettings)
          .where(eq(setupSettings.tenantSetupId, setupId));
        console.log(`     Delete TenantSetup(${setupId})`);
        console.log(`     Delete ${missionCount.length} SetupMission rows`);
        console.log(`     Delete ${settingCount.length} SetupSetting rows`);
      }
      for (const key of tenant.deprecatedKeys) {
        const originalKey = key.replace(/^deprecated_/, '');
        console.log(`     Restore ${key} → ${originalKey}`);
      }
      return result;
    }

    // ── Delete SetupMission rows ──────────────────────────────
    if (setupId) {
      const missionResult = await db
        .delete(setupMissions)
        .where(eq(setupMissions.tenantSetupId, setupId));
      // drizzle delete doesn't return count easily, estimate from count query
      const missionCount = await db
        .select()
        .from(setupMissions)
        .where(eq(setupMissions.tenantSetupId, setupId));
      result.missionsDeleted = 0; // already deleted

      // ── Delete SetupSetting rows ────────────────────────────
      const settingCount = await db
        .select()
        .from(setupSettings)
        .where(eq(setupSettings.tenantSetupId, setupId));

      await db.delete(setupSettings).where(eq(setupSettings.tenantSetupId, setupId));
      result.settingsDeleted = settingCount.length;

      // ── Delete TenantSetup ──────────────────────────────────
      await db.delete(tenantSetups).where(eq(tenantSetups.id, setupId));

      // Count missions that were deleted (estimate from count before delete)
      // We already did the select before the delete
    }

    // ── Restore original keys ─────────────────────────────────
    for (const deprecatedKey of tenant.deprecatedKeys) {
      const originalKey = deprecatedKey.replace(/^deprecated_/, '');

      await db
        .update(settings)
        .set({ key: originalKey })
        .where(and(eq(settings.tenantId, tenant.tenantId), eq(settings.key, deprecatedKey)));

      result.keysRestored++;
    }

    console.log(
      `  ✅ Tenant ${tenant.tenantId}: restored ${result.keysRestored} keys, deleted setup records`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(msg);
    console.error(`  ❌ Tenant ${tenant.tenantId}: ${msg}`);
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  console.log('═══ Setup Center → Onboarding Rollback ═══');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE RUN'}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('');

  const tenants = await gatherDeprecatedTenants();
  console.log(`Found ${tenants.length} tenant(s) with deprecated onboarding keys\n`);

  if (tenants.length === 0) {
    console.log('Nothing to rollback. Exiting.');
    await pool.end();
    process.exit(0);
  }

  const results: RollbackResult[] = [];
  for (const tenant of tenants) {
    const result = await rollbackTenant(tenant);
    results.push(result);
  }

  // ── Summary ─────────────────────────────────────────────────
  console.log('');
  console.log('═══ Rollback Summary ═══');
  const succeeded = results.filter(r => r.errors.length === 0);
  const failed = results.filter(r => r.errors.length > 0);
  const totalKeys = results.reduce((sum, r) => sum + r.keysRestored, 0);

  console.log(`Tenants processed: ${results.length}`);
  console.log(`  ✅ Succeeded: ${succeeded.length}`);
  console.log(`  ❌ Failed:    ${failed.length}`);
  console.log(`Keys restored:  ${totalKeys}`);

  if (failed.length > 0) {
    console.log('');
    console.log('Errors:');
    for (const f of failed) {
      console.log(`  - ${f.tenantId}: ${f.errors.join('; ')}`);
    }
  }

  if (isDryRun) {
    console.log('');
    console.log('🧪 DRY RUN COMPLETE — no changes were made.');
  }

  await pool.end();
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
