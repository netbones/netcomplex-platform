import { and, eq, isNull, or } from 'drizzle-orm';

import { seatPlans } from '@schema/seat-plans';

import { seedSeatPlans } from './seed-seat-plans';
import { decimalToNumber } from './helpers';

/**
 * ADVISORY-041 Phase 2 — DB-backed price engine.
 *
 * Every market-facing price on the platform is read through this module so the
 * `SeatPlan` table (global rate rows plus per-tenant overrides) is the single
 * source of truth. No surface hardcodes a ZAR literal anymore.
 */

export interface SeatRateCardEntry {
  seatType: 'STANDARD' | 'SOLO' | 'PREMIUM';
  name: string;
  price: number;
  priceLabel: string;
  multiplier: number;
  minimumHomes: number | null;
  interval: string;
  currency: string;
  isActive: boolean;
}

/**
 * Formats a decimal seat price as a short ZAR label (e.g. 12.5 -> "R12.50").
 * Currency symbol is hardcoded here, not per-surface, and the figure itself
 * always comes from the DB row.
 */
export function formatSeatPriceLabel(price: number): string {
  return `R${price.toFixed(2)}`;
}

/**
 * Reads the active seat-plan rate card.
 *
 * Global rows (`tenantId` NULL) are the platform rate card. When `tenantId` is
 * provided, tenant-scoped rows are seeded idempotently and take precedence over
 * the global rows of the same `seatType` (Phase 4 anchor-subsidy overrides).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSeatRateCard(db: any, tenantId?: string): Promise<SeatRateCardEntry[]> {
  await seedSeatPlans(db, tenantId);

  const scope = tenantId
    ? or(eq(seatPlans.tenantId, tenantId), isNull(seatPlans.tenantId))
    : isNull(seatPlans.tenantId);

  const rows = (await db
    .select()
    .from(seatPlans)
    .where(and(scope, eq(seatPlans.isActive, true)))) as Array<{
    tenantId: string | null;
    seatType: (typeof seatPlans.$inferSelect)['seatType'];
    name: string;
    price: string;
    multiplier: string;
    minimumHomes: number | null;
    interval: string;
    currency: string;
    isActive: boolean;
  }>;

  const tenantRows = rows.filter(row => row.tenantId !== null);
  const globalRows = rows.filter(row => row.tenantId === null);

  const pick = (pool: typeof rows) => {
    const bySeatType = new Map<string, SeatRateCardEntry>();
    for (const row of pool) {
      const price = decimalToNumber(row.price);
      const entry: SeatRateCardEntry = {
        seatType: row.seatType,
        name: row.name,
        price,
        priceLabel: formatSeatPriceLabel(price),
        multiplier: decimalToNumber(row.multiplier),
        minimumHomes: row.minimumHomes,
        interval: row.interval,
        currency: row.currency,
        isActive: row.isActive,
      };
      const previous = bySeatType.get(row.seatType);
      // Within a scope, the higher minimumHomes band wins (flagship ≥60 over
      // the sub-60 fallback for the same seatType).
      if (!previous || (previous.minimumHomes ?? 0) < (entry.minimumHomes ?? 0)) {
        bySeatType.set(row.seatType, entry);
      }
    }
    return bySeatType;
  };

  const tenantCard = tenantId ? pick(tenantRows) : new Map<string, SeatRateCardEntry>();

  // Tenant-scoped rows override global rows of the same seatType; any seatType
  // missing a tenant override falls back to the global rate card.
  const card = new Map<string, SeatRateCardEntry>([...pick(globalRows), ...tenantCard]);

  return [...card.values()];
}
