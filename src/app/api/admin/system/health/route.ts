import {
  apiSuccess,
  apiInternalError,
  requireAnyPermission,
  db,
  users,
  sessions,
} from '@api/server';
import { withTenant } from '@entities/tenant/server';
import { count, eq, gt } from 'drizzle-orm';
import { createComponentLogger } from '@shared/lib';

export const maxDuration = 5;

const log = createComponentLogger('system-health-api');

export async function GET(request: Request) {
  try {
    const authError = await requireAnyPermission(['admin', 'settings']);
    if (authError) return authError;

    const { tenantId } = await withTenant();

    const [userResult] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.tenantId, tenantId));

    const [activeResult] = await db
      .select({ count: count() })
      .from(sessions)
      .where(gt(sessions.expiresAt, new Date()));

    log.info(
      { tenantId, totalUsers: userResult?.count, activeSessions: activeResult?.count },
      'health check'
    );

    return apiSuccess({
      db: 'connected' as const,
      tenantId,
      tenantName: tenantId,
      totalUsers: userResult?.count ?? 0,
      activeUsers: activeResult?.count ?? 0,
    });
  } catch (error) {
    log.error({}, 'Health check failed', error);
    return apiInternalError(String(error));
  }
}
