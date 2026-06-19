import { and, eq, sql, inArray, or, gte, isNull } from 'drizzle-orm';
import { db, behaviorRecords } from '@api/server';
import {
  DEFAULT_TIER_THRESHOLDS,
  ESCALATION_THRESHOLDS,
  STANDING_TIER_CONFIG,
} from '../model/constants';
import type { StandingTier } from '../model/types';

const ACTIVE_STATUSES = ['ACTIVE', 'UPHELD'] as const;

function notExpiredOrDeleted() {
  const now = new Date();
  return and(
    isNull(behaviorRecords.deletedAt),
    or(isNull(behaviorRecords.expiresAt), gte(behaviorRecords.expiresAt, now))
  );
}

/**
 * Get effective recognition, disciplinary, and overall points for a user.
 * overall = recognition - disciplinary
 */
export async function getEffectivePoints(
  userId: string,
  tenantId: string
): Promise<{ recognition: number; disciplinary: number; overall: number }> {
  const baseConditions = and(
    eq(behaviorRecords.userId, userId),
    eq(behaviorRecords.tenantId, tenantId),
    inArray(behaviorRecords.status, ACTIVE_STATUSES),
    notExpiredOrDeleted()
  );

  const [recognitionRow] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${behaviorRecords.recognitionPoints}), 0)`.as('total'),
    })
    .from(behaviorRecords)
    .where(baseConditions);

  const [disciplinaryRow] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${behaviorRecords.disciplinaryPoints}), 0)`.as('total'),
    })
    .from(behaviorRecords)
    .where(baseConditions);

  const recognition = Number(recognitionRow?.total ?? 0);
  const disciplinary = Number(disciplinaryRow?.total ?? 0);
  const overall = recognition - disciplinary;

  return { recognition, disciplinary, overall };
}

/**
 * Map an overall score to a standing tier.
 * Watchlist: between PROBATION+1 and BRONZE-1 (negative but not severe).
 */
export function getStandingTier(
  overall: number,
  thresholds?: Partial<typeof DEFAULT_TIER_THRESHOLDS>
): StandingTier {
  const t = { ...DEFAULT_TIER_THRESHOLDS, ...thresholds };

  if (overall >= t.GOLD) return 'GOLD';
  if (overall >= t.SILVER) return 'SILVER';
  if (overall >= t.BRONZE) return 'BRONZE';
  if (overall > t.PROBATION) return 'WATCHLIST';
  return 'PROBATION';
}

/**
 * Check infraction count and escalate if thresholds are met.
 * Counts ACTIVE/UPHELD INFRACTIONS (not expired, not deleted).
 */
export async function checkAndEscalateStanding(
  userId: string,
  tenantId: string
): Promise<{
  escalated: boolean;
  type?: 'REVIEW_FLAG' | 'SUSPENSION_RECOMMENDATION';
}> {
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)`.as('count') })
    .from(behaviorRecords)
    .where(
      and(
        eq(behaviorRecords.userId, userId),
        eq(behaviorRecords.tenantId, tenantId),
        eq(behaviorRecords.behaviorType, 'INFRACTION'),
        inArray(behaviorRecords.status, ACTIVE_STATUSES),
        notExpiredOrDeleted()
      )
    );

  const count = Number(row?.count ?? 0);

  if (count >= ESCALATION_THRESHOLDS.SUSPENSION_RECOMMENDATION) {
    return { escalated: true, type: 'SUSPENSION_RECOMMENDATION' };
  }
  if (count >= ESCALATION_THRESHOLDS.REVIEW_FLAG) {
    return { escalated: true, type: 'REVIEW_FLAG' };
  }
  return { escalated: false };
}

/**
 * Get configurable label and styling for a standing tier.
 */
export function getStandingTierConfig(tier: StandingTier) {
  return STANDING_TIER_CONFIG[tier];
}
