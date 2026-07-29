import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { runWithRLS, requireTenantRLS, apiSuccess, apiInternalError } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { achievementDefinitions } from '@schema/achievement-definitions';
import { tenantAchievements } from '@schema/tenant-achievements';
import { userAchievementProgresses } from '@schema/user-achievement-progresses';
import { createComponentLogger } from '@shared/lib';

export const maxDuration = 8;

const log = createComponentLogger('achievements-progress-api');

/**
 * @deprecated Use trpc.achievements.getMyProgress instead.
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
          definitionKey: achievementDefinitions.key,
          label: achievementDefinitions.label,
          threshold: achievementDefinitions.threshold,
          customThreshold: tenantAchievements.customThreshold,
          count: userAchievementProgresses.count,
          enabled: tenantAchievements.enabled,
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
        .where(
          and(
            eq(userAchievementProgresses.userId, auth.data.userId),
            eq(userAchievementProgresses.tenantId, tenantId)
          )
        );

      const progress = rows
        .filter(row => row.enabled !== false)
        .map(row => {
          const effectiveThreshold = row.customThreshold ?? row.threshold;
          return {
            definitionKey: row.definitionKey,
            label: row.label,
            count: row.count,
            threshold: effectiveThreshold,
            percentage: Math.min(100, Math.round((row.count / effectiveThreshold) * 100)),
          };
        });

      return apiSuccess(progress);
    });
  } catch (error) {
    log.error({ operation: 'GET' }, 'Failed to get achievement progress', error);
    return apiInternalError(String(error));
  }
}
