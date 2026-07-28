import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { communityMerits, db, notDeleted, notifications, now } from '@api/server';
import { writeAuditLog, revalidateAdminChanges } from '@api/server';
import { createId } from '@shared/lib/id';
import { getStandingTier } from '@entities/merit';
import { getEffectivePoints, checkAndEscalateStanding, getMeritExpiryDays } from './model';
import { STANDING_TIER_CONFIG } from '../model/constants';

type BehaviorType = 'MERIT' | 'WARNING' | 'INFRACTION';
type MeritCategory =
  | 'COMMUNITY_SERVICE'
  | 'VOLUNTEERISM'
  | 'MAINTENANCE'
  | 'NOISE'
  | 'PARKING'
  | 'SECURITY'
  | 'PETS'
  | 'COMPLIANCE'
  | 'OTHER';

const BEHAVIOR_POINTS: Record<BehaviorType, { recognition: number; disciplinary: number }> = {
  MERIT: { recognition: 5, disciplinary: 0 },
  WARNING: { recognition: 0, disciplinary: 2 },
  INFRACTION: { recognition: 0, disciplinary: 10 },
};

const DEFAULT_EXPIRY_DAYS: Record<BehaviorType, number | null> = {
  MERIT: null,
  WARNING: 180,
  INFRACTION: 730,
};

export async function findTenantMerit(meritId: string, tenantId: string) {
  const [record] = await db
    .select()
    .from(communityMerits)
    .where(
      and(
        eq(communityMerits.id, meritId),
        eq(communityMerits.tenantId, tenantId),
        notDeleted(communityMerits)
      )
    );
  if (!record) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Merit record not found' });
  }
  return record;
}

export async function notifyTierChange(
  userId: string,
  tenantId: string,
  tierBefore: string,
  tierAfter: string,
  title: string,
  message: string
) {
  if (tierBefore !== tierAfter) {
    await db.insert(notifications).values({
      id: createId(),
      tenantId,
      userId,
      title,
      message,
      type: tierAfter === 'WATCHLIST' || tierAfter === 'PROBATION' ? 'warning' : 'info',
      read: false,
    });
  }
}

export async function createMeritRecord(
  input: {
    userId: string;
    behaviorType: BehaviorType;
    category: MeritCategory;
    reason: string;
    description?: string | null;
  },
  tenantId: string,
  createdById: string
) {
  const points = BEHAVIOR_POINTS[input.behaviorType];
  const expiryDays = DEFAULT_EXPIRY_DAYS[input.behaviorType];
  const configuredMeritExpiryDays =
    input.behaviorType === 'MERIT' ? await getMeritExpiryDays(tenantId) : null;
  const effectiveExpiryDays =
    input.behaviorType === 'MERIT' ? configuredMeritExpiryDays : expiryDays;
  const expiresAt = effectiveExpiryDays
    ? new Date(Date.now() + effectiveExpiryDays * 24 * 60 * 60 * 1000)
    : null;

  const { overall: standingBefore } = await getEffectivePoints(input.userId, tenantId);
  const standingAfter =
    input.behaviorType === 'MERIT'
      ? standingBefore + points.recognition
      : standingBefore - points.disciplinary;

  const id = createId();
  const ts = now();

  await db.insert(communityMerits).values({
    id,
    tenantId,
    userId: input.userId,
    behaviorType: input.behaviorType,
    category: input.category as MeritCategory,
    reason: input.reason,
    description: input.description || null,
    recognitionPoints: points.recognition,
    disciplinaryPoints: points.disciplinary,
    standingBefore,
    standingAfter,
    status: 'ACTIVE',
    createdById,
    createdAt: ts,
    expiresAt,
  });

  await checkAndEscalateStanding(input.userId, tenantId);

  const tierBefore = getStandingTier(standingBefore);
  const tierAfter = getStandingTier(standingAfter);

  await notifyTierChange(
    input.userId,
    tenantId,
    tierBefore,
    tierAfter,
    'Community standing updated',
    `Your standing changed from ${STANDING_TIER_CONFIG[tierBefore].label} to ${STANDING_TIER_CONFIG[tierAfter].label}.`
  );

  await writeAuditLog({
    tenantId,
    action: 'MERIT_RECORD_CREATED',
    targetId: id,
    actorId: createdById,
    details: {
      behaviorType: input.behaviorType,
      recognitionPoints: points.recognition,
      disciplinaryPoints: points.disciplinary,
      standingBefore,
      standingAfter,
    },
  });

  revalidateAdminChanges();
  return { id, standingBefore, standingAfter };
}

