import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import {
  runWithRLS,
  requireTenantRLS,
  apiSuccess,
  apiError,
  apiInternalError,
  writeAuditLog,
  rateLimitByUser,
} from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { achievementDefinitions } from '@schema/achievement-definitions';
import { tenantAchievements } from '@schema/tenant-achievements';
import { createComponentLogger } from '@shared/lib';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

const log = createComponentLogger('admin-achievements-api');

const patchBodySchema = z.object({
  enabled: z.boolean().optional(),
  customThreshold: z.number().int().positive().nullable().optional(),
  icon: z.string().optional(),
});

/**
 * @deprecated Use trpc.achievements.updateAchievement instead.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request, { permission: 'admin' });
    if (!auth.success) return auth.response;

    const rateLimit = await rateLimitByUser(auth.data.userId, {
      windowMs: 60_000,
      maxRequests: 20,
    });
    if (rateLimit) return rateLimit;

    const rls = await requireTenantRLS(request);
    if (!rls.ok) return rls.response;
    const { ctx, tenantId } = rls;

    const body = await request.json();
    const parsed = patchBodySchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.message, 400);
    }

    const { id: definitionId } = await params;
    const { enabled, customThreshold, icon } = parsed.data;

    return runWithRLS(ctx, async tx => {
      const [definition] = await tx
        .select({ id: achievementDefinitions.id })
        .from(achievementDefinitions)
        .where(eq(achievementDefinitions.id, definitionId))
        .limit(1);

      if (!definition) {
        return apiError('NOT_FOUND', 'Achievement definition not found', 404);
      }

      const hasTenantFields =
        enabled !== undefined || customThreshold !== undefined || icon !== undefined;

      if (hasTenantFields) {
        const [existing] = await tx
          .select({ id: tenantAchievements.id })
          .from(tenantAchievements)
          .where(
            and(
              eq(tenantAchievements.tenantId, tenantId),
              eq(tenantAchievements.definitionId, definitionId)
            )
          )
          .limit(1);

        if (existing) {
          const updateFields: Record<string, unknown> = {};
          if (enabled !== undefined) updateFields.enabled = enabled;
          if (customThreshold !== undefined) updateFields.customThreshold = customThreshold;
          if (icon !== undefined) updateFields.icon = icon;

          await tx
            .update(tenantAchievements)
            .set(updateFields)
            .where(eq(tenantAchievements.id, existing.id));
        } else {
          await tx.insert(tenantAchievements).values({
            id: createId(),
            tenantId,
            definitionId,
            enabled: enabled ?? true,
            customThreshold: customThreshold ?? null,
            icon: icon ?? null,
          });
        }
      }

      writeAuditLog({
        action: 'ACHIEVEMENT_CONFIG_CHANGED',
        actorId: auth.data.userId,
        tenantId,
        details: { definitionId, changes: parsed.data },
      });

      return apiSuccess({ definitionId, ...parsed.data });
    });
  } catch (error) {
    log.error({ operation: 'PATCH' }, 'Failed to update achievement config', error);
    return apiInternalError(String(error));
  }
}
