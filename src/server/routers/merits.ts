import { z } from 'zod';
import {
  router,
  protectedProcedure,
  tenantProcedure,
  privilegedProcedure,
  db,
  communityMerits,
  notifications,
  users,
  revalidateAdminChanges,
  now,
  writeAuditLog,
} from '@api/server';
import { toEnvelope } from '@api/server';
import { meritDto } from '@server/dto';

import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';
import { getStandingTier } from '@entities/merit';
import {
  getEffectivePoints,
  checkAndEscalateStanding,
  getMeritExpiryDays,
  getMeritTierThresholds,
} from '@/entities/merit/services';

import { eq, and, desc, isNull } from 'drizzle-orm';

// ──────────────────────────────────────────
// Constants
// ──────────────────────────────────────────

const BEHAVIOR_POINTS = {
  MERIT: 5,
  WARNING: 2,
  INFRACTION: 10,
} as const;

const DEFAULT_EXPIRY_DAYS = {
  WARNING: 180,
  INFRACTION: 730,
  MERIT: null,
} as const;

const DEFAULT_TIER_THRESHOLDS = {
  GOLD: 50,
  SILVER: 20,
  BRONZE: 0,
  PROBATION: -20,
} as const;

const STANDING_LABELS: Record<string, string> = {
  GOLD: 'Gold',
  SILVER: 'Silver',
  BRONZE: 'Bronze',
  WATCHLIST: 'Watchlist',
  PROBATION: 'Probation',
};

// ──────────────────────────────────────────
// Input schemas
// ──────────────────────────────────────────

const IdInput = z.object({ id: z.string() });

const ListMeritsInput = z
  .object({
    status: z.enum(['ACTIVE', 'DISPUTED', 'UPHELD', 'OVERTURNED']).optional(),
    category: z
      .enum([
        'COMMUNITY_SERVICE',
        'VOLUNTEERISM',
        'MAINTENANCE',
        'NOISE',
        'PARKING',
        'SECURITY',
        'PETS',
        'COMPLIANCE',
        'OTHER',
      ])
      .optional(),
    userId: z.string().optional(),
    behaviorType: z.enum(['MERIT', 'WARNING', 'INFRACTION']).optional(),
    limit: z.coerce.number().min(1).max(100).optional().default(50),
    offset: z.coerce.number().min(0).optional().default(0),
  })
  .optional();

const CreateMeritInput = z.object({
  userId: z.string(),
  behaviorType: z.enum(['MERIT', 'WARNING', 'INFRACTION']),
  category: z
    .enum([
      'COMMUNITY_SERVICE',
      'VOLUNTEERISM',
      'MAINTENANCE',
      'NOISE',
      'PARKING',
      'SECURITY',
      'PETS',
      'COMPLIANCE',
      'OTHER',
    ])
    .optional()
    .default('OTHER'),
  reason: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
});

const UpdateMeritInput = z.object({
  id: z.string(),
  reason: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional().nullable(),
  category: z
    .enum([
      'COMMUNITY_SERVICE',
      'VOLUNTEERISM',
      'MAINTENANCE',
      'NOISE',
      'PARKING',
      'SECURITY',
      'PETS',
      'COMPLIANCE',
      'OTHER',
    ])
    .optional(),
});

const DisputeMeritInput = z.object({
  id: z.string(),
  reason: z.string().min(3).max(500),
});

const ResolveDisputeInput = z.object({
  id: z.string(),
  verdict: z.enum(['UPHOLD', 'OVERTURN']),
});

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

async function getTenantMerit(meritId: string, tenantId: string) {
  const [record] = await db
    .select()
    .from(communityMerits)
    .where(
      and(
        eq(communityMerits.id, meritId),
        eq(communityMerits.tenantId, tenantId),
        isNull(communityMerits.deletedAt)
      )
    );
  if (!record) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Merit record not found' });
  }
  return record;
}

function requireUsersPermission(role: string | null | undefined): void {
  if (!hasPermission(role, 'users')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
  }
}

