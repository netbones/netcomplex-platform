/**
 * Backfill Tenant Records Migration Script
 *
 * This script migrates existing records that are missing tenant_id to a default tenant.
 * It supports dry-run mode to preview changes before applying them.
 *
 * Usage:
 *   npx tsx scripts/backfill-tenant-records.ts --dry-run  # Preview changes
 *   npx tsx scripts/backfill-tenant-records.ts             # Apply changes
 */

import { db } from '../src/lib/db';
import {
  tenants,
  users,
  households,
  bookings,
  maintenanceRequests,
  notifications,
  events,
  conversations,
  messages,
  surveys,
  announcements,
  groups,
  albums,
  contents,
  invitations,
  communityServiceListings,
  communityServiceInquiries,
  communityServiceReviews,
  propertyListings,
  agentProfiles,
  agentAccesses,
  profiles,
  settings,
  platformSuspensions,
  externalSurveys,
  standardSeats,
  premiumSeats,
  soloSeats,
  members,
  userGroups,
  groupMembershipRequests,
  conversationParticipants,
  questions,
  responses,
} from '../src/lib/db';
import { eq, isNull, sql } from 'drizzle-orm';

const DEFAULT_TENANT_SLUG = 'soralia';
const DEFAULT_TENANT_NAME = 'Soralia Village';

interface MigrationResult {
  table: string;
  recordsFound: number;
  recordsUpdated: number;
  status: 'success' | 'error' | 'skipped';
  error?: string;
}

async function getOrCreateDefaultTenant(): Promise<string | null> {
  // Check if tenant exists
  const existingTenant = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, DEFAULT_TENANT_SLUG))
    .limit(1);

  if (existingTenant[0]) {
    console.log(`Found default tenant: ${existingTenant[0].name} (${existingTenant[0].id})`);
    return existingTenant[0].id;
  }

  // Create default tenant
  console.log(`Creating default tenant: ${DEFAULT_TENANT_NAME}`);
  const newTenant = await db
    .insert(tenants)
    .values({
      id: crypto.randomUUID(),
      name: DEFAULT_TENANT_NAME,
      slug: DEFAULT_TENANT_SLUG,
      customDomain: null,
      logoUrl: null,
      faviconUrl: null,
      primaryColor: '#4F46E5',
      accentColor: '#F59E0B',
      secondaryColor: null,
      fontFamily: 'Inter',
      customCss: null,
      active: true,
      subscriptionTier: 'forest',
      maxPages: -1,
      pageCount: 0,
      featureFlags: {},
    })
    .returning();

  console.log(`Created default tenant: ${newTenant[0].name} (${newTenant[0].id})`);
  return newTenant[0].id;
}

