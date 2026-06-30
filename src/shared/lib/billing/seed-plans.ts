import { eq } from 'drizzle-orm';
import { billingPlans } from '@schema/billing-plans';
import { createId } from '@shared/lib/id';

function now() {
  return new Date();
}

const DEFAULT_PLANS = [
  {
    name: 'Standard',
    monthlyPrice: 0,
    annualPrice: 0,
    modulesIncluded: {
      modules: [
        'dashboard',
        'directory',
        'groups',
        'maintenance',
        'content',
        'announcements',
        'events',
        'surveys',
        'resources',
        'competitions',
      ],
    },
    pageLimits: { maxPages: 10 },
    seatLimits: { maxAdminSeats: 3, maxStandardSeats: 50 },
    aiQuota: 50000,
    tier: 'STANDARD' as const,
    isDefault: true,
    sortOrder: 1,
  },
  {
    name: 'Premium',
    monthlyPrice: 299,
    annualPrice: 2990,
    modulesIncluded: {
      modules: [
        'dashboard',
        'directory',
        'groups',
        'maintenance',
        'content',
        'announcements',
        'events',
        'surveys',
        'resources',
        'competitions',
        'bookings',
        'services',
        'property-listings',
        'albums',
      ],
    },
    pageLimits: { maxPages: 25 },
    seatLimits: { maxAdminSeats: 10, maxStandardSeats: 200 },
    aiQuota: 200000,
    tier: 'PREMIUM' as const,
    isDefault: true,
    sortOrder: 2,
  },
  {
    name: 'Enterprise',
    monthlyPrice: 999,
    annualPrice: 9990,
    modulesIncluded: {
      modules: [
        'dashboard',
        'directory',
        'groups',
        'maintenance',
        'content',
        'announcements',
        'events',
        'surveys',
        'resources',
        'competitions',
        'bookings',
        'services',
        'property-listings',
        'albums',
        'white-label',
        'agent-marketplace',
        'analytics',
      ],
    },
    pageLimits: { maxPages: -1 },
    seatLimits: { maxAdminSeats: -1, maxStandardSeats: -1 },
    aiQuota: 500000,
    tier: 'ENTERPRISE' as const,
    isDefault: true,
    sortOrder: 3,
  },
];

export interface SeedBillingPlansParams {
  db: {
    select: (opts?: unknown) => {
      from: (table: unknown) => {
        where: (condition: unknown) => {
          then?: unknown;
        };
      };
    };
    insert: (table: unknown) => {
      values: (rows: unknown[]) => {
        onConflictDoNothing: () => Promise<unknown>;
      };
    };
    $client?: unknown;
  };
  tenantId: string;
}

/**
 * Ensures the STANDARD, PREMIUM, and ENTERPRISE default billing plans exist
 * for a given tenant. Existing plans are left untouched — this is idempotent.
 *
 * Follows the Phase 46 `getOrCreateDefaultSubscriptionTiers` pattern.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getOrCreateDefaultBillingPlans(db: any, tenantId: string) {
  const existing = await db.select().from(billingPlans).where(eq(billingPlans.tenantId, tenantId));

  const existingNames = new Set((existing as Array<{ name: string }>).map(row => row.name));

  const missing = DEFAULT_PLANS.filter(plan => !existingNames.has(plan.name));

  if (missing.length > 0) {
    const timestamp = now();
    const rows = missing.map(plan => ({
      id: createId(),
      tenantId,
      name: plan.name,
      description: `${plan.name} plan`,
      monthlyPrice: plan.monthlyPrice.toFixed(2),
      annualPrice: plan.annualPrice.toFixed(2),
      currency: 'ZAR',
      interval: 'MONTHLY' as const,
      modulesIncluded: plan.modulesIncluded,
      pageLimits: plan.pageLimits,
      seatLimits: plan.seatLimits,
      aiQuota: plan.aiQuota,
      features: {},
      tier: plan.tier,
      isDefault: plan.isDefault,
      isActive: true,
      sortOrder: plan.sortOrder,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    await db.insert(billingPlans).values(rows).onConflictDoNothing();
  }

  const all = await db.select().from(billingPlans).where(eq(billingPlans.tenantId, tenantId));

  return all as Array<{
    id: string;
    name: string;
    tier: string;
    aiQuota: number;
    isDefault: boolean;
  }>;
}
