#!/usr/bin/env npx tsx
/**
 * Data Migration: Onboarding Wizard → Setup Center
 *
 * Reads legacy `onboarding_step_N` Setting keys and creates structured
 * TenantSetup + SetupMission + SetupSetting records for each tenant.
 *
 * Features:
 *   - Dry-run mode (--dry-run): prints what would happen, doesn't commit
 *   - Idempotent: running twice won't duplicate data (skip if TenantSetup exists)
 *   - Per-tenant error isolation: one bad tenant doesn't block others
 *   - Preserves old data: renames keys to deprecated_ prefix (no DELETE)
 *
 * Usage:
 *   npx tsx scripts/migrate-onboarding-to-setup-center.ts --dry-run
 *   npx tsx scripts/migrate-onboarding-to-setup-center.ts
 */

import 'dotenv/config';

import { Pool, types as pgTypes } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, like, sql, inArray, isNull } from 'drizzle-orm';

// Schema tables — imported via relative paths to avoid tsconfig alias issues
import { settings } from '../src/db/schema/settings';
import { tenantSetups } from '../src/db/schema/tenant-setups';
import { setupMissions } from '../src/db/schema/setup-missions';
import { setupSettings } from '../src/db/schema/setup-settings';

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

interface StepData {
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
  };
  modules?: Record<string, boolean>;
  facilities?: unknown[];
  maintenanceCategories?: unknown[];
  pages?: Record<string, boolean>;
  invites?: { email: string; role: string }[];
  [key: string]: unknown;
}

interface TenantStepMap {
  tenantId: string;
  steps: Map<number, StepData>;
  completed: boolean;
}

interface MigrationResult {
  tenantId: string;
  tenantSetupId: string | null;
  missionsCreated: number;
  settingsCreated: number;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════
// Setup
// ═══════════════════════════════════════════════════════════════════

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL is not set. Make sure .env is loaded.');
  process.exit(1);
}

// Override pg's default timestamp parser to return strings (matches Drizzle's date mode)
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
// Mission mapping: old wizard step → new SetupMission keys
// ═══════════════════════════════════════════════════════════════════

const STEP_TO_MISSIONS: Record<number, string[]> = {
  1: ['launch.identity', 'launch.branding'],
  2: ['configure.modules'],
  3: ['configure.facilities'],
  4: ['configure.maintenance'],
  5: ['configure.bookings'],
  6: ['populate.invite-board'],
  7: ['launch.domain', 'launch.timezone', 'launch.address'],
};

const MISSION_TITLES: Record<string, string> = {
  'launch.identity': 'Name your community',
  'launch.branding': 'Choose your brand',
  'launch.domain': 'Connect a domain',
  'launch.timezone': 'Set your timezone',
  'launch.address': 'Add your address',
  'configure.modules': 'Enable platform modules',
  'configure.facilities': 'Add facilities',
  'configure.maintenance': 'Configure maintenance',
  'configure.bookings': 'Set up bookings',
  'populate.invite-board': 'Invite board members',
};

const MISSION_SECTIONS: Record<string, string> = {
  'launch.identity': 'launch',
  'launch.branding': 'launch',
  'launch.domain': 'launch',
  'launch.timezone': 'launch',
  'launch.address': 'launch',
  'configure.modules': 'configure',
  'configure.facilities': 'configure',
  'configure.maintenance': 'configure',
  'configure.bookings': 'configure',
  'populate.invite-board': 'populate',
};

const REQUIRED_MISSIONS = new Set([
  'launch.identity',
  'launch.branding',
  'launch.domain',
  'launch.timezone',
  'launch.address',
]);

// ═══════════════════════════════════════════════════════════════════
// Core Logic
// ═══════════════════════════════════════════════════════════════════

function parseStepData(raw: string): StepData | null {
  try {
    return JSON.parse(raw) as StepData;
  } catch {
    console.warn(`  ⚠️  Failed to parse JSON value: ${raw.substring(0, 80)}...`);
    return null;
  }
}

async function gatherTenantSteps(): Promise<TenantStepMap[]> {
  // Find all settings rows with onboarding_step_ keys
  const allRows = await db.select().from(settings).where(like(settings.key, 'onboarding_step_%'));

  // Also check for onboarding_completed
  const completedRows = await db
    .select()
    .from(settings)
    .where(eq(settings.key, 'onboarding_completed'));

  const completedTenants = new Set(completedRows.map(r => r.tenantId));

  // Group steps by tenant
  const tenantMap = new Map<string, Map<number, StepData>>();

  for (const row of allRows) {
    const stepMatch = row.key.match(/^onboarding_step_(\d+)$/);
    if (!stepMatch) continue;

    const stepNum = parseInt(stepMatch[1], 10);
    const data = parseStepData(row.value);
    if (data === null) continue;

    if (!tenantMap.has(row.tenantId)) {
      tenantMap.set(row.tenantId, new Map());
    }
    tenantMap.get(row.tenantId)!.set(stepNum, data);
  }

  // Convert to array
  return Array.from(tenantMap.entries()).map(([tenantId, steps]) => ({
    tenantId,
    steps,
    completed: completedTenants.has(tenantId),
  }));
}

