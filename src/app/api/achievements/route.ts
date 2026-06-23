import { NextRequest } from 'next/server';
import { eq, and, or, isNull } from 'drizzle-orm';
import {
  getSessionAndRole,
  runWithRLS,
  getRLSContext,
  apiSuccess,
  apiInternalError,
  apiUnauthorized,
} from '@api/server';
import { achievementDefinitions } from '@schema/achievement-definitions';
import { tenantAchievements } from '@schema/tenant-achievements';
import { userAchievements } from '@schema/user-achievements';
import { createComponentLogger } from '@shared/lib';

export const maxDuration = 8;

const log = createComponentLogger('achievements-api');

export async function GET(request: NextRequest) {
  try {
    const sessionRole = await getSessionAndRole();
    if (!sessionRole) return apiUnauthorized();

    const ctx = await getRLSContext(request);
    if (!ctx) return apiUnauthorized();

    return runWithRLS(ctx, async tx => {
      const rows = await tx
        .select({
          id: achievementDefinitions.id,
          key: achievementDefinitions.key,
          label: achievementDefinitions.label,
          description: achievementDefinitions.description,
          icon: achievementDefinitions.icon,
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
            eq(tenantAchievements.tenantId, ctx.tenantId)
          )
        )
        .leftJoin(
          userAchievements,
          and(
            eq(userAchievements.definitionId, achievementDefinitions.id),
            eq(userAchievements.userId, sessionRole.userId),
            eq(userAchievements.tenantId, ctx.tenantId)
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
