import { eq, isNull } from 'drizzle-orm';
import { seatPlans } from '@schema/seat-plans';
import { billingPlanIntervalEnum } from '@schema/billing-plan-interval-enum';
import { createId } from '@shared/lib/id';

function datetime() {
  return new Date();
}

const SEAT_PLAN_SEEDS = [
  {
    name: 'Standard (≥60 homes)',
    seatType: 'STANDARD' as const,
    price: '12.50',
    multiplier: '1.00',
    minimumHomes: 60,
  },
  {
    name: 'Standard (<60 homes)',
    seatType: 'STANDARD' as const,
    price: '15.00',
    multiplier: '1.00',
    minimumHomes: 0,
  },
  {
    name: 'Solo Seat',
    seatType: 'SOLO' as const,
    price: '12.50',
    multiplier: '1.00',
    minimumHomes: null,
  },
  {
    name: 'Premium Seat',
    seatType: 'PREMIUM' as const,
    price: '18.75',
    multiplier: '1.50',
    minimumHomes: null,
  },
];

/**
 * Ensures the four ADVISORY-041 seat-plan rate rows exist.
 *
 * Global rows use a NULL `tenantId`; when `tenantId` is provided the same
 * four rows are materialized for that tenant so per-tenant overrides can be
 * layered on top later. Existing rows are left untouched (idempotent) and are
 * matched on (tenantId, seatType, minimumHomes).
 *
 * Follows the Phase 46 `getOrCreateDefaultSubscriptionTiers` and
 * `getOrCreateDefaultBillingPlans` patterns.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedSeatPlans(db: any, tenantId?: string) {
  const scope = tenantId ? eq(seatPlans.tenantId, tenantId) : isNull(seatPlans.tenantId);
  const existing = await db.select().from(seatPlans).where(scope);

  const existingKeys = new Set(
    (existing as Array<{ seatType: string; minimumHomes: number | null }>).map(
      row => `${row.seatType}:${row.minimumHomes ?? 'null'}`
    )
  );

  const missing = SEAT_PLAN_SEEDS.filter(plan => {
    const key = `${plan.seatType}:${plan.minimumHomes ?? 'null'}`;
    return !existingKeys.has(key);
  });

  if (missing.length > 0) {
    const timestamp = datetime();
    const rows = missing.map(plan => ({
      id: createId(),
      tenantId: tenantId ?? null,
      seatType: plan.seatType,
      name: plan.name,
      price: plan.price,
      multiplier: plan.multiplier,
      currency: 'ZAR',
      interval: 'MONTHLY' as (typeof billingPlanIntervalEnum.enumValues)[number],
      minimumHomes: plan.minimumHomes,
      eligibilityRule: null,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    await db.insert(seatPlans).values(rows).onConflictDoNothing();
  }

  const all = await db.select().from(seatPlans).where(scope);

  return all as Array<{
    id: string;
    name: string;
    seatType: string;
    price: string;
    multiplier: string;
  }>;
}
