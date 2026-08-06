import { z } from 'zod';
import {
  now,
  platformSuspensions,
  privilegedProcedure,
  router,
  toEnvelope,
  toEnvelopeSchema,
  users,
  writeAuditLog,
  suspensionDto,
} from '@api/server';

// Zod v4 DTOs (from drizzle-zod) are incompatible with Zod v3's ZodTypeAny constraint
// used by tRPC's output validation. Cast to any for output schema references.
// The runtime validation still uses the v4 DTOs via .parse() calls.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const susDto = suspensionDto as any;

import { TRPCError } from '@trpc/server';
import { eq, and, desc } from 'drizzle-orm';
import { createId } from '@shared/lib/id';

export const suspensionsRouter = router({
  // ============ SUSPENSIONS ============

  /**
   * List suspension history for a user — staff only.
   * @privileged
   */
  listSuspensions: privilegedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/identity/users/{id}/suspensions',
        tags: ['Identity'],
        summary: 'List suspension history for a user',
        protect: true,
      },
    })
    .input(z.object({ userId: z.string() }))
    .output(toEnvelopeSchema(z.object({ suspensions: z.array(susDto.passthrough()) })))
    .query(async ({ input, ctx }) => {
      const suspensions = await ctx.db
        .select()
        .from(platformSuspensions)
        .where(
          and(
            eq(platformSuspensions.userId, input.userId),
            eq(platformSuspensions.tenantId, ctx.tenantId)
          )
        )
        .orderBy(desc(platformSuspensions.createdAt));

      return toEnvelope({ suspensions });
    }),

  /**
   * Suspend a user — staff only.
   * @privileged
   */
  suspendUser: privilegedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/identity/users/{id}/suspend',
        tags: ['Identity'],
        summary: 'Suspend a user',
        protect: true,
      },
    })
    .input(
      z.object({
        userId: z.string(),
        suspensionType: z.enum([
          'VIOLATION',
          'DISRUPTION',
          'BEHAVIOR',
          'PROPERTY',
          'NON_PAYMENT',
          'OTHER',
        ]),
        reason: z.string().min(3),
        description: z.string().optional(),
        endDate: z.string().nullable().optional(),
      })
    )
    .output(toEnvelopeSchema(susDto.passthrough()))
    .mutation(async ({ input, ctx }) => {
      // Verify target user exists within the same tenant
      const [targetUser] = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, input.userId), eq(users.tenantId, ctx.tenantId)))
        .limit(1);

      if (!targetUser) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      // Check if user already has an active suspension
      const [existingSuspension] = await ctx.db
        .select({ id: platformSuspensions.id })
        .from(platformSuspensions)
        .where(
          and(eq(platformSuspensions.userId, input.userId), eq(platformSuspensions.isActive, true))
        )
        .limit(1);

      if (existingSuspension) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User already has an active suspension',
        });
      }

      const ts = now();
      const suspensionId = createId();
      const parsedEndDate = input.endDate ? new Date(input.endDate) : null;
      const isPermanent = !input.endDate;

      const result = await ctx.db.transaction(async tx => {
        const [suspension] = await tx
          .insert(platformSuspensions)
          .values({
            id: suspensionId,
            tenantId: ctx.tenantId,
            userId: input.userId,
            suspensionType: input.suspensionType,
            reason: input.reason.trim(),
            description: input.description || null,
            startDate: ts,
            endDate: parsedEndDate,
            isPermanent,
            isActive: true,
            createdById: ctx.userId,
            createdAt: ts,
            updatedAt: ts,
          })
          .returning();

        await tx.update(users).set({ isActive: false }).where(eq(users.id, input.userId));

        return suspension;
      });

      writeAuditLog({
        action: 'USER_SUSPENDED',
        actorId: ctx.userId,
        targetId: input.userId,
        tenantId: ctx.tenantId,
        details: {
          suspensionType: input.suspensionType,
          reason: input.reason,
          endDate: input.endDate || null,
        },
      });

      return toEnvelope(result);
    }),

  /**
   * Unsuspend a user — staff only.
   * @privileged
   */
  unsuspendUser: privilegedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/identity/users/{id}/unsuspend',
        tags: ['Identity'],
        summary: 'Unsuspend a user',
        protect: true,
      },
    })
    .input(z.object({ userId: z.string() }))
    .output(
      toEnvelopeSchema(
        z.object({
          success: z.boolean(),
          user: z.object({
            id: z.string(),
            name: z.string(),
            email: z.string(),
            role: z.string(),
            isActive: z.boolean(),
          }),
        })
      )
    )
    .mutation(async ({ input, ctx }) => {
      // Verify target user exists within the same tenant
      const [targetUser] = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, input.userId), eq(users.tenantId, ctx.tenantId)))
        .limit(1);

      if (!targetUser) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      // Find active suspension for this user
      const [activeSuspension] = await ctx.db
        .select({ id: platformSuspensions.id })
        .from(platformSuspensions)
        .where(
          and(eq(platformSuspensions.userId, input.userId), eq(platformSuspensions.isActive, true))
        )
        .limit(1);

      if (!activeSuspension) {
        throw new TRPCError({ code: 'CONFLICT', message: 'User has no active suspension' });
      }

      const ts = now();

      const updatedUser = await ctx.db.transaction(async tx => {
        await tx
          .update(platformSuspensions)
          .set({ isActive: false, updatedAt: ts })
          .where(eq(platformSuspensions.id, activeSuspension.id));

        const [user] = await tx
          .update(users)
          .set({ isActive: true })
          .where(eq(users.id, input.userId))
          .returning({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            isActive: users.isActive,
          });

        return user;
      });

      writeAuditLog({
        action: 'USER_UNSUSPENDED',
        actorId: ctx.userId,
        targetId: input.userId,
        tenantId: ctx.tenantId,
      });

      return toEnvelope({ success: true, user: updatedUser });
    }),
});
