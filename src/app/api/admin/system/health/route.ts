import { apiSuccess, apiInternalError, requireAnyPermission, db, users } from '@api/server';
import { withTenant } from '@entities/tenant/server';
import { count, eq, sql } from 'drizzle-orm';
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

    const activeResult = await db.execute(sql`
      SELECT count(distinct "userId") as count
      FROM "session"
      WHERE "expiresAt" > now()
    `);

    const activeUsers = Number((activeResult.rows[0] as { count: string }).count);

    log.info({ tenantId, totalUsers: userResult?.count }, 'health check results');

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
