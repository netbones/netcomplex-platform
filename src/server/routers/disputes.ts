import { z } from 'zod';
import {
  router,
  protectedProcedure,
  db,
  disputeCases,
  disputeEvents,
  disputeMessages,
  revalidateAdminChanges,
  revalidateDashboard,
  now,
  rateLimitByUser,
} from '@api/server';

import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';
import { sanitizeHtml } from '@shared/lib/sanitize/server';

import { eq, and, or, desc, asc, isNull, count, type SQL } from 'drizzle-orm';

import {
  disputeCreateSchema,
  disputeUpdateSchema,
  generateDisputeReference,
} from '@entities/dispute/server';

import { canTransition, ALL_DISPUTE_STATUSES, ALL_DISPUTE_CATEGORIES } from '@entities/dispute';

const IdInput = z.object({ id: z.string() });

const ListDisputesInput = z
  .object({
    status: z.string().optional(),
    category: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
  })
  .optional();

const CreateDisputeInput = disputeCreateSchema;

const UpdateDisputeInput = z.object({
  id: z.string(),
  updates: disputeUpdateSchema,
});

const AddDisputeMessageInput = z.object({
  disputeId: z.string(),
  content: z.string().min(1).max(5000),
  isInternal: z.boolean().default(false),
});

const ListDisputeMessagesInput = z.object({
  disputeId: z.string(),
});

const AssignDisputeInput = z.object({
  disputeId: z.string(),
  moderatorId: z.string(),
});

const ResolveDisputeInput = z.object({
  disputeId: z.string(),
  status: z.enum(['RESOLVED', 'WITHDRAWN']),
  rulingDescription: z.string().min(10).max(5000).optional(),
  closedReason: z.string().optional(),
});

async function getTenantDispute(disputeId: string, tenantId: string) {
  const [dispute] = await db
    .select()
    .from(disputeCases)
    .where(
      and(
        eq(disputeCases.id, disputeId),
        eq(disputeCases.tenantId, tenantId),
        isNull(disputeCases.deletedAt)
      )
    )
    .limit(1);
  if (!dispute) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Dispute not found' });
  }
  return dispute;
}

function isModerator(role: string | null | undefined): boolean {
  return hasPermission(role, 'admin') || role === 'BOARD' || role === 'COMMITTEE';
}

function isParty(
  dispute: { complainantId: string; respondentId: string | null },
  userId: string
): boolean {
  return dispute.complainantId === userId || dispute.respondentId === userId;
}

