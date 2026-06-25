import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import {
  getSessionAndRole,
  runWithRLS,
  getRLSContext,
  apiSuccess,
  apiError,
  apiForbidden,
  apiInternalError,
  apiUnauthorized,
  writeAuditLog,
  rateLimitByUser,
} from '@api/server';
import { achievementDefinitions } from '@schema/achievement-definitions';
import { tenantAchievements } from '@schema/tenant-achievements';
import { hasPermission, createComponentLogger } from '@shared/lib';

export const maxDuration = 8;

const log = createComponentLogger('admin-achievements-api');

const patchBodySchema = z.object({
  enabled: z.boolean().optional(),
  customThreshold: z.number().int().positive().nullable().optional(),
  icon: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionRole = await getSessionAndRole();
    if (!sessionRole || !hasPermission(sessionRole.role, 'admin')) {
      return apiForbidden();
    }

    const rateLimit = await rateLimitByUser(sessionRole.userId, {
      windowMs: 60_000,
      maxRequests: 20,
    });
    if (rateLimit) return rateLimit;

    const ctx = await getRLSContext(request);
    if (!ctx) return apiUnauthorized();

    const body = await request.json();
    const parsed = patchBodySchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.message, 400);
    }

    const { id: definitionId } = params;
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
              eq(tenantAchievements.tenantId, ctx.tenantId),
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
            id: crypto.randomUUID(),
            tenantId: ctx.tenantId,
            definitionId,
            enabled: enabled ?? true,
            customThreshold: customThreshold ?? null,
            icon: icon ?? null,
          });
        }
      }

      writeAuditLog({
        action: 'ACHIEVEMENT_CONFIG_CHANGED',
        actorId: sessionRole.userId,
        tenantId: ctx.tenantId,
        details: { definitionId, changes: parsed.data },
      });

      return apiSuccess({ definitionId, ...parsed.data });
    });
  } catch (error) {
    log.error({ operation: 'PATCH' }, 'Failed to update achievement config', error);
    return apiInternalError(String(error));
  }
}