async function migrateTable(
  tableName: string,
  tenantColumn: string,
  tenantId: string,
  dryRun: boolean
): Promise<MigrationResult> {
  try {
    // Count records without tenant_id using raw SQL to avoid type issues
    const countResult = await db.execute(
      sql`SELECT COUNT(*) as count FROM ${sql.identifier(tableName)} WHERE ${sql.identifier(tenantColumn)} IS NULL OR ${sql.identifier(tenantColumn)} = ''`
    );

    const count = Number(countResult.rows?.[0]?.count || 0);

    if (count === 0) {
      return {
        table: tableName,
        recordsFound: 0,
        recordsUpdated: 0,
        status: 'skipped',
      };
    }

    console.log(`  Found ${count} records without tenant_id in ${tableName}`);

    if (dryRun) {
      return {
        table: tableName,
        recordsFound: count,
        recordsUpdated: 0,
        status: 'success',
      };
    }

    // Update records using raw SQL
    await db.execute(
      sql`UPDATE ${sql.identifier(tableName)} SET ${sql.identifier(tenantColumn)} = ${tenantId} WHERE ${sql.identifier(tenantColumn)} IS NULL OR ${sql.identifier(tenantColumn)} = ''`
    );

    return {
      table: tableName,
      recordsFound: count,
      recordsUpdated: count,
      status: 'success',
    };
  } catch (error) {
    return {
      table: tableName,
      recordsFound: 0,
      recordsUpdated: 0,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Tables to migrate with their tenant column names
const TABLES_TO_MIGRATE = [
  { table: 'users', tenantColumn: 'tenantId' },
  { table: 'households', tenantColumn: 'tenantId' },
  { table: 'bookings', tenantColumn: 'tenantId' },
  { table: 'maintenance_requests', tenantColumn: 'tenantId' },
  { table: 'notifications', tenantColumn: 'tenantId' },
  { table: 'events', tenantColumn: 'tenantId' },
  { table: 'conversations', tenantColumn: 'tenantId' },
  { table: 'messages', tenantColumn: 'tenantId' },
  { table: 'surveys', tenantColumn: 'tenantId' },
  { table: 'announcements', tenantColumn: 'tenantId' },
  { table: 'groups', tenantColumn: 'tenantId' },
  { table: 'albums', tenantColumn: 'tenantId' },
  { table: 'contents', tenantColumn: 'tenantId' },
  { table: 'invitations', tenantColumn: 'tenantId' },
  { table: 'community_service_listings', tenantColumn: 'tenantId' },
  { table: 'community_service_inquiries', tenantColumn: 'tenantId' },
  { table: 'community_service_reviews', tenantColumn: 'tenantId' },
  { table: 'property_listings', tenantColumn: 'tenantId' },
  { table: 'agent_profiles', tenantColumn: 'tenantId' },
  { table: 'agent_accesses', tenantColumn: 'tenantId' },
  { table: 'profiles', tenantColumn: 'tenantId' },
  { table: 'settings', tenantColumn: 'tenantId' },
  { table: 'platform_suspensions', tenantColumn: 'tenantId' },
  { table: 'external_surveys', tenantColumn: 'tenantId' },
  { table: 'standard_seats', tenantColumn: 'tenantId' },
  { table: 'premium_seats', tenantColumn: 'tenantId' },
  { table: 'solo_seats', tenantColumn: 'tenantId' },
  { table: 'members', tenantColumn: 'tenantId' },
  { table: 'user_groups', tenantColumn: 'tenantId' },
  { table: 'group_membership_requests', tenantColumn: 'tenantId' },
  { table: 'conversation_participants', tenantColumn: 'tenantId' },
  { table: 'questions', tenantColumn: 'tenantId' },
  { table: 'responses', tenantColumn: 'tenantId' },
];

export async function backfillTenantRecords(dryRun: boolean = false): Promise<MigrationResult[]> {
  console.log('=== Tenant Records Backfill Migration ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE RUN'}`);
  console.log('');

  // Get or create default tenant
  const tenantId = await getOrCreateDefaultTenant();

  if (!tenantId) {
    console.error('Failed to get or create default tenant');
    process.exit(1);
  }

  console.log('');
  console.log('Starting migration...');
  console.log('');

  const results: MigrationResult[] = [];

  for (const config of TABLES_TO_MIGRATE) {
    const result = await migrateTable(config.table, config.tenantColumn, tenantId, dryRun);
    results.push(result);

    if (result.status === 'success' && result.recordsFound > 0) {
      console.log(`  → Would update ${result.recordsUpdated} records`);
    }
  }

  console.log('');
  console.log('=== Migration Complete ===');
  console.log('');

  // Summary
  const totalFound = results.reduce((sum, r) => sum + r.recordsFound, 0);
  const totalUpdated = results.reduce((sum, r) => sum + r.recordsUpdated, 0);
  const errors = results.filter(r => r.status === 'error');

  console.log(`Total records found without tenant_id: ${totalFound}`);
  console.log(`Total records ${dryRun ? 'would be' : ''} updated: ${totalUpdated}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('');
    console.log('Errors:');
    for (const error of errors) {
      console.log(`  - ${error.table}: ${error.error}`);
    }
  }

  return results;
}

// CLI execution
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-n');

backfillTenantRecords(dryRun)
  .then(() => {
    console.log('');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
