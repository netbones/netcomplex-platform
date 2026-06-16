/**
 * Multi-tenant seed orchestrator.
 *
 * The seed data for each tenant lives in `scripts/seed-data/<tenant>.ts`.
 * To add a new tenant, drop a new file in that directory and register it
 * in the `TENANTS` array below. Each tenant file exports a
 * `TenantSeedData` object that this script consumes.
 *
 * Run: pnpm db:seed
 * Run a specific tenant: pnpm db:seed -- --only=soralia-heights
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { tenants } from '@schema/tenants';
import { users } from '@schema/users';
import { properties } from '@schema/properties';
import { households } from '@schema/households';
import { profiles } from '@schema/profiles';
import { standardSeats } from '@schema/standard-seats';
import { soloSeats } from '@schema/solo-seats';
import { premiumSeats } from '@schema/premium-seats';
import { communityServiceListings } from '@schema/community-service-listings';
import { communityServiceReviews } from '@schema/community-service-reviews';
import { groups } from '@schema/groups';
import { groupMembers } from '@schema/group-members';
import { resources } from '@schema/resources';
import { contents } from '@schema/contents';
import { events } from '@schema/events';
import { surveys } from '@schema/surveys';
import { questions } from '@schema/questions';
import { responses } from '@schema/responses';
import { competitions } from '@schema/competitions';
import { maintenanceCategories } from '@schema/maintenance-categories';
import { maintenanceTeams } from '@schema/maintenance-teams';
import { serviceProviders } from '@schema/service-providers';
import { maintenanceRequests } from '@schema/maintenance-requests';
import { settings } from '@schema/settings';

import type { TenantSeedData } from './seed-data/types';
import { withTenantPrefix, withTenantId, newTenantId } from './seed-data/builder';
import { SORALIA_VILLAGE } from './seed-data/soralia-village';
import { SOLARIS_HEIGHTS } from './seed-data/solaris-heights';
import type { UserInput, HouseholdInput, ProfileInput } from './seed-data/types';

// ---------------------------------------------------------------------------
// Tenant registry
// ---------------------------------------------------------------------------
//
// Add a new tenant by:
//   1. Creating scripts/seed-data/<slug>.ts exporting a `TenantSeedData`
//   2. Adding it to this array
//
// Order matters: each tenant gets its own row, but they share the same DB.
// The orchestrator scopes every record by `tenantId` so concurrent tenants
// can coexist in dev/staging environments.

const TENANTS: TenantSeedData[] = [SORALIA_VILLAGE, SOLARIS_HEIGHTS];

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

const connectionString = (process.env.DATABASE_URL ?? '').replace(
  'sslmode=require',
  'sslmode=no-verify'
);

const pool = new Pool({ connectionString, connectionTimeoutMillis: 15000 });
const db = drizzle(pool);

// ---------------------------------------------------------------------------
// Per-entity defaults applied AFTER prefixing + tenantId stamping
// ---------------------------------------------------------------------------

/**
 * Stamp `createdAt` and `updatedAt` onto every record. The seed runs
 * idempotently, so all seeded rows share the same timestamp; the database
 * default of `now()` would normally handle this, but explicit stamping
 * makes the values deterministic in dev/test.
 */
function withTimestamps<T extends object>(
  records: T[]
): Array<T & { createdAt: Date; updatedAt: Date }> {
  const now = new Date();
  return records.map(r => ({ ...r, createdAt: now, updatedAt: now })) as Array<
    T & { createdAt: Date; updatedAt: Date }
  >;
}

/**
 * Add user defaults (`isPublic`, `isActive`, `emailVerified`). These fields
 * are NOT in the data files — they're stamped here so the seed data stays
 * declarative.
 */
function withUserDefaults(
  users: UserInput[]
): Array<UserInput & { isPublic: boolean; isActive: boolean; emailVerified: boolean }> {
  return users.map(u => ({
    ...u,
    isPublic: u.isPublic ?? true,
    isActive: u.isActive ?? true,
    emailVerified: u.emailVerified ?? true,
  })) as Array<UserInput & { isPublic: boolean; isActive: boolean; emailVerified: boolean }>;
}

