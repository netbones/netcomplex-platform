import {
  apiSuccess,
  apiInternalError,
  apiUnauthorized,
  requireAnyPermission,
  getRLSContext,
  runWithRLS,
  users,
  sessions,
} from '@api/server';
import { count, eq, gt, and, sql } from 'drizzle-orm';
import { createComponentLogger } from '@shared/lib';

export const maxDuration = 5;

const log = createComponentLogger('system-health-api');

export async function GET(request: Request) {
  try {
    const authError = await requireAnyPermission(['admin', 'settings']);
    if (authError) return authError;

    const ctx = await getRLSContext(request);
    if (!ctx) return apiUnauthorized();

    return runWithRLS(ctx, async tx => {
      const tenantId = ctx.tenantId;

      const [userResult] = await tx
        .select({ count: count() })
        .from(users)
        .where(eq(users.tenantId, tenantId));

      const [activeResult] = await tx
        .select({ count: sql<number>`count(distinct ${sessions.userId})` })
        .from(sessions)
        .where(and(eq(sessions.tenantId, tenantId), gt(sessions.expiresAt, new Date())));

      return apiSuccess({
        db: 'connected' as const,
        tenantId,
        tenantName: tenantId,
        totalUsers: userResult?.count ?? 0,
        activeUsers: activeResult?.count ?? 0,
      });
    });
  } catch (error) {
    log.error({}, 'Health check failed', error);
    return apiInternalError(String(error));
  }
}