export const disputesRouter = router({
  listDisputes: protectedProcedure.input(ListDisputesInput).query(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const canViewAll = isModerator(ctx.role);
    const page = input?.page ?? 1;
    const limit = input?.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: (SQL | undefined)[] = [
      eq(disputeCases.tenantId, tenantId),
      isNull(disputeCases.deletedAt),
    ];

    if (!canViewAll) {
      conditions.push(
        or(eq(disputeCases.complainantId, ctx.userId), eq(disputeCases.respondentId, ctx.userId))
      );
    }

    if (
      input?.status &&
      ALL_DISPUTE_STATUSES.includes(input.status as (typeof ALL_DISPUTE_STATUSES)[number])
    ) {
      conditions.push(
        eq(disputeCases.status, input.status as (typeof disputeCases.status.enumValues)[number])
      );
    }

    if (
      input?.category &&
      ALL_DISPUTE_CATEGORIES.includes(input.category as (typeof ALL_DISPUTE_CATEGORIES)[number])
    ) {
      conditions.push(
        eq(
          disputeCases.category,
          input.category as (typeof disputeCases.category.enumValues)[number]
        )
      );
    }

    const [countResult] = await db
      .select({ count: count() })
      .from(disputeCases)
      .where(and(...conditions.filter((c): c is NonNullable<typeof c> => c !== undefined)));

    const total = Number(countResult?.count ?? 0);

    const disputes = await db
      .select()
      .from(disputeCases)
      .where(and(...conditions.filter((c): c is NonNullable<typeof c> => c !== undefined)))
      .orderBy(desc(disputeCases.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      items: disputes,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }),

  getDispute: protectedProcedure.input(IdInput).query(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const dispute = await getTenantDispute(input.id, tenantId);

    const mod = isModerator(ctx.role);
    const party = isParty(dispute, ctx.userId);

    if (!party && !mod) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
    }

    const events = await db
      .select()
      .from(disputeEvents)
      .where(and(eq(disputeEvents.disputeId, input.id), eq(disputeEvents.tenantId, tenantId)))
      .orderBy(asc(disputeEvents.createdAt));

    return { ...dispute, events };
  }),

  createDispute: protectedProcedure.input(CreateDisputeInput).mutation(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const id = crypto.randomUUID();
    const referenceNumber = await generateDisputeReference(tenantId);
    const coolingOffEndsAt = new Date(Date.now() + 24 * 3600_000);

    const [dispute] = await db
      .insert(disputeCases)
      .values({
        id,
        tenantId,
        referenceNumber,
        complainantId: ctx.userId,
        respondentId: input.respondentId ?? null,
        respondentType: input.respondentType ?? 'RESIDENT',
        category: input.category,
        title: input.title,
        description: input.description,
        desiredOutcome: input.desiredOutcome ?? null,
        severity: input.severity ?? 'MODERATE',
        status: 'DRAFT',
        isConfidential: true,
        coolingOffEndsAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await db.insert(disputeEvents).values({
      id: crypto.randomUUID(),
      tenantId,
      disputeId: id,
      actorId: ctx.userId,
      eventType: 'CREATED',
      fromStatus: null,
      toStatus: 'DRAFT',
      createdAt: now(),
    });

    revalidateDashboard();
    return dispute;
  }),

  updateDispute: protectedProcedure.input(UpdateDisputeInput).mutation(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const existing = await getTenantDispute(input.id, tenantId);

    const mod = isModerator(ctx.role);
    const party = isParty(existing, ctx.userId);

    if (!party && !mod) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
    }

    if (input.updates.status && input.updates.status !== existing.status) {
      if (!canTransition(existing.status, input.updates.status)) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Cannot transition from ${existing.status} to ${input.updates.status}`,
        });
      }
    }

    const ts = now();

    const result = await db.transaction(async tx => {
      const updateData: Record<string, unknown> = { updatedAt: ts };

      if (input.updates.title !== undefined) updateData.title = input.updates.title;
      if (input.updates.description !== undefined)
        updateData.description = input.updates.description;
      if (input.updates.category !== undefined) updateData.category = input.updates.category;
      if (input.updates.desiredOutcome !== undefined)
        updateData.desiredOutcome = input.updates.desiredOutcome;
      if (input.updates.severity !== undefined) updateData.severity = input.updates.severity;
      if (input.updates.status !== undefined) updateData.status = input.updates.status;

      const [updated] = await tx
        .update(disputeCases)
        .set(updateData)
        .where(and(eq(disputeCases.id, input.id), eq(disputeCases.tenantId, tenantId)))
        .returning();

      if (input.updates.status && input.updates.status !== existing.status) {
        await tx.insert(disputeEvents).values({
          id: crypto.randomUUID(),
          tenantId,
          disputeId: input.id,
          actorId: ctx.userId,
          eventType: 'STATUS_CHANGED',
          fromStatus: existing.status,
          toStatus: input.updates.status,
          createdAt: ts,
        });
      }

      return updated;
    });

    revalidateAdminChanges();
    return result;
  }),

  addDisputeMessage: protectedProcedure
    .input(AddDisputeMessageInput)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const dispute = await getTenantDispute(input.disputeId, tenantId);

      const mod = isModerator(ctx.role);
      const party = isParty(dispute, ctx.userId);

      if (!party && !mod) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      if (input.isInternal && !mod) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only moderators can post internal notes',
        });
      }

      await rateLimitByUser(ctx.userId, {
        windowMs: 60_000,
        maxRequests: 30,
      });

      const sanitizedContent = sanitizeHtml(input.content);

      const [message] = await db
        .insert(disputeMessages)
        .values({
          id: crypto.randomUUID(),
          tenantId,
          disputeId: input.disputeId,
          senderId: ctx.userId,
          content: sanitizedContent,
          isInternal: input.isInternal,
          createdAt: now(),
        })
        .returning();

      return message;
    }),

  listDisputeMessages: protectedProcedure
    .input(ListDisputeMessagesInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const dispute = await getTenantDispute(input.disputeId, tenantId);

      const mod = isModerator(ctx.role);
      const party = isParty(dispute, ctx.userId);

      if (!party && !mod) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      const conditions = [
        eq(disputeMessages.disputeId, input.disputeId),
        eq(disputeMessages.tenantId, tenantId),
        isNull(disputeMessages.deletedAt),
      ];

      if (party && !mod) {
        conditions.push(eq(disputeMessages.isInternal, false));
      }

      return db
        .select()
        .from(disputeMessages)
        .where(and(...conditions))
        .orderBy(asc(disputeMessages.createdAt));
    }),

  assignDispute: protectedProcedure.input(AssignDisputeInput).mutation(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    if (ctx.role !== 'BOARD' && !hasPermission(ctx.role, 'admin')) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only board members and admins can assign moderators',
      });
    }

    await getTenantDispute(input.disputeId, tenantId);

    const ts = now();

    await db.transaction(async tx => {
      await tx
        .update(disputeCases)
        .set({
          assignedModeratorId: input.moderatorId,
          updatedAt: ts,
        })
        .where(and(eq(disputeCases.id, input.disputeId), eq(disputeCases.tenantId, tenantId)));

      await tx.insert(disputeEvents).values({
        id: crypto.randomUUID(),
        tenantId,
        disputeId: input.disputeId,
        actorId: ctx.userId,
        eventType: 'ASSIGNED',
        metadata: { assignedModeratorId: input.moderatorId },
        createdAt: ts,
      });
    });

    revalidateAdminChanges();
    return { success: true, assignedModeratorId: input.moderatorId };
  }),

  submitDispute: protectedProcedure.input(IdInput).mutation(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const dispute = await getTenantDispute(input.id, tenantId);

    if (dispute.status !== 'DRAFT') {
      throw new TRPCError({ code: 'CONFLICT', message: 'Dispute is not in draft status' });
    }

    if (dispute.complainantId !== ctx.userId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the complainant can submit' });
    }

    if (dispute.coolingOffEndsAt) {
      const nowDate = now();
      if (dispute.coolingOffEndsAt > nowDate) {
        const remainingMs = dispute.coolingOffEndsAt.getTime() - nowDate.getTime();
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Cooling-off period has not elapsed. ${remainingSeconds}s remaining.`,
        });
      }
    }

    const result = await db.transaction(async tx => {
      const ts = now();

      const [updated] = await tx
        .update(disputeCases)
        .set({
          status: 'SUBMITTED',
          submittedAt: ts,
          updatedAt: ts,
        })
        .where(and(eq(disputeCases.id, input.id), eq(disputeCases.tenantId, tenantId)))
        .returning();

      await tx.insert(disputeEvents).values({
        id: crypto.randomUUID(),
        tenantId,
        disputeId: input.id,
        actorId: ctx.userId,
        eventType: 'SUBMITTED',
        fromStatus: 'DRAFT',
        toStatus: 'SUBMITTED',
        createdAt: ts,
      });

      return updated;
    });

    revalidateDashboard();
    return result;
  }),

  resolveDispute: protectedProcedure.input(ResolveDisputeInput).mutation(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    if (ctx.role !== 'BOARD' && !hasPermission(ctx.role, 'admin')) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only board members and admins can resolve disputes',
      });
    }

    const dispute = await getTenantDispute(input.disputeId, tenantId);

    if (!canTransition(dispute.status, input.status)) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: `Cannot transition from ${dispute.status} to ${input.status}`,
      });
    }

    const ts = now();

    await db.transaction(async tx => {
      const updateData: Record<string, unknown> = {
        status: input.status,
        resolvedAt: ts,
        updatedAt: ts,
      };

      if (input.rulingDescription) {
        updateData.rulingDescription = input.rulingDescription;
        updateData.rulingIssuedAt = ts;
      }

      if (input.closedReason) {
        updateData.closedReason = input.closedReason;
        updateData.closedById = ctx.userId;
      }

      await tx
        .update(disputeCases)
        .set(updateData)
        .where(and(eq(disputeCases.id, input.disputeId), eq(disputeCases.tenantId, tenantId)));

      await tx.insert(disputeEvents).values({
        id: crypto.randomUUID(),
        tenantId,
        disputeId: input.disputeId,
        actorId: ctx.userId,
        eventType: input.status === 'RESOLVED' ? 'RESOLVED' : 'WITHDRAWN',
        fromStatus: dispute.status,
        toStatus: input.status,
        note: input.rulingDescription ?? null,
        createdAt: ts,
      });
    });

    revalidateAdminChanges();
    return { success: true };
  }),

  issueRuling: protectedProcedure
    .input(z.object({ disputeId: z.string(), rulingDescription: z.string().min(10).max(5000) }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      if (ctx.role !== 'BOARD' && !hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only board members and admins can issue rulings',
        });
      }

      const dispute = await getTenantDispute(input.disputeId, tenantId);

      if (!canTransition(dispute.status, 'FORMAL_RULING')) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Cannot issue ruling from current status',
        });
      }

      const ts = now();

      await db.transaction(async tx => {
        await tx
          .update(disputeCases)
          .set({
            status: 'FORMAL_RULING',
            rulingDescription: input.rulingDescription,
            rulingIssuedAt: ts,
            updatedAt: ts,
          })
          .where(and(eq(disputeCases.id, input.disputeId), eq(disputeCases.tenantId, tenantId)));

        await tx.insert(disputeEvents).values({
          id: crypto.randomUUID(),
          tenantId,
          disputeId: input.disputeId,
          actorId: ctx.userId,
          eventType: 'RULING_ISSUED',
          fromStatus: dispute.status,
          toStatus: 'FORMAL_RULING',
          note: input.rulingDescription,
          createdAt: ts,
        });
      });

      revalidateAdminChanges();
      return { success: true };
    }),

  getEvents: protectedProcedure.input(IdInput).query(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const dispute = await getTenantDispute(input.id, tenantId);

    const mod = isModerator(ctx.role);
    const party = isParty(dispute, ctx.userId);

    if (!party && !mod) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
    }

    return db
      .select()
      .from(disputeEvents)
      .where(and(eq(disputeEvents.disputeId, input.id), eq(disputeEvents.tenantId, tenantId)))
      .orderBy(asc(disputeEvents.createdAt));
  }),
});
