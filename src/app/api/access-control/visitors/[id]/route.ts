import { NextRequest } from 'next/server';
import { apiSuccess, apiError, withErrorHandler } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { resolveCallerPropertyId, cancelVisitor } from '@entities/access-control/server';

export const maxDuration = 8;

export const DELETE = withErrorHandler(
  async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    const moduleGate = await assertModuleEnabled('accessControl');
    if (moduleGate) return moduleGate;

    const { tenantId } = await withTenant();
    const propertyId = await resolveCallerPropertyId(tenantId, auth.data.userId);
    if (!propertyId) {
      return apiError('PROPERTY_REQUIRED', 'No property linked to your account', 400);
    }

    const { id } = await context.params;
    const ok = await cancelVisitor({
      tenantId,
      propertyId,
      visitorId: id,
      userId: auth.data.userId,
    });

    if (!ok) return apiError('NOT_FOUND', 'Visitor not found', 404);
    return apiSuccess({ cancelled: true });
  }
);