export async function updateMeritRecord(
  input: {
    id: string;
    reason?: string;
    description?: string | null;
    category?: MeritCategory;
  },
  tenantId: string,
  actorId: string
) {
  const updateData: Record<string, unknown> = {};
  if (input.reason !== undefined) updateData.reason = input.reason;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.category !== undefined) updateData.category = input.category;

  if (Object.keys(updateData).length === 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'No valid fields to update' });
  }

  await db
    .update(communityMerits)
    .set(updateData)
    .where(and(eq(communityMerits.id, input.id), eq(communityMerits.tenantId, tenantId)));

  await writeAuditLog({
    tenantId,
    action: 'MERIT_RECORD_UPDATED',
    targetId: input.id,
    actorId,
    details: updateData,
  });

  revalidateAdminChanges();
}

export async function softDeleteMerit(id: string, tenantId: string, actorId: string) {
  const ts = now();
  await db
    .update(communityMerits)
    .set({ deletedAt: ts })
    .where(and(eq(communityMerits.id, id), eq(communityMerits.tenantId, tenantId)));

  await writeAuditLog({
    tenantId,
    action: 'MERIT_RECORD_DELETED',
    targetId: id,
    actorId,
  });

  revalidateAdminChanges();
}

export async function disputeMeritRecord(
  meritId: string,
  userId: string,
  tenantId: string,
  reason: string,
  currentHistory: unknown[]
) {
  const ts = now();
  await db
    .update(communityMerits)
    .set({
      status: 'DISPUTED',
      disputeReason: reason,
      disputedAt: ts,
      disputeHistory: [
        ...currentHistory,
        {
          type: 'FILED',
          actorId: userId,
          reason,
          timestamp: ts.toISOString(),
        },
      ],
    })
    .where(eq(communityMerits.id, meritId));

  await writeAuditLog({
    tenantId,
    action: 'MERIT_DISPUTE_FILED',
    targetId: meritId,
    actorId: userId,
    details: { reason },
  });

  revalidateAdminChanges();
}

export async function resolveDispute(
  meritId: string,
  userId: string,
  verdict: 'UPHOLD' | 'OVERTURN',
  record: {
    userId: string;
    tenantId: string;
    status: string;
    standingBefore: number | null;
    standingAfter: number | null;
    disputeHistory: unknown;
  }
) {
  const ts = now();
  const currentHistory: unknown[] = (record.disputeHistory as unknown[]) ?? [];
  const updateData: Record<string, unknown> = {
    resolvedById: userId,
    resolvedAt: ts,
    disputeHistory: [
      ...currentHistory,
      {
        type: 'RESOLVED',
        actorId: userId,
        verdict,
        timestamp: ts.toISOString(),
      },
    ],
  };

  if (verdict === 'OVERTURN') {
    updateData.status = 'OVERTURNED';
    updateData.recognitionPoints = 0;
    updateData.disciplinaryPoints = 0;
    updateData.standingAfter = record.standingBefore;
  } else {
    updateData.status = 'UPHELD';
  }

  await db.update(communityMerits).set(updateData).where(eq(communityMerits.id, meritId));

  await writeAuditLog({
    tenantId: record.tenantId,
    action: 'MERIT_DISPUTE_RESOLVED',
    targetId: meritId,
    actorId: userId,
    details: { verdict, previousStatus: record.status },
  });

  if (verdict === 'OVERTURN') {
    const points = await getEffectivePoints(record.userId, record.tenantId);
    const tierBefore = getStandingTier(record.standingAfter ?? 0);
    const tierAfter = getStandingTier(points.overall);
    await notifyTierChange(
      record.userId,
      record.tenantId,
      tierBefore,
      tierAfter,
      'Dispute resolved — standing updated',
      `Your standing changed from ${STANDING_TIER_CONFIG[tierBefore].label} to ${STANDING_TIER_CONFIG[tierAfter].label} after dispute resolution.`
    );
  }

  revalidateAdminChanges();
}
