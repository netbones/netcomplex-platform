import { NextRequest } from 'next/server';
import { apiSuccess, apiError, withErrorHandler } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { resolveCallerPropertyId, listVisitorHistory } from '@entities/access-control/server';
import { db } from '@api/server';
import { accessRequests } from '@/db/schema/access-requests';
import { and, desc, eq, inArray } from 'drizzle-orm';

export const maxDuration = 8;

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('accessControl');
  if (moduleGate) return moduleGate;

  const { tenantId } = await withTenant();
  const propertyId = await resolveCallerPropertyId(tenantId, auth.data.userId);
  if (!propertyId) {
    return apiError('PROPERTY_REQUIRED', 'No property linked to your account', 400);
  }

  const visitors = await listVisitorHistory(tenantId, propertyId);

  const requestRows = await db
    .select({
      id: accessRequests.id,
      visitorName: accessRequests.visitorName,
      status: accessRequests.status,
      requestedAt: accessRequests.requestedAt,
      vehicleReg: accessRequests.vehicleReg,
      roleLabel: accessRequests.roleLabel,
    })
    .from(accessRequests)
    .where(
      and(
        eq(accessRequests.tenantId, tenantId),
        eq(accessRequests.propertyId, propertyId),
        inArray(accessRequests.status, ['ALLOWED', 'DENIED', 'EXPIRED'])
      )
    )
    .orderBy(desc(accessRequests.requestedAt))
    .limit(100);

  return apiSuccess({
    visitors,
    accessRequests: requestRows.map(r => ({
      id: r.id,
      visitorName: r.visitorName,
      status: r.status,
      requestedAt: r.requestedAt.toISOString(),
      vehicleReg: r.vehicleReg,
      roleLabel: r.roleLabel,
    })),
  });
});
