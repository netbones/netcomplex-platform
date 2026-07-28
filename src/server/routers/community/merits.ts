import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import {
  communityMerits,
  db,
  notDeleted,
  router,
  privilegedProcedure,
  tenantProcedure,
  toEnvelope,
  meritDto,
} from '@api/server';

import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';
import {
  findTenantMerit,
  createMeritRecord,
  updateMeritRecord,
  softDeleteMerit,
  disputeMeritRecord,
  resolveDispute,
} from '@/entities/merit/services';

const IdInput = z.object({ id: z.string() });

const MeritCategory = z.enum([
  'COMMUNITY_SERVICE',
  'VOLUNTEERISM',
  'MAINTENANCE',
  'NOISE',
  'PARKING',
  'SECURITY',
  'PETS',
  'COMPLIANCE',
  'OTHER',
]);

const ListMeritsInput = z
  .object({
    status: z.enum(['ACTIVE', 'DISPUTED', 'UPHELD', 'OVERTURNED']).optional(),
    category: MeritCategory.optional(),
    userId: z.string().optional(),
    behaviorType: z.enum(['MERIT', 'WARNING', 'INFRACTION']).optional(),
    limit: z.coerce.number().min(1).max(100).optional().default(50),
    offset: z.coerce.number().min(0).optional().default(0),
  })
  .optional();

const CreateMeritInput = z.object({
  userId: z.string(),
  behaviorType: z.enum(['MERIT', 'WARNING', 'INFRACTION']),
  category: MeritCategory.optional().default('OTHER'),
  reason: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
});

const UpdateMeritInput = z.object({
  id: z.string(),
  reason: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional().nullable(),
  category: MeritCategory.optional(),
});

const DisputeMeritInput = z.object({
  id: z.string(),
  reason: z.string().min(3).max(500),
});

const ResolveDisputeInput = z.object({
  id: z.string(),
  verdict: z.enum(['UPHOLD', 'OVERTURN']),
});

function requireUsersPermission(role: string | null | undefined): void {
  if (!hasPermission(role, 'users')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
  }
}

export const meritsRouter = router({
  listMerits: privilegedProcedure
    .meta({ openapi: { method: 'GET', path: '/merits', protect: true, tags: ['merits'] } })
    .input(ListMeritsInput)
    .query(async ({ input, ctx }) => {
      requireUsersPermission(ctx.role);

      const tenantId = ctx.tenantId;
      const conditions = [eq(communityMerits.tenantId, tenantId), notDeleted(communityMerits)];

      if (input?.status) conditions.push(eq(communityMerits.status, input.status));
      if (input?.category) conditions.push(eq(communityMerits.category, input.category));
      if (input?.userId) conditions.push(eq(communityMerits.userId, input.userId));
      if (input?.behaviorType)
        conditions.push(eq(communityMerits.behaviorType, input.behaviorType));

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
        })
        .from(communityMerits)
        .where(and(...conditions))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0)
        .orderBy(desc(communityMerits.createdAt));

      return toEnvelope(rows.map(r => meritDto.parse(r)));
    }),

  getMerit: privilegedProcedure
    .meta({ openapi: { method: 'GET', path: '/merits/{id}', protect: true, tags: ['merits'] } })
    .input(IdInput)
    .query(async ({ input, ctx }) => {
      requireUsersPermission(ctx.role);
      const record = await findTenantMerit(input.id, ctx.tenantId);
      return toEnvelope(meritDto.parse(record));
    }),

  createMerit: privilegedProcedure
    .meta({ openapi: { method: 'POST', path: '/merits', protect: true, tags: ['merits'] } })
    .input(CreateMeritInput)
    .mutation(async ({ input, ctx }) => {
      requireUsersPermission(ctx.role);
      const result = await createMeritRecord(input, ctx.tenantId, ctx.userId);
      const created = await findTenantMerit(result.id, ctx.tenantId);
      return toEnvelope(meritDto.parse(created));
    }),

  updateMerit: privilegedProcedure
    .meta({ openapi: { method: 'PATCH', path: '/merits/{id}', protect: true, tags: ['merits'] } })
    .input(UpdateMeritInput)
    .mutation(async ({ input, ctx }) => {
      requireUsersPermission(ctx.role);
      await updateMeritRecord(input, ctx.tenantId, ctx.userId);
      const updated = await findTenantMerit(input.id, ctx.tenantId);
      return toEnvelope(meritDto.parse(updated));
    }),

  deleteMerit: privilegedProcedure
    .meta({ openapi: { method: 'DELETE', path: '/merits/{id}', protect: true, tags: ['merits'] } })
    .input(IdInput)
    .mutation(async ({ input, ctx }) => {
      requireUsersPermission(ctx.role);
      await findTenantMerit(input.id, ctx.tenantId);
      await softDeleteMerit(input.id, ctx.tenantId, ctx.userId);
      return toEnvelope({ success: true });
    }),

  awardMerit: privilegedProcedure
    .meta({ openapi: { method: 'POST', path: '/merits/award', protect: true, tags: ['merits'] } })
    .input(CreateMeritInput)
    .mutation(async ({ input, ctx }) => {
      requireUsersPermission(ctx.role);
      const result = await createMeritRecord(input, ctx.tenantId, ctx.userId);
      const created = await findTenantMerit(result.id, ctx.tenantId);
      return toEnvelope(meritDto.parse(created));
    }),

  getUserMerits: tenantProcedure
    .meta({ openapi: { method: 'GET', path: '/merits/me', protect: true, tags: ['merits'] } })
    .input(
      z
        .object({
          limit: z.coerce.number().min(1).max(100).optional().default(50),
          offset: z.coerce.number().min(0).optional().default(0),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const rows = await db
        .select()
        .from(communityMerits)
        .where(
          and(
            eq(communityMerits.userId, ctx.userId),
            eq(communityMerits.tenantId, ctx.tenantId),
            notDeleted(communityMerits)
          )
        )
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0)
        .orderBy(desc(communityMerits.createdAt));

      return toEnvelope({ records: rows });
    }),

  dispute: tenantProcedure
    .meta({
      openapi: { method: 'POST', path: '/merits/{id}/dispute', protect: true, tags: ['merits'] },
    })
    .input(DisputeMeritInput)
    .mutation(async ({ input, ctx }) => {
      const record = await findTenantMerit(input.id, ctx.tenantId);

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

      const currentHistory: unknown[] = (record.disputeHistory as unknown[]) ?? [];
      await disputeMeritRecord(input.id, ctx.userId, ctx.tenantId, input.reason, currentHistory);

      return toEnvelope({ status: 'DISPUTED' });
    }),

  resolveDispute: privilegedProcedure
    .meta({
      openapi: { method: 'POST', path: '/merits/{id}/resolve', protect: true, tags: ['merits'] },
    })
    .input(ResolveDisputeInput)
    .mutation(async ({ input, ctx }) => {
      requireUsersPermission(ctx.role);
      const record = await findTenantMerit(input.id, ctx.tenantId);

      if (record.status !== 'DISPUTED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only disputed records can be resolved',
        });
      }

      await resolveDispute(input.id, ctx.userId, input.verdict, record);

      return toEnvelope({ status: input.verdict === 'UPHOLD' ? 'UPHELD' : 'OVERTURNED' });
    }),
});
