import { NextRequest } from 'next/server';
import { apiSuccess, apiError, withErrorHandler } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import {
  resolveCallerPropertyId,
  getAccessRequestForProperty,
  respondToAccessRequest,
} from '@entities/access-control/server';
import { accessRequestActionSchema } from '@entities/access-control';

export const maxDuration = 8;

export const GET = withErrorHandler(
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
    const item = await getAccessRequestForProperty({
      tenantId,
      propertyId,
      requestId: id,
    });
    if (!item) return apiError('NOT_FOUND', 'Access request not found', 404);
    return apiSuccess({ request: item });
  }
);

export const POST = withErrorHandler(
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

    const body = await request.json();
    const parsed = accessRequestActionSchema.safeParse(body?.action ?? body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'action must be allow or deny', 400);
    }

    const { id } = await context.params;
    const result = await respondToAccessRequest({
      tenantId,
      propertyId,
      requestId: id,
      userId: auth.data.userId,
      action: parsed.data,
    });

    if (!result.ok) {
      if (result.reason === 'NOT_FOUND') {
        return apiError('NOT_FOUND', 'Access request not found', 404);
      }
      return apiError('ALREADY_RESOLVED', 'Request already resolved or expired', 409);
    }

    return apiSuccess({ action: parsed.data });
  }
);
