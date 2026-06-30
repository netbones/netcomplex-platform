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
import { eq } from 'drizzle-orm';
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
import { announcements } from '@schema/announcements';
import { subscriptionTiers } from '@schema/subscription-tiers';
import { providerReputations } from '@schema/provider-reputations';
import { providerMerits } from '@schema/provider-merits';
import { providerSubscriptions } from '@schema/provider-subscriptions';
import { paymentTransactions } from '@schema/payment-transactions';
import { providerCharges } from '@schema/provider-charges';
import { providerInvoices } from '@schema/provider-invoices';
import { revenueRecords } from '@schema/revenue-records';

import { billingPlans } from '@schema/billing-plans';
import { addresses } from '@schema/addresses';
import { getOrCreateDefaultBillingPlans } from '@shared/lib/billing/seed-plans';
import { platformModules } from '@schema/platform-modules';
import { dataRevenueStreams } from '@schema/data-revenue-streams';

import { achievementDefinitions } from '@schema/achievement-definitions';

import type { TenantSeedData } from './seed-data/types';
import { withTenantPrefix, withTenantId, newTenantId } from './seed-data/builder';
import { SORALIA_VILLAGE } from './seed-data/soralia-village';
import { SOLARIS_HEIGHTS } from './seed-data/solaris-heights';
import { DWalletStreams } from './seed-data/dwallet-streams';
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

  // Subscription tiers (tenant-scoped billing plans)
  console.log('Subscription tiers...');
  const tierRows = withTimestamps(
    withTenantId(tenantId, withTenantPrefix(slug, data.subscriptionTiers ?? []))
  );
  for (const t of tierRows) {
    await db.insert(subscriptionTiers).values(t).onConflictDoNothing();
  }
  console.log(`  ✓ ${tierRows.length} subscription tiers`);

  // Platform SaaS billing plans
  console.log('Billing plans...');
  const planRows = await getOrCreateDefaultBillingPlans(db, tenantId);
  console.log(`  ✓ ${(planRows as unknown[]).length} billing plans`);

  // Provider reputation
  console.log('Provider reputation...');
  const reputationRows = withTimestamps(
    withTenantId(tenantId, withTenantPrefix(slug, data.providerReputations ?? []))
  );
  for (const c of reputationRows) {
    await db.insert(providerReputations).values(c).onConflictDoNothing();
  }
  console.log(`  ✓ ${reputationRows.length} provider reputation`);

  // Provider merits
  console.log('Provider merits...');
  const meritRows = withTimestamps(
    withTenantId(tenantId, withTenantPrefix(slug, data.providerMerits ?? []))
  );
  for (const m of meritRows) {
    await db
      .insert(providerMerits)
      .values(m as typeof providerMerits.$inferInsert)
      .onConflictDoNothing();
  }
  console.log(`  ✓ ${meritRows.length} provider merits`);

  // Provider subscriptions
  console.log('Provider subscriptions...');
  const subRows = withTimestamps(
    withTenantId(tenantId, withTenantPrefix(slug, data.providerSubscriptions ?? []))
  );
  for (const s of subRows) {
    await db.insert(providerSubscriptions).values(s).onConflictDoNothing();
  }
  console.log(`  ✓ ${subRows.length} provider subscriptions`);

  // Payment transactions
  console.log('Payment transactions...');
  const pmtRows = withTimestamps(
    withTenantId(tenantId, withTenantPrefix(slug, data.paymentTransactions ?? []))
  );
  for (const p of pmtRows) {
    await db.insert(paymentTransactions).values(p).onConflictDoNothing();
  }
  console.log(`  ✓ ${pmtRows.length} payment transactions`);

  // Provider charges
  console.log('Provider charges...');
  const chargeRows = withTimestamps(
    withTenantId(tenantId, withTenantPrefix(slug, data.providerCharges ?? []))
  );
  for (const c of chargeRows) {
    await db.insert(providerCharges).values(c).onConflictDoNothing();
  }
  console.log(`  ✓ ${chargeRows.length} provider charges`);

  // Provider invoices
  console.log('Provider invoices...');
  const invoiceRows = withTimestamps(
    withTenantId(tenantId, withTenantPrefix(slug, data.providerInvoices ?? []))
  );
  for (const i of invoiceRows) {
    await db.insert(providerInvoices).values(i).onConflictDoNothing();
  }
  console.log(`  ✓ ${invoiceRows.length} provider invoices`);

  // Revenue records
  console.log('Revenue records...');
  const revenueRows = withTimestamps(
    withTenantId(tenantId, withTenantPrefix(slug, data.revenueRecords ?? []))
  );
  for (const r of revenueRows) {
    await db.insert(revenueRecords).values(r).onConflictDoNothing();
  }
  console.log(`  ✓ ${revenueRows.length} revenue records`);

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

  // Announcements
  console.log('Announcements...');
  const annRows = withTimestamps(
    withTenantId(tenantId, withTenantPrefix(slug, data.announcements ?? []))
  ).map(a => ({
    ...a,
    priority: a.priority ?? 'normal',
    targetFilter: a.targetFilter ?? 'ALL',
    targetRoles: (a.targetRoles ?? ['RESIDENT']) as (
      | 'RESIDENT'
      | 'BOARD'
      | 'ADMIN'
      | 'COMMITTEE'
      | 'AGENT'
      | 'GROUP_ADMIN'
      | 'MANAGER'
      | 'ASSOCIATE'
    )[],
  }));
  for (const a of annRows) {
    await db.insert(announcements).values(a).onConflictDoNothing();
  }
  console.log(`  ✓ ${annRows.length} announcements`);

  // dWallet data revenue streams (per-tenant)
  console.log('dWallet revenue streams...');
  const now = new Date();
  let streamCount = 0;
  for (const s of DWalletStreams) {
    await db
      .insert(dataRevenueStreams)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        key: s.key,
        label: s.label,
        description: s.description,
        residentSharePct: String(s.residentSharePct),
        isActive: s.isActive,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [dataRevenueStreams.tenantId, dataRevenueStreams.key],
        set: {
          label: s.label,
          description: s.description,
          residentSharePct: String(s.residentSharePct),
          isActive: s.isActive,
          updatedAt: now,
        },
      });
    streamCount++;
  }
  console.log(`  ✓ ${streamCount} revenue streams`);

  // System-reserved addresses
  await seedSystemAddresses(tenantId);
  console.log(`  ✓ system addresses seeded`);

  console.log(`\n✅ ${data.tenant.name} seeded.\n`);
}

