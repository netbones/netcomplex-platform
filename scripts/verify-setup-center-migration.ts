#!/usr/bin/env npx tsx
/**
 * Setup Center Migration Verification
 *
 * Validates that the onboarding → setup center migration was successful:
 *   1. Every tenant with deprecated_onboarding_step_* has a TenantSetup record
 *   2. completionPercent is within 0–100 range
 *   3. No orphan SetupMission records (all have valid tenantSetupId)
 *   4. Deprecated keys exist (proving old data wasn't deleted)
 *
 * Exits 0 on success, 1 on failure with error details.
 *
 * Usage:
 *   npx tsx scripts/verify-setup-center-migration.ts
 */

import 'dotenv/config';

import { Pool, types as pgTypes } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, like, sql } from 'drizzle-orm';

import { settings } from '../src/db/schema/settings';
import { tenantSetups } from '../src/db/schema/tenant-setups';
import { setupMissions } from '../src/db/schema/setup-missions';

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

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

interface VerifyResult {
  check: string;
  passed: boolean;
  detail: string;
}

const results: VerifyResult[] = [];

function addResult(check: string, passed: boolean, detail: string): void {
  results.push({ check, passed, detail });
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} ${check}: ${detail}`);
}

// ═══════════════════════════════════════════════════════════════════
// Checks
// ═══════════════════════════════════════════════════════════════════

async function runChecks(): Promise<void> {
  console.log('═══ Setup Center Migration Verification ═══');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('');

  // ── Check 1: Count records ──────────────────────────────────
  const [tenantSetupCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tenantSetups);

  const [missionCount] = await db.select({ count: sql<number>`count(*)::int` }).from(setupMissions);

  const deprecatedStepRows = await db
    .select()
    .from(settings)
    .where(like(settings.key, 'deprecated_onboarding_step_%'));

  const legacyStepRows = await db
    .select()
    .from(settings)
    .where(like(settings.key, 'onboarding_step_%'));

  addResult(
    'TenantSetup records exist',
    (tenantSetupCount?.count ?? 0) > 0,
    `${tenantSetupCount?.count ?? 0} TenantSetup record(s)`
  );

  addResult(
    'SetupMission records exist',
    (missionCount?.count ?? 0) > 0,
    `${missionCount?.count ?? 0} SetupMission record(s)`
  );

  addResult(
    'Deprecated keys exist (old data preserved)',
    deprecatedStepRows.length > 0,
    `${deprecatedStepRows.length} deprecated onboarding step key(s)`
  );

  addResult(
    'No legacy onboarding_step_ keys remain',
    legacyStepRows.length === 0,
    legacyStepRows.length === 0
      ? 'All keys renamed to deprecated_ prefix'
      : `${legacyStepRows.length} keys NOT renamed`
  );

  // ── Check 2: Every deprecated tenant has a TenantSetup ───────
  const deprecatedTenants = new Set(deprecatedStepRows.map(r => r.tenantId));

  if (deprecatedTenants.size > 0) {
    let missingSetup = 0;
    for (const tid of deprecatedTenants) {
      const [row] = await db
        .select({ id: tenantSetups.id })
        .from(tenantSetups)
        .where(eq(tenantSetups.tenantId, tid))
        .limit(1);

      if (!row) {
        missingSetup++;
        console.log(`     ⚠️  Tenant ${tid}: has deprecated keys but no TenantSetup`);
      }
    }

    addResult(
      'All deprecated tenants have TenantSetup',
      missingSetup === 0,
      missingSetup === 0
        ? `${deprecatedTenants.size}/${deprecatedTenants.size} matched`
        : `${missingSetup} tenant(s) missing TenantSetup`
    );
  } else {
    addResult(
      'Tenant-deprecated-steps → TenantSetup mapping',
      true,
      'No deprecated keys found (nothing to verify)'
    );
  }

  // ── Check 3: completionPercent range ────────────────────────
  const allSetups = await db.select().from(tenantSetups);
  const badPercent = allSetups.filter(s => s.completionPercent < 0 || s.completionPercent > 100);

  addResult(
    'completionPercent within 0–100',
    badPercent.length === 0,
    badPercent.length === 0
      ? `${allSetups.length} setup(s) all valid`
      : `${badPercent.length} setup(s) with invalid completionPercent`
  );

  // ── Check 4: No orphan missions ─────────────────────────────
  const allSetupIds = new Set(allSetups.map(s => s.id));
  const allMissions = await db.select().from(setupMissions);
  const orphans = allMissions.filter(m => !allSetupIds.has(m.tenantSetupId));

  addResult(
    'No orphan SetupMission records',
    orphans.length === 0,
    orphans.length === 0
      ? `${allMissions.length} missions all linked`
      : `${orphans.length} orphan mission(s)`
  );

  // Report orphan details
  for (const orphan of orphans) {
    console.log(`     ⚠️  orphan mission: ${orphan.id} (tenantSetupId=${orphan.tenantSetupId})`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  await runChecks();

  console.log('');
  console.log('═══ Verification Summary ═══');

  const passed = results.filter(r => r.passed);
  const failed = results.filter(r => !r.passed);

  console.log(`  ✅ Passed: ${passed.length}`);
  console.log(`  ❌ Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('');
    console.log('Failed checks:');
    for (const f of failed) {
      console.log(`  - ${f.check}: ${f.detail}`);
    }
  }

  await pool.end();
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