function withProfileDefaults(profiles: ProfileInput[]): Array<
  ProfileInput & {
    isPublic: boolean;
    showEmail: boolean;
    showPhone: boolean;
    status: 'ACTIVE' | 'UPGRADED' | 'REMOVED' | 'EVICTED' | 'LEASE_ENDED';
  }
> {
  return profiles.map(p => ({
    ...p,
    isPublic: p.isPublic ?? true,
    showEmail: p.showEmail ?? true,
    showPhone: p.showPhone ?? true,
    status: (p.status as 'ACTIVE' | 'UPGRADED' | 'REMOVED' | 'EVICTED' | 'LEASE_ENDED') ?? 'ACTIVE',
  })) as Array<
    ProfileInput & {
      isPublic: boolean;
      showEmail: boolean;
      showPhone: boolean;
      status: 'ACTIVE' | 'UPGRADED' | 'REMOVED' | 'EVICTED' | 'LEASE_ENDED';
    }
  >;
}

function withHouseholdDefaults(
  households: HouseholdInput[]
): Array<HouseholdInput & { status: 'ACTIVE' | 'ARCHIVED' }> {
  return households.map(h => ({
    ...h,
    status: (h.status as 'ACTIVE' | 'ARCHIVED') ?? 'ACTIVE',
  })) as Array<HouseholdInput & { status: 'ACTIVE' | 'ARCHIVED' }>;
}

// ---------------------------------------------------------------------------
// Seed a single tenant
// ---------------------------------------------------------------------------

