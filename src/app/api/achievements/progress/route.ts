import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import {
  getSessionAndRole,
  runWithRLS,
  requireTenantRLS,
  apiSuccess,
  apiInternalError,
  apiUnauthorized,
} from '@api/server';
import { achievementDefinitions } from '@schema/achievement-definitions';
import { tenantAchievements } from '@schema/tenant-achievements';
import { userAchievementProgresses } from '@schema/user-achievement-progresses';
import { createComponentLogger } from '@shared/lib';

export const maxDuration = 8;

const log = createComponentLogger('achievements-progress-api');

export async function GET(request: NextRequest) {
  try {
    const sessionRole = await getSessionAndRole();
    if (!sessionRole) return apiUnauthorized();

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
            eq(userAchievementProgresses.userId, sessionRole.userId),
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
