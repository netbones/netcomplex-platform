import { and, eq, gte, inArray, isNull, or, sql } from 'drizzle-orm';
import { db, communityMerits } from '@api/server';
import { ESCALATION_THRESHOLDS } from '../model/constants';

const ACTIVE_STATUSES = ['ACTIVE', 'UPHELD'] as const;

function notExpiredOrDeleted() {
  const now = new Date();
  return and(
    isNull(communityMerits.deletedAt),
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