// ---------------------------------------------------------------------------
// System-reserved addresses
// ---------------------------------------------------------------------------

const RESERVED_SYSTEM_NAMES = [
  'admin',
  'support',
  'system',
  'billing',
  'help',
  'maintenance',
  'security',
  'office',
  'community',
  'events',
];

async function seedSystemAddresses(tenantId: string): Promise<void> {
  const [tenant] = await db
    .select({ slug: tenants.slug, customDomain: tenants.customDomain })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    console.log('  ⚠ no tenant found for system addresses');
    return;
  }

  const domain = tenant.customDomain ?? `${tenant.slug}.netbones.co.za`;
  const now = new Date();

  for (const name of RESERVED_SYSTEM_NAMES) {
    const addr = `${name}@${domain}`;
    await db
      .insert(addresses)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        address: addr,
        localPart: name,
        domain,
        kind: 'SYSTEM',
        status: 'ACTIVE',
        ownerType: 'SYSTEM',
        receiveExternal: false,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: [addresses.tenantId, addresses.address] });
  }
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

  // Global seed: platform modules (not per-tenant)
  const PLATFORM_MODULE_SEEDS = [
    { key: 'dashboard', label: 'Dashboard', defaultEnabled: true, minTier: 'STANDARD' as const },
    { key: 'auth', label: 'Authentication', defaultEnabled: true, minTier: 'STANDARD' as const },
    {
      key: 'notifications',
      label: 'Notifications',
      defaultEnabled: true,
      minTier: 'STANDARD' as const,
    },
    { key: 'settings', label: 'Settings', defaultEnabled: true, minTier: 'STANDARD' as const },
    { key: 'directory', label: 'Directory', defaultEnabled: true, minTier: 'STANDARD' as const },
    { key: 'groups', label: 'Groups', defaultEnabled: true, minTier: 'STANDARD' as const },
    {
      key: 'maintenance',
      label: 'Maintenance Requests',
      defaultEnabled: true,
      minTier: 'STANDARD' as const,
    },
    {
      key: 'community_services',
      label: 'Community Services',
      defaultEnabled: true,
      minTier: 'STANDARD' as const,
    },
    {
      key: 'content',
      label: 'Content Management',
      defaultEnabled: true,
      minTier: 'STANDARD' as const,
    },
    {
      key: 'bookings',
      label: 'Facility Booking',
      defaultEnabled: true,
      minTier: 'STANDARD' as const,
    },
    {
      key: 'competitions',
      label: 'Competitions',
      defaultEnabled: true,
      minTier: 'STANDARD' as const,
    },
    {
      key: 'providers',
      label: 'Service Providers',
      defaultEnabled: true,
      minTier: 'STANDARD' as const,
    },
    {
      key: 'conservation',
      label: 'Conservation',
      defaultEnabled: true,
      minTier: 'STANDARD' as const,
    },
    {
      key: 'premium-seats',
      label: 'Premium Seats',
      defaultEnabled: true,
      minTier: 'STANDARD' as const,
    },
    {
      key: 'property-listings',
      label: 'Property Listings',
      defaultEnabled: true,
      minTier: 'STANDARD' as const,
    },
    {
      key: 'ai-provider',
      label: 'AI Provider',
      defaultEnabled: false,
      minTier: 'PREMIUM' as const,
    },
    {
      key: 'disputes',
      label: 'Dispute Resolution',
      defaultEnabled: false,
      minTier: 'PREMIUM' as const,
    },
    { key: 'dWallet', label: 'dWallet', defaultEnabled: false, minTier: 'PREMIUM' as const },
    {
      key: 'agent-marketplace',
      label: 'Agent Marketplace',
      defaultEnabled: false,
      minTier: 'PREMIUM' as const,
    },
    {
      key: 'white-label',
      label: 'White Label',
      defaultEnabled: false,
      minTier: 'ENTERPRISE' as const,
    },
  ];
  for (const seed of PLATFORM_MODULE_SEEDS) {
    await db
      .insert(platformModules)
      .values({ id: crypto.randomUUID(), ...seed })
      .onConflictDoNothing({ target: [platformModules.key] });
  }
  console.log(`  ✓ ${PLATFORM_MODULE_SEEDS.length} platform modules`);

  // Global seed: achievement definitions (not per-tenant)
  const ACHIEVEMENT_SEEDS = [
    {
      key: 'first_booking',
      label: 'First Booking',
      description: 'Book your first facility',
      eventType: 'booking.created',
      threshold: 1,
      category: 'ENGAGEMENT' as const,
    },
    {
      key: 'first_maintenance',
      label: 'First Request',
      description: 'Submit your first maintenance request',
      eventType: 'maintenance.created',
      threshold: 1,
      category: 'ENGAGEMENT' as const,
    },
    {
      key: 'first_event_rsvp',
      label: 'Event Goer',
      description: 'RSVP to your first event',
      eventType: 'event.rsvp',
      threshold: 1,
      category: 'ENGAGEMENT' as const,
    },
    {
      key: 'first_post',
      label: 'Contributor',
      description: 'Create your first post',
      eventType: 'content.created',
      threshold: 1,
      category: 'CONTRIBUTION' as const,
    },
    {
      key: 'first_group_join',
      label: 'Joiner',
      description: 'Join your first group',
      eventType: 'group.joined',
      threshold: 1,
      category: 'ENGAGEMENT' as const,
    },
    {
      key: 'first_competition_entry',
      label: 'Competitor',
      description: 'Enter your first competition',
      eventType: 'competition.entered',
      threshold: 1,
      category: 'ENGAGEMENT' as const,
    },
    {
      key: 'maintenance_5',
      label: 'Handy Resident',
      description: 'Submit 5 maintenance requests',
      eventType: 'maintenance.created',
      threshold: 5,
      category: 'CONTRIBUTION' as const,
    },
    {
      key: 'maintenance_10',
      label: 'Maintenance Pro',
      description: 'Submit 10 maintenance requests',
      eventType: 'maintenance.created',
      threshold: 10,
      category: 'MILESTONE' as const,
    },
    {
      key: 'event_attendee_5',
      label: 'Social Butterfly',
      description: 'RSVP to 5 events',
      eventType: 'event.rsvp',
      threshold: 5,
      category: 'CONTRIBUTION' as const,
    },
    {
      key: 'event_attendee_10',
      label: 'Event Enthusiast',
      description: 'RSVP to 10 events',
      eventType: 'event.rsvp',
      threshold: 10,
      category: 'MILESTONE' as const,
    },
    {
      key: 'content_creator_5',
      label: 'Content Creator',
      description: 'Create 5 posts',
      eventType: 'content.created',
      threshold: 5,
      category: 'CONTRIBUTION' as const,
    },
    {
      key: 'bookings_3',
      label: 'Regular Booker',
      description: 'Complete 3 bookings',
      eventType: 'booking.created',
      threshold: 3,
      category: 'CONTRIBUTION' as const,
    },
  ];
  for (const seed of ACHIEVEMENT_SEEDS) {
    await db
      .insert(achievementDefinitions)
      .values({ id: crypto.randomUUID(), ...seed })
      .onConflictDoNothing();
  }
  console.log('  ✓ achievement definitions');

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
