import { db, apiSuccess, withErrorHandler } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { securityAlerts } from '@/db/schema/security-alerts';
import { and, desc, eq } from 'drizzle-orm';

export const maxDuration = 8;

/** GET /api/security/alerts — the caller's own panic alerts only. Tips are never listed. */
export const GET = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('security');
  if (moduleGate) return moduleGate;

  const { tenantId } = await withTenant();

  const rows = await db
    .select({
      id: securityAlerts.id,
      status: securityAlerts.status,
      createdAt: securityAlerts.createdAt,
      acknowledgedAt: securityAlerts.acknowledgedAt,
      resolvedAt: securityAlerts.resolvedAt,
    })
    .from(securityAlerts)
    .where(
      and(
        eq(securityAlerts.tenantId, tenantId),
        eq(securityAlerts.triggeredByUserId, auth.data.userId),
        eq(securityAlerts.alertType, 'PANIC')
      )
    )
    .orderBy(desc(securityAlerts.createdAt))
    .limit(50);

  return apiSuccess({ alerts: rows });
});