async function seedTenant(data: TenantSeedData): Promise<void> {
  const slug = data.tenant.slug;
  console.log(`\n🌱 Seeding ${data.tenant.name} (slug: ${slug})...\n`);

  // 1. Tenant row — upsert by slug so re-running is safe.
  console.log('Tenant...');
  const [tenantRow] = await db
    .insert(tenants)
    .values({
      id: newTenantId(),
      name: data.tenant.name,
      slug: data.tenant.slug,
      primaryColor: data.tenant.primaryColor,
      accentColor: data.tenant.accentColor,
      subscriptionTier: data.tenant.subscriptionTier,
      tier: data.tenant.tier,
      featureFlags: data.tenant.featureFlags,
      maxPages: 10,
      pageCount: 0,
      active: true,
    })
    .onConflictDoUpdate({
      target: tenants.slug,
      set: {
        name: data.tenant.name,
        primaryColor: data.tenant.primaryColor,
        accentColor: data.tenant.accentColor,
        active: true,
        tier: data.tenant.tier,
        subscriptionTier: data.tenant.subscriptionTier,
      },
    })
    .returning();
  const tenantId = tenantRow.id;
  console.log(`  ✓ tenant id ${tenantId}`);

  // 2. Apply per-tenant transforms in dependency order.
  // The `prefix` pass writes both `id` and FK fields; the `stamp` pass adds
  // `tenantId`. Specific entities get their own defaults layered on top.

  // Users
  console.log('Users...');
  const userRows = withTimestamps(
    withTenantId(tenantId, withUserDefaults(withTenantPrefix(slug, data.users)))
  );
  for (const u of userRows) {
    await db.insert(users).values(u).onConflictDoNothing();
  }
  console.log(`  ✓ ${userRows.length} users`);

  // Properties
  console.log('Properties...');
  const propRows = withTimestamps(withTenantId(tenantId, withTenantPrefix(slug, data.properties)));
  for (const p of propRows) {
    await db.insert(properties).values(p).onConflictDoNothing();
  }
  console.log(`  ✓ ${propRows.length} properties`);

  // Households (depend on properties)
  console.log('Households...');
  const hhRows = withTimestamps(
    withTenantId(tenantId, withHouseholdDefaults(withTenantPrefix(slug, data.households)))
  );
  for (const h of hhRows) {
    try {
      await db.insert(households).values(h).onConflictDoNothing();
    } catch (e) {
      console.error('   failed row:', h);
      throw e;
    }
  }
  console.log(`  ✓ ${hhRows.length} households`);

  // Profiles (depend on households, users)
  console.log('Profiles...');
  const profRows = withTimestamps(
    withTenantId(tenantId, withProfileDefaults(withTenantPrefix(slug, data.profiles)))
  );
  for (const p of profRows) {
    await db.insert(profiles).values(p).onConflictDoNothing();
  }
  console.log(`  ✓ ${profRows.length} profiles`);

  // Standard seats (depend on users, properties)
  console.log('Standard seats...');
  const seatRows = withTimestamps(
    withTenantId(tenantId, withTenantPrefix(slug, data.standardSeats))
  );
  for (const s of seatRows) {
    await db.insert(standardSeats).values(s).onConflictDoNothing();
  }
  console.log(`  ✓ ${seatRows.length} standard seats`);

  // Solo seats (depend on users, optional propertyId)
  console.log('Solo seats...');
  const soloRows = withTimestamps(
    withTenantId(tenantId, withTenantPrefix(slug, data.soloSeats ?? []))
  );
  for (const s of soloRows) {
    await db.insert(soloSeats).values(s).onConflictDoNothing();
  }
  console.log(`  ✓ ${soloRows.length} solo seats`);

  // Premium seats (depend on users)
  console.log('Premium seats...');
  const premRows = withTimestamps(
    withTenantId(tenantId, withTenantPrefix(slug, data.premiumSeats ?? []))
  );
  for (const p of premRows) {
    await db.insert(premiumSeats).values(p).onConflictDoNothing();
  }
  console.log(`  ✓ ${premRows.length} premium seats`);

  // Service listings
  console.log('Service listings...');
  const svcRows = withTimestamps(
    withTenantId(tenantId, withTenantPrefix(slug, data.serviceListings))
  );
  for (const s of svcRows) {
    await db.insert(communityServiceListings).values(s).onConflictDoNothing();
  }
  console.log(`  ✓ ${svcRows.length} service listings`);

  // Service reviews
  console.log('Service reviews...');
  const revRows = withTimestamps(
    withTenantId(tenantId, withTenantPrefix(slug, data.serviceReviews))
  );
  for (const r of revRows) {
    await db.insert(communityServiceReviews).values(r).onConflictDoNothing();
  }
  console.log(`  ✓ ${revRows.length} service reviews`);

  // Groups
  console.log('Groups...');
  const groupRows = withTimestamps(withTenantId(tenantId, withTenantPrefix(slug, data.groups)));
  for (const g of groupRows) {
    await db.insert(groups).values(g).onConflictDoNothing();
  }
  console.log(`  ✓ ${groupRows.length} groups`);

  // Group memberships
  console.log('Group memberships...');
  const ugRows = withTimestamps(withTenantId(tenantId, withTenantPrefix(slug, data.groupMembers)));
  for (const ug of ugRows) {
    await db.insert(groupMembers).values(ug).onConflictDoNothing();
  }
  console.log(`  ✓ ${ugRows.length} group memberships`);

  // Resources
  console.log('Resources...');
  const resRows = withTimestamps(withTenantId(tenantId, withTenantPrefix(slug, data.resources)));
  for (const r of resRows) {
    await db.insert(resources).values(r).onConflictDoNothing();
  }
  console.log(`  ✓ ${resRows.length} resources`);

  // Content (CMS)
  console.log('Content...');
  const contentRows = withTimestamps(withTenantId(tenantId, withTenantPrefix(slug, data.content)));
  for (const c of contentRows) {
    await db.insert(contents).values(c).onConflictDoUpdate({
      target: contents.id,
      set: { tenantId },
    });
  }
  console.log(`  ✓ ${contentRows.length} content items`);

  // Events
  console.log('Events...');
  const eventRows = withTimestamps(withTenantId(tenantId, withTenantPrefix(slug, data.events)));
  for (const e of eventRows) {
    await db.insert(events).values(e).onConflictDoNothing();
  }
  console.log(`  ✓ ${eventRows.length} events`);

  // Surveys
  console.log('Surveys...');
  const surveyRows = withTimestamps(withTenantId(tenantId, withTenantPrefix(slug, data.surveys)));
  for (const s of surveyRows) {
    await db.insert(surveys).values(s).onConflictDoNothing();
  }
  console.log(`  ✓ ${surveyRows.length} surveys`);

  // Survey questions
  console.log('Survey questions...');
  const questionRows = withTimestamps(
    withTenantId(tenantId, withTenantPrefix(slug, data.surveyQuestions))
  );
  for (const q of questionRows) {
    await db.insert(questions).values(q).onConflictDoNothing();
  }
  console.log(`  ✓ ${questionRows.length} questions`);

  // Survey responses
  console.log('Survey responses...');
  const responseRows = withTimestamps(
    withTenantId(tenantId, withTenantPrefix(slug, data.surveyResponses))
  );
  for (const r of responseRows) {
    await db.insert(responses).values(r).onConflictDoNothing();
  }
  console.log(`  ✓ ${responseRows.length} responses`);

  // Competitions
  console.log('Competitions...');
  const compRows = withTimestamps(
    withTenantId(tenantId, withTenantPrefix(slug, data.competitions))
  );
  for (const c of compRows) {
    await db.insert(competitions).values(c).onConflictDoNothing();
  }
  console.log(`  ✓ ${compRows.length} competitions`);

  // Maintenance categories
  console.log('Maintenance categories...');
  const catRows = withTimestamps(
    withTenantId(tenantId, withTenantPrefix(slug, data.maintenanceCategories))
  );
  for (const c of catRows) {
    await db.insert(maintenanceCategories).values(c).onConflictDoNothing();
  }
  console.log(`  ✓ ${catRows.length} maintenance categories`);

  // Maintenance teams
  console.log('Maintenance teams...');
  const teamRows = withTimestamps(
    withTenantId(tenantId, withTenantPrefix(slug, data.maintenanceTeams))
  );
  for (const t of teamRows) {
    await db.insert(maintenanceTeams).values(t).onConflictDoNothing();
  }
  console.log(`  ✓ ${teamRows.length} maintenance teams`);

  // Service providers
  console.log('Service providers...');
  const provRows = withTimestamps(
    withTenantId(tenantId, withTenantPrefix(slug, data.serviceProviders))
  );
  for (const p of provRows) {
    await db.insert(serviceProviders).values(p).onConflictDoNothing();
  }
  console.log(`  ✓ ${provRows.length} service providers`);

  // Maintenance requests
  console.log('Maintenance requests...');
  const reqRows = withTenantId(tenantId, withTenantPrefix(slug, data.maintenanceRequests));
  for (const r of reqRows) {
    await db.insert(maintenanceRequests).values(r).onConflictDoNothing();
  }
  console.log(`  ✓ ${reqRows.length} maintenance requests`);

  // Settings
  console.log('Settings...');
  const settingRows = withTenantId(tenantId, withTenantPrefix(slug, data.settings));
  for (const s of settingRows) {
    await db.insert(settings).values(s).onConflictDoNothing();
  }
  console.log(`  ✓ ${settingRows.length} settings`);

  console.log(`\n✅ ${data.tenant.name} seeded.\n`);
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

async function main() {
  // Parse --only=<slug> filter
  const onlyArg = process.argv.find(a => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.split('=')[1] : null;

  const targets = only ? TENANTS.filter(t => t.tenant.slug === only) : TENANTS;

  if (targets.length === 0) {
    console.error(
      `No tenant matched --only=${only}. Available: ${TENANTS.map(t => t.tenant.slug).join(', ')}`
    );
    process.exit(1);
  }

  console.log(
    `📦 Seeding ${targets.length} tenant(s): ${targets.map(t => t.tenant.slug).join(', ')}`
  );
  for (const t of targets) {
    await seedTenant(t);
  }
  console.log('🎉 All tenants seeded.');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    if (e.cause) console.error('   cause:', e.cause);
    if (e.code) console.error('   code:', e.code);
    if (e.detail) console.error('   detail:', e.detail);
    if (e.hint) console.error('   hint:', e.hint);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
