import { NextRequest } from 'next/server';
import { eq, and, or, isNull, sql } from 'drizzle-orm';
import { runWithRLS, requireTenantRLS, apiSuccess, apiInternalError } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { achievementDefinitions } from '@schema/achievement-definitions';
import { tenantAchievements } from '@schema/tenant-achievements';
import { userAchievements } from '@schema/user-achievements';
import { createComponentLogger } from '@shared/lib';

export const maxDuration = 8;

const log = createComponentLogger('achievements-api');

/**
 * @deprecated Use trpc.achievements.listAchievements instead.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    const rls = await requireTenantRLS(request);
    if (!rls.ok) return rls.response;
    const { ctx, tenantId } = rls;

    return runWithRLS(ctx, async tx => {
      const rows = await tx
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
          unlockedAt: userAchievements.unlockedAt,
        })
        .from(achievementDefinitions)
        .leftJoin(
          tenantAchievements,
          and(
            eq(tenantAchievements.definitionId, achievementDefinitions.id),
            eq(tenantAchievements.tenantId, tenantId)
          )
        )
        .leftJoin(
          userAchievements,
          and(
            eq(userAchievements.definitionId, achievementDefinitions.id),
            eq(userAchievements.userId, auth.data.userId),
            eq(userAchievements.tenantId, tenantId)
          )
        )
        .where(or(isNull(tenantAchievements.enabled), eq(tenantAchievements.enabled, true)));

      const achievements = rows.map(row => ({
        id: row.id,
        key: row.key,
        label: row.label,
        description: row.description,
        icon: row.icon,
        category: row.category,
        threshold: row.customThreshold ?? row.threshold,
        unlocked: row.unlockedAt !== null,
        unlockedAt: row.unlockedAt,
      }));

      return apiSuccess(achievements);
    });
  } catch (error) {
    log.error({ operation: 'GET' }, 'Failed to get achievements', error);
    return apiInternalError(String(error));
  }
}
