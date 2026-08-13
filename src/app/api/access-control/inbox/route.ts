import { NextRequest } from 'next/server';
import { apiSuccess, apiError, withErrorHandler } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { resolveCallerPropertyId, listAccessInbox } from '@entities/access-control/server';

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

  const inbox = await listAccessInbox(tenantId, propertyId);
  return apiSuccess(inbox);
});