async function migrateTenant(tenant: TenantStepMap): Promise<MigrationResult> {
  const result: MigrationResult = {
    tenantId: tenant.tenantId,
    tenantSetupId: null,
    missionsCreated: 0,
    settingsCreated: 0,
    errors: [],
  };

  try {
    // ── Idempotency check ──────────────────────────────────────
    const existing = await db
      .select({ id: tenantSetups.id })
      .from(tenantSetups)
      .where(eq(tenantSetups.tenantId, tenant.tenantId))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  ℹ️  Tenant ${tenant.tenantId}: TenantSetup already exists (idempotent skip)`);
      result.tenantSetupId = existing[0].id;
      return result;
    }

    // ── Create TenantSetup ─────────────────────────────────────
    const setupId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Collect completed mission keys from step data
    const completedMissionKeys = new Set<string>();
    for (const [stepNum] of tenant.steps) {
      const missionKeys = STEP_TO_MISSIONS[stepNum] || [];
      for (const key of missionKeys) {
        completedMissionKeys.add(key);
      }
    }

    // Calculate completion percent
    const totalMissions = Object.keys(MISSION_TITLES).length;
    const completedCount = completedMissionKeys.size;
    const completionPercent =
      totalMissions > 0 ? Math.round((completedCount / totalMissions) * 100) : 0;

    // Determine completed sections
    const completedSections = new Set<string>();
    for (const key of completedMissionKeys) {
      completedSections.add(MISSION_SECTIONS[key] || 'configure');
    }

    const launchedAt = tenant.completed ? now : null;

    if (isDryRun) {
      console.log(`  🧪 DRY-RUN: Would create TenantSetup for ${tenant.tenantId}`);
      console.log(
        `     completionPercent=${completionPercent}%, completedSections=[${[...completedSections].join(', ')}]`
      );
      console.log(`     launchedAt=${launchedAt || 'null'}, missions=${completedMissionKeys.size}`);

      // Show what missions would be created
      const sortOrder = 0;
      for (const section of ['launch', 'populate', 'configure', 'grow']) {
        for (const key of Object.keys(MISSION_TITLES)) {
          if (MISSION_SECTIONS[key] === section) {
            const completed = completedMissionKeys.has(key);
            console.log(`     → mission ${key}: ${completed ? '✅ completed' : '⬜ pending'}`);
          }
        }
      }

      // Show deprecated rename
      console.log(`     → rename onboarding_step_* → deprecated_onboarding_step_*`);
      return result;
    }

    // ── Insert TenantSetup ────────────────────────────────────
    await db.insert(tenantSetups).values({
      id: setupId,
      tenantId: tenant.tenantId,
      completionPercent,
      completedSections: [...completedSections],
      launchedAt: launchedAt ? new Date(launchedAt) : null,
      lastViewedAt: null,
    });

    result.tenantSetupId = setupId;

    // ── Insert SetupMission rows ──────────────────────────────
    let sortOrder = 0;
    const sectionOrder = ['launch', 'populate', 'configure', 'grow'];

    for (const section of sectionOrder) {
      // Filter missions for this section
      const sectionMissionKeys = Object.keys(MISSION_TITLES).filter(
        k => MISSION_SECTIONS[k] === section
      );

      for (const missionKey of sectionMissionKeys) {
        const isCompleted = completedMissionKeys.has(missionKey);
        const completedAt = isCompleted ? new Date(now) : null;

        await db.insert(setupMissions).values({
          id: crypto.randomUUID(),
          tenantSetupId: setupId,
          section,
          missionKey,
          title: MISSION_TITLES[missionKey],
          description: null,
          isRequired: REQUIRED_MISSIONS.has(missionKey),
          isCompleted,
          completedAt,
          sortOrder: sortOrder++,
          metadata: null,
        });

        result.missionsCreated++;
      }
    }

    // ── Insert SetupSetting rows from step data ───────────────
    for (const [stepNum, stepData] of tenant.steps) {
      await db.insert(setupSettings).values({
        id: crypto.randomUUID(),
        tenantSetupId: setupId,
        key: `onboarding_step_${stepNum}`,
        value: stepData as unknown as Record<string, unknown>,
      });

      result.settingsCreated++;
    }

    // ── Rename old Setting keys to deprecated_ ─────────────────
    for (const stepNum of tenant.steps.keys()) {
      const oldKey = `onboarding_step_${stepNum}`;
      const newKey = `deprecated_${oldKey}`;

      await db
        .update(settings)
        .set({ key: newKey })
        .where(and(eq(settings.tenantId, tenant.tenantId), eq(settings.key, oldKey)));
    }

    // Rename onboarding_completed → deprecated_onboarding_completed
    if (tenant.completed) {
      await db
        .update(settings)
        .set({ key: 'deprecated_onboarding_completed' })
        .where(
          and(eq(settings.tenantId, tenant.tenantId), eq(settings.key, 'onboarding_completed'))
        );
    }

    console.log(
      `  ✅ Tenant ${tenant.tenantId}: created Setup (${completedMissionKeys.size} missions, ${result.settingsCreated} settings)`
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
  console.log('═══ Onboarding → Setup Center Migration ═══');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE RUN'}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('');

  // Gather tenants with onboarding data
  const tenants = await gatherTenantSteps();
  console.log(`Found ${tenants.length} tenant(s) with onboarding data\n`);

  if (tenants.length === 0) {
    console.log('Nothing to migrate. Exiting.');
    await pool.end();
    process.exit(0);
  }

  // Migrate each tenant
  const results: MigrationResult[] = [];
  for (const tenant of tenants) {
    const result = await migrateTenant(tenant);
    results.push(result);
  }

  // ── Summary ─────────────────────────────────────────────────
  console.log('');
  console.log('═══ Migration Summary ═══');
  const succeeded = results.filter(r => r.errors.length === 0);
  const failed = results.filter(r => r.errors.length > 0);
  const totalMissions = results.reduce((sum, r) => sum + r.missionsCreated, 0);
  const totalSettings = results.reduce((sum, r) => sum + r.settingsCreated, 0);

  console.log(`Tenants processed: ${results.length}`);
  console.log(`  ✅ Succeeded: ${succeeded.length}`);
  console.log(`  ❌ Failed:    ${failed.length}`);
  console.log(`Missions created: ${totalMissions}`);
  console.log(`Settings created: ${totalSettings}`);

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
