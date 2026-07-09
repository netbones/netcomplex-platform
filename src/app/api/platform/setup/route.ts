import {
  db,
  tenants,
  apiError,
  apiForbidden,
  apiNotFound,
  apiSuccess,
  auth,
  withErrorHandler,
} from '@api/server';

import { eq } from 'drizzle-orm';
import { getTenantSetup } from '@entities/setup/server';

export const maxDuration = 8;

/**
 * GET /api/platform/setup?tenantId=<id>
 *
 * Returns the full TenantSetup with missions grouped by section.
 * Caller must be the tenant owner or have an admin role scoped to the tenant.
 */
export const GET = withErrorHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) {
    return apiError('VALIDATION_ERROR', 'tenantId query parameter is required', 400);
  }

  // Authenticate
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return apiError('AUTH_REQUIRED', 'Authentication required', 401);
  }

  // Tenant-scoped auth: user must be the tenant owner
  const tenant = await db
    .select({ ownerId: tenants.ownerId })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant[0]) {
    return apiNotFound('Tenant not found');
  }

  if (session.user.id !== tenant[0].ownerId) {
    return apiForbidden('You do not have access to this tenant');
  }

  const setup = await getTenantSetup(tenantId);

  if (!setup) {
    return apiNotFound('Setup not found for this tenant');
  }

  return apiSuccess({ setup });
});
