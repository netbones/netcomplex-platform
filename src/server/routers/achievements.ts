import { z } from 'zod';
import {
  router,
  protectedProcedure,
  tenantProcedure,
  privilegedProcedure,
  db,
  revalidateAdminChanges,
} from '@api/server';
import { toEnvelope } from '@api/server';
import { achievementDto, achievementProgressDto } from '@server/dto';

import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';

import { eq, and, or, isNull, sql } from 'drizzle-orm';
import { achievementDefinitions } from '@schema/achievement-definitions';
import { tenantAchievements } from '@schema/tenant-achievements';
import { userAchievements } from '@schema/user-achievements';
import { userAchievementProgresses } from '@schema/user-achievement-progresses';
import { createId } from '@shared/lib/id';

const IdInput = z.object({ id: z.string() });

const AchievementCategoryEnum = z.enum(['ENGAGEMENT', 'CONTRIBUTION', 'MILESTONE']);

const CreateAchievementInput = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  eventType: z.string().min(1),
  threshold: z.number().int().positive().default(1),
  category: AchievementCategoryEnum.default('ENGAGEMENT'),
});

const UpdateAchievementInput = z.object({
  id: z.string(),
  label: z.string().optional(),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  eventType: z.string().optional(),
  threshold: z.number().int().positive().optional(),
  category: AchievementCategoryEnum.optional(),
});

const GetProgressInput = z.object({
  definitionId: z.string().optional(),
});