async function notifyTierChange(
  userId: string,
  tenantId: string,
  tierBefore: string,
  tierAfter: string,
  title: string,
  message: string
) {
  if (tierBefore !== tierAfter) {
    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      tenantId,
      userId,
      title,
      message,
      type: tierAfter === 'WATCHLIST' || tierAfter === 'PROBATION' ? 'warning' : 'info',
      read: false,
    });
  }
}

async function createMeritRecord(
  input: z.infer<typeof CreateMeritInput>,
  tenantId: string,
  createdById: string
) {
  let recognitionPoints = 0;
  let disciplinaryPoints = 0;

  if (input.behaviorType === 'MERIT') {
    recognitionPoints = BEHAVIOR_POINTS.MERIT;
  } else if (input.behaviorType === 'WARNING') {
    disciplinaryPoints = BEHAVIOR_POINTS.WARNING;
  } else if (input.behaviorType === 'INFRACTION') {
    disciplinaryPoints = BEHAVIOR_POINTS.INFRACTION;
  }

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
    standingBefore + (input.behaviorType === 'MERIT' ? recognitionPoints : -disciplinaryPoints);

  const id = crypto.randomUUID();
  const ts = now();

  await db.insert(communityMerits).values({
    id,
    tenantId,
    userId: input.userId,
    behaviorType: input.behaviorType,
    category: input.category,
    reason: input.reason,
    description: input.description || null,
    recognitionPoints,
    disciplinaryPoints,
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
    `Your standing changed from ${STANDING_LABELS[tierBefore]} to ${STANDING_LABELS[tierAfter]}.`
  );

  await writeAuditLog({
    tenantId,
    action: 'MERIT_RECORD_CREATED',
    targetId: id,
    actorId: createdById,
    details: {
      behaviorType: input.behaviorType,
      recognitionPoints,
      disciplinaryPoints,
      standingBefore,
      standingAfter,
    },
  });

  revalidateAdminChanges();
  return { id, standingBefore, standingAfter };
}

// ──────────────────────────────────────────
// Router
// ──────────────────────────────────────────

export const meritsRouter = router({
  // ────────── MERITS ──────────

  /**
   * List merit records for the tenant — staff only.
   * @privileged
   */
  listMerits: privilegedProcedure
    .meta({ openapi: { method: 'GET', path: '/merits', protect: true, tags: ['merits'] } })
    .input(ListMeritsInput)
    .query(async ({ input, ctx }) => {
      requireUsersPermission(ctx.role);

      const tenantId = ctx.tenantId;

      const conditions = [
        eq(communityMerits.tenantId, tenantId),
        isNull(communityMerits.deletedAt),
      ];

      if (input?.status) {
        conditions.push(eq(communityMerits.status, input.status));
      }
      if (input?.category) {
        conditions.push(eq(communityMerits.category, input.category));
      }
      if (input?.userId) {
        conditions.push(eq(communityMerits.userId, input.userId));
      }
      if (input?.behaviorType) {
        conditions.push(eq(communityMerits.behaviorType, input.behaviorType));
      }

      const rows = await db
        .select({
          id: communityMerits.id,
          tenantId: communityMerits.tenantId,
          userId: communityMerits.userId,
          behaviorType: communityMerits.behaviorType,
          category: communityMerits.category,
          reason: communityMerits.reason,
          description: communityMerits.description,
          recognitionPoints: communityMerits.recognitionPoints,
          disciplinaryPoints: communityMerits.disciplinaryPoints,
          standingBefore: communityMerits.standingBefore,
          standingAfter: communityMerits.standingAfter,
          status: communityMerits.status,
          disputeReason: communityMerits.disputeReason,
          disputedAt: communityMerits.disputedAt,
          resolvedById: communityMerits.resolvedById,
          resolvedAt: communityMerits.resolvedAt,
          createdById: communityMerits.createdById,
          createdAt: communityMerits.createdAt,
          expiresAt: communityMerits.expiresAt,
          userName: users.name,
        })
        .from(communityMerits)
        .leftJoin(users, eq(communityMerits.userId, users.id))
        .where(and(...conditions))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0)
        .orderBy(desc(communityMerits.createdAt));

      return toEnvelope(rows.map(r => meritDto.parse(r)));
    }),

  /**
   * Get a single merit record — staff only.
   * @privileged
   */
  getMerit: privilegedProcedure
    .meta({ openapi: { method: 'GET', path: '/merits/{id}', protect: true, tags: ['merits'] } })
    .input(IdInput)
    .query(async ({ input, ctx }) => {
      requireUsersPermission(ctx.role);

      const tenantId = ctx.tenantId;

      const record = await getTenantMerit(input.id, tenantId);

      const [user] = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, record.userId))
        .limit(1);

      return toEnvelope(meritDto.parse(record));
    }),

  /**
   * Create a new merit record — staff only.
   * @privileged
   */
  createMerit: privilegedProcedure
    .meta({ openapi: { method: 'POST', path: '/merits', protect: true, tags: ['merits'] } })
    .input(CreateMeritInput)
    .mutation(async ({ input, ctx }) => {
      requireUsersPermission(ctx.role);

      const tenantId = ctx.tenantId;

      const result = await createMeritRecord(input, tenantId, ctx.userId);
      const created = await getTenantMerit(result.id, tenantId);
      return toEnvelope(meritDto.parse(created));
    }),

  /**
   * Update a merit record — staff only.
   * @privileged
   */
  updateMerit: privilegedProcedure
    .meta({ openapi: { method: 'PATCH', path: '/merits/{id}', protect: true, tags: ['merits'] } })
    .input(UpdateMeritInput)
    .mutation(async ({ input, ctx }) => {
      requireUsersPermission(ctx.role);

      const tenantId = ctx.tenantId;

      const record = await getTenantMerit(input.id, tenantId);

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
        actorId: ctx.userId,
        details: updateData,
      });

      const points = await getEffectivePoints(record.userId, tenantId);
      const thresholds = await getMeritTierThresholds(tenantId);
      const standing = {
        overall: points.overall,
        tier: getStandingTier(
          points.overall,
          thresholds as Partial<typeof DEFAULT_TIER_THRESHOLDS>
        ),
      };

      revalidateAdminChanges();
      const updated = await getTenantMerit(input.id, tenantId);
      return toEnvelope(meritDto.parse(updated));
    }),

  /**
   * Soft-delete a merit record — staff only.
   * @privileged
   */
  deleteMerit: privilegedProcedure
    .meta({ openapi: { method: 'DELETE', path: '/merits/{id}', protect: true, tags: ['merits'] } })
    .input(IdInput)
    .mutation(async ({ input, ctx }) => {
      requireUsersPermission(ctx.role);

      const tenantId = ctx.tenantId;

      await getTenantMerit(input.id, tenantId);

      const ts = now();
      await db
        .update(communityMerits)
        .set({ deletedAt: ts })
        .where(and(eq(communityMerits.id, input.id), eq(communityMerits.tenantId, tenantId)));

      await writeAuditLog({
        tenantId,
        action: 'MERIT_RECORD_DELETED',
        targetId: input.id,
        actorId: ctx.userId,
      });

      revalidateAdminChanges();
      return toEnvelope({ success: true });
    }),

  // ────────── AWARD ──────────

  /**
   * Award a merit to a user — staff only.
   * @privileged
   */
  awardMerit: privilegedProcedure
    .meta({
      openapi: { method: 'POST', path: '/merits/award', protect: true, tags: ['merits'] },
    })
    .input(CreateMeritInput)
    .mutation(async ({ input, ctx }) => {
      requireUsersPermission(ctx.role);

      const tenantId = ctx.tenantId;

      const result = await createMeritRecord(input, tenantId, ctx.userId);
      const created = await getTenantMerit(result.id, tenantId);
      return toEnvelope(meritDto.parse(created));
    }),

  // ────────── USER MERITS ──────────

  /**
   * Get the current user's own merit records.
   * @tenant
   */
  getUserMerits: tenantProcedure
    .meta({
      openapi: { method: 'GET', path: '/merits/me', protect: true, tags: ['merits'] },
    })
    .input(
      z
        .object({
          limit: z.coerce.number().min(1).max(100).optional().default(50),
          offset: z.coerce.number().min(0).optional().default(0),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const rows = await db
        .select()
        .from(communityMerits)
        .where(
          and(
            eq(communityMerits.userId, ctx.userId),
            eq(communityMerits.tenantId, tenantId),
            isNull(communityMerits.deletedAt)
          )
        )
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0)
        .orderBy(desc(communityMerits.createdAt));

      const points = await getEffectivePoints(ctx.userId, tenantId);
      const thresholds = await getMeritTierThresholds(tenantId);
      const standing = {
        ...points,
        tier: getStandingTier(
          points.overall,
          thresholds as Partial<typeof DEFAULT_TIER_THRESHOLDS>
        ),
      };

      return toEnvelope({ records: rows, standing });
    }),

  // ────────── DISPUTE ──────────

  /**
   * Dispute a merit record — authenticated user action.
   * @tenant
   */
  dispute: tenantProcedure
    .meta({
      openapi: { method: 'POST', path: '/merits/{id}/dispute', protect: true, tags: ['merits'] },
    })
    .input(DisputeMeritInput)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const record = await getTenantMerit(input.id, tenantId);

      if (record.userId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only dispute your own records',
        });
      }

      if (record.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only active records can be disputed',
        });
      }

      const ts = now();
      const currentHistory: unknown[] = (record.disputeHistory as unknown[]) ?? [];

      await db
        .update(communityMerits)
        .set({
          status: 'DISPUTED',
          disputeReason: input.reason,
          disputedAt: ts,
          disputeHistory: [
            ...currentHistory,
            {
              type: 'FILED',
              actorId: ctx.userId,
              reason: input.reason,
              timestamp: ts.toISOString(),
            },
          ],
        })
        .where(eq(communityMerits.id, input.id));

      await writeAuditLog({
        tenantId,
        action: 'MERIT_DISPUTE_FILED',
        targetId: input.id,
        actorId: ctx.userId,
        details: { reason: input.reason },
      });

      revalidateAdminChanges();
      return toEnvelope({ status: 'DISPUTED' });
    }),

  // ────────── DISPUTE RESOLUTION ──────────

  /**
   * Resolve a merit dispute — staff only.
   * @privileged
   */
  resolveDispute: privilegedProcedure
    .meta({
      openapi: { method: 'POST', path: '/merits/{id}/resolve', protect: true, tags: ['merits'] },
    })
    .input(ResolveDisputeInput)
    .mutation(async ({ input, ctx }) => {
      requireUsersPermission(ctx.role);

      const tenantId = ctx.tenantId;

      const record = await getTenantMerit(input.id, tenantId);

      if (record.status !== 'DISPUTED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only disputed records can be resolved',
        });
      }

      const ts = now();
      const currentHistory: unknown[] = (record.disputeHistory as unknown[]) ?? [];
      const updateData: Record<string, unknown> = {
        resolvedById: ctx.userId,
        resolvedAt: ts,
        disputeHistory: [
          ...currentHistory,
          {
            type: 'RESOLVED',
            actorId: ctx.userId,
            verdict: input.verdict,
            timestamp: ts.toISOString(),
          },
        ],
      };

      if (input.verdict === 'OVERTURN') {
        updateData.status = 'OVERTURNED';
        updateData.recognitionPoints = 0;
        updateData.disciplinaryPoints = 0;
        updateData.standingAfter = record.standingBefore;
      } else {
        updateData.status = 'UPHELD';
      }

      await db.update(communityMerits).set(updateData).where(eq(communityMerits.id, input.id));

      await writeAuditLog({
        tenantId,
        action: 'MERIT_DISPUTE_RESOLVED',
        targetId: input.id,
        actorId: ctx.userId,
        details: { verdict: input.verdict, previousStatus: record.status },
      });

      if (input.verdict === 'OVERTURN') {
        const points = await getEffectivePoints(record.userId, tenantId);
        const tierBefore = getStandingTier(record.standingAfter ?? 0);
        const tierAfter = getStandingTier(points.overall);
        await notifyTierChange(
          record.userId,
          tenantId,
          tierBefore,
          tierAfter,
          'Dispute resolved — standing updated',
          `Your standing changed from ${STANDING_LABELS[tierBefore]} to ${STANDING_LABELS[tierAfter]} after dispute resolution.`
        );
      }

      revalidateAdminChanges();
      return toEnvelope({ status: input.verdict === 'UPHOLD' ? 'UPHELD' : 'OVERTURNED' });
    }),
});
