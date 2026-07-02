import { and, eq, gte, inArray, isNull, or, sql } from 'drizzle-orm';
import { communityMerits, db, notDeleted, settings } from '@api/server';
import { ESCALATION_THRESHOLDS, DEFAULT_TIER_THRESHOLDS } from '../model/constants';
import { SETTINGS_KEYS } from '@entities/tenant/server';

const ACTIVE_STATUSES = ['ACTIVE', 'UPHELD'] as const;

function notExpiredOrDeleted() {
  const now = new Date();
  return and(
    notDeleted(communityMerits),
    or(isNull(communityMerits.expiresAt), gte(communityMerits.expiresAt, now))
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
    eq(communityMerits.userId, userId),
    eq(communityMerits.tenantId, tenantId),
    inArray(communityMerits.status, ACTIVE_STATUSES),
    notExpiredOrDeleted()
  );

  const [recognitionRow] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${communityMerits.recognitionPoints}), 0)`.as('total'),
    })
    .from(communityMerits)
    .where(baseConditions);

  const [disciplinaryRow] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${communityMerits.disciplinaryPoints}), 0)`.as('total'),
    })
    .from(communityMerits)
    .where(baseConditions);

  const recognition = Number(recognitionRow?.total ?? 0);
  const disciplinary = Number(disciplinaryRow?.total ?? 0);
  const overall = recognition - disciplinary;

  return { recognition, disciplinary, overall };
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
    .from(communityMerits)
    .where(
      and(
        eq(communityMerits.userId, userId),
        eq(communityMerits.tenantId, tenantId),
        eq(communityMerits.behaviorType, 'INFRACTION'),
        inArray(communityMerits.status, ACTIVE_STATUSES),
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
 * Read merit tier thresholds from tenant settings, falling back to defaults.
 */
export async function getMeritTierThresholds(
  tenantId: string
): Promise<{ GOLD: number; SILVER: number; BRONZE: number; PROBATION: number }> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(
      and(eq(settings.tenantId, tenantId), eq(settings.key, SETTINGS_KEYS.MERIT_TIER_THRESHOLDS))
    )
    .limit(1);

  if (!row?.value) return { ...DEFAULT_TIER_THRESHOLDS };

  try {
    const parsed = JSON.parse(row.value);
    return {
      GOLD: Number(parsed.GOLD ?? DEFAULT_TIER_THRESHOLDS.GOLD),
      SILVER: Number(parsed.SILVER ?? DEFAULT_TIER_THRESHOLDS.SILVER),
      BRONZE: Number(parsed.BRONZE ?? DEFAULT_TIER_THRESHOLDS.BRONZE),
      PROBATION: Number(parsed.PROBATION ?? DEFAULT_TIER_THRESHOLDS.PROBATION),
    };
  } catch {
    return { ...DEFAULT_TIER_THRESHOLDS };
  }
}

/**
 * Read MERIT-type expiry days from tenant settings (null = never expire).
 */
export async function getMeritExpiryDays(tenantId: string): Promise<number | null> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.tenantId, tenantId), eq(settings.key, SETTINGS_KEYS.MERIT_EXPIRY_DAYS)))
    .limit(1);

  if (!row?.value || row.value === '') return null;
  const days = parseInt(row.value, 10);
  return Number.isFinite(days) && days > 0 ? days : null;
}