export const achievementsRouter = router({
  /**
   * List all achievements for the current tenant.
   * @tenant
   */
  listAchievements: tenantProcedure
    .meta({
      openapi: { method: 'GET', path: '/achievements/list', protect: true, tags: ['achievements'] },
    })
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId;

      const rows = await db
        .select({
          id: achievementDefinitions.id,
          key: achievementDefinitions.key,
          label: achievementDefinitions.label,
          description: achievementDefinitions.description,
          icon: sql<string>`COALESCE(${tenantAchievements.icon}, ${achievementDefinitions.icon})`,
          category: achievementDefinitions.category,
          threshold: achievementDefinitions.threshold,
          customThreshold: tenantAchievements.customThreshold,
          enabled: tenantAchievements.enabled,
          eventType: achievementDefinitions.eventType,
          createdAt: achievementDefinitions.createdAt,
        })
        .from(achievementDefinitions)
        .leftJoin(
          tenantAchievements,
          and(
            eq(tenantAchievements.definitionId, achievementDefinitions.id),
            eq(tenantAchievements.tenantId, tenantId)
          )
        )
        .where(or(isNull(tenantAchievements.enabled), eq(tenantAchievements.enabled, true)));

      return toEnvelope(
        rows.map(r =>
          achievementDto.parse({
            ...r,
            threshold: r.customThreshold ?? r.threshold,
          })
        )
      );
    }),

  /**
   * Get a single achievement by ID.
   * @tenant
   */
  getAchievement: tenantProcedure
    .input(IdInput)
    .meta({
      openapi: { method: 'GET', path: '/achievements/get', protect: true, tags: ['achievements'] },
    })
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const [row] = await db
        .select({
          id: achievementDefinitions.id,
          key: achievementDefinitions.key,
          label: achievementDefinitions.label,
          description: achievementDefinitions.description,
          icon: sql<string>`COALESCE(${tenantAchievements.icon}, ${achievementDefinitions.icon})`,
          category: achievementDefinitions.category,
          threshold: achievementDefinitions.threshold,
          customThreshold: tenantAchievements.customThreshold,
          enabled: tenantAchievements.enabled,
          eventType: achievementDefinitions.eventType,
          createdAt: achievementDefinitions.createdAt,
        })
        .from(achievementDefinitions)
        .leftJoin(
          tenantAchievements,
          and(
            eq(tenantAchievements.definitionId, achievementDefinitions.id),
            eq(tenantAchievements.tenantId, tenantId)
          )
        )
        .where(and(eq(achievementDefinitions.id, input.id)))
        .limit(1);

      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Achievement not found' });
      }

      return toEnvelope(
        achievementDto.parse({
          ...row,
          threshold: row.customThreshold ?? row.threshold,
        })
      );
    }),

  /**
   * Create a new achievement definition — staff only.
   * @privileged
   */
  createAchievement: privilegedProcedure
    .input(CreateAchievementInput)
    .meta({
      openapi: {
        method: 'POST',
        path: '/achievements/create',
        protect: true,
        tags: ['achievements'],
      },
    })
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      if (!hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin permission required' });
      }

      const [existing] = await db
        .select({ id: achievementDefinitions.id })
        .from(achievementDefinitions)
        .where(eq(achievementDefinitions.key, input.key))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Achievement with key "${input.key}" already exists`,
        });
      }

      const id = createId();

      const [created] = await db
        .insert(achievementDefinitions)
        .values({
          id,
          key: input.key,
          label: input.label,
          description: input.description ?? null,
          icon: input.icon ?? null,
          eventType: input.eventType,
          threshold: input.threshold,
          category: input.category,
        })
        .returning();

      revalidateAdminChanges();
      return toEnvelope(achievementDto.parse(created));
    }),

  /**
   * Update an achievement definition — staff only.
   * @privileged
   */
  updateAchievement: privilegedProcedure
    .input(UpdateAchievementInput)
    .meta({
      openapi: {
        method: 'PATCH',
        path: '/achievements/update',
        protect: true,
        tags: ['achievements'],
      },
    })
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      if (!hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin permission required' });
      }

      const [existing] = await db
        .select()
        .from(achievementDefinitions)
        .where(eq(achievementDefinitions.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Achievement not found' });
      }

      const updateData: Record<string, unknown> = {};
      if (input.label !== undefined) updateData.label = input.label;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.icon !== undefined) updateData.icon = input.icon;
      if (input.eventType !== undefined) updateData.eventType = input.eventType;
      if (input.threshold !== undefined) updateData.threshold = input.threshold;
      if (input.category !== undefined) updateData.category = input.category;

      const [updated] = await db
        .update(achievementDefinitions)
        .set(updateData)
        .where(eq(achievementDefinitions.id, input.id))
        .returning();

      revalidateAdminChanges();
      return toEnvelope(achievementDto.parse(updated));
    }),

  /**
   * Delete an achievement definition — staff only.
   * @privileged
   */
  deleteAchievement: privilegedProcedure
    .input(IdInput)
    .meta({
      openapi: {
        method: 'DELETE',
        path: '/achievements/delete',
        protect: true,
        tags: ['achievements'],
      },
    })
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      if (!hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin permission required' });
      }

      const [existing] = await db
        .select()
        .from(achievementDefinitions)
        .where(eq(achievementDefinitions.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Achievement not found' });
      }

      await db
        .update(achievementDefinitions)
        .set({ deletedAt: new Date() })
        .where(eq(achievementDefinitions.id, input.id));

      revalidateAdminChanges();

      return toEnvelope({ success: true });
    }),

  /**
   * Get the current user's achievement progress.
   * @tenant
   */
  getMyProgress: tenantProcedure
    .input(GetProgressInput.optional())
    .meta({
      openapi: {
        method: 'GET',
        path: '/achievements/my-progress',
        protect: true,
        tags: ['achievements'],
      },
    })
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const conditions = [
        eq(userAchievementProgresses.userId, ctx.userId),
        eq(userAchievementProgresses.tenantId, tenantId),
      ];

      if (input?.definitionId) {
        conditions.push(eq(userAchievementProgresses.definitionId, input.definitionId));
      }

      const rows = await db
        .select({
          definitionKey: achievementDefinitions.key,
          definitionId: userAchievementProgresses.definitionId,
          label: achievementDefinitions.label,
          threshold: achievementDefinitions.threshold,
          customThreshold: tenantAchievements.customThreshold,
          count: userAchievementProgresses.count,
          enabled: tenantAchievements.enabled,
          updatedAt: userAchievementProgresses.updatedAt,
        })
        .from(userAchievementProgresses)
        .innerJoin(
          achievementDefinitions,
          eq(achievementDefinitions.id, userAchievementProgresses.definitionId)
        )
        .leftJoin(
          tenantAchievements,
          and(
            eq(tenantAchievements.definitionId, userAchievementProgresses.definitionId),
            eq(tenantAchievements.tenantId, tenantId)
          )
        )
        .where(and(...conditions));

      return toEnvelope(
        rows
          .filter(row => row.enabled !== false)
          .map(row => {
            const effectiveThreshold = row.customThreshold ?? row.threshold;
            return achievementProgressDto.parse({
              definitionKey: row.definitionKey,
              definitionId: row.definitionId,
              label: row.label,
              count: row.count,
              threshold: effectiveThreshold,
              percentage: Math.min(100, Math.round((row.count / effectiveThreshold) * 100)),
              updatedAt: row.updatedAt,
            });
          })
      );
    }),

  /**
   * Get achievement progress for a specific user or achievement.
   * @tenant
   */
  getAchievementProgress: tenantProcedure
    .input(z.object({ achievementId: z.string(), userId: z.string().optional() }))
    .meta({
      openapi: {
        method: 'GET',
        path: '/achievements/progress',
        protect: true,
        tags: ['achievements'],
      },
    })
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      if (input.userId && input.userId !== ctx.userId && !hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot view other users progress' });
      }

      const targetUserId = input.userId ?? ctx.userId;

      const conditions = [
        eq(userAchievementProgresses.definitionId, input.achievementId),
        eq(userAchievementProgresses.userId, targetUserId),
        eq(userAchievementProgresses.tenantId, tenantId),
      ];

      const [row] = await db
        .select({
          definitionKey: achievementDefinitions.key,
          definitionId: userAchievementProgresses.definitionId,
          label: achievementDefinitions.label,
          threshold: achievementDefinitions.threshold,
          customThreshold: tenantAchievements.customThreshold,
          count: userAchievementProgresses.count,
          enabled: tenantAchievements.enabled,
          updatedAt: userAchievementProgresses.updatedAt,
        })
        .from(userAchievementProgresses)
        .innerJoin(
          achievementDefinitions,
          eq(achievementDefinitions.id, userAchievementProgresses.definitionId)
        )
        .leftJoin(
          tenantAchievements,
          and(
            eq(tenantAchievements.definitionId, userAchievementProgresses.definitionId),
            eq(tenantAchievements.tenantId, tenantId)
          )
        )
        .where(and(...conditions))
        .limit(1);

      if (!row) {
        return toEnvelope({
          definitionKey: null,
          definitionId: input.achievementId,
          label: null,
          count: 0,
          threshold: 0,
          percentage: 0,
          updatedAt: null,
        });
      }

      const effectiveThreshold = row.customThreshold ?? row.threshold;

      return toEnvelope(
        achievementProgressDto.parse({
          definitionKey: row.definitionKey,
          definitionId: row.definitionId,
          label: row.label,
          count: row.count,
          threshold: effectiveThreshold,
          percentage: Math.min(100, Math.round((row.count / effectiveThreshold) * 100)),
          updatedAt: row.updatedAt,
        })
      );
    }),

  /**
   * Get unlocked achievements for a user.
   * @tenant
   */
  getUnlocked: tenantProcedure
    .input(z.object({ userId: z.string().optional() }).optional())
    .meta({
      openapi: {
        method: 'GET',
        path: '/achievements/unlocked',
        protect: true,
        tags: ['achievements'],
      },
    })
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      if (input?.userId && input.userId !== ctx.userId && !hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot view other users achievements' });
      }

      const targetUserId = input?.userId ?? ctx.userId;

      const rows = await db
        .select()
        .from(userAchievements)
        .where(
          and(eq(userAchievements.userId, targetUserId), eq(userAchievements.tenantId, tenantId))
        )
        .orderBy(userAchievements.unlockedAt);

      return toEnvelope(rows);
    }),
});
