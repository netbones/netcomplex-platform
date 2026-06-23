import {
  apiSuccess,
  apiInternalError,
  requireAnyPermission,
  db,
  users,
  sessions,
  now,
} from '@api/server';
import { withTenant } from '@entities/tenant/server';
import { count, eq, gt, and } from 'drizzle-orm';
import { createComponentLogger } from '@shared/lib';

export const maxDuration = 5;

const log = createComponentLogger('system-health-api');

export async function GET(_request: Request) {
  try {
    const authError = await requireAnyPermission(['admin', 'settings']);
    if (authError) return authError;

    const { tenantId } = await withTenant();

    const [userResult] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.tenantId, tenantId));

    const activeSessions = await db
      .select({ userId: sessions.userId })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(users.tenantId, tenantId), gt(sessions.expiresAt, now())));

    const activeUsers = new Set(activeSessions.map(r => r.userId)).size;

    return apiSuccess({
      db: 'connected' as const,
      tenantId,
      tenantName: tenantId,
      totalUsers: userResult?.count ?? 0,
      activeUsers,
    });
  } catch (error) {
    log.error({}, 'Health check failed', error);
    return apiInternalError(String(error));
  }
}
