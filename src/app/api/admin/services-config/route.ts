import { NextRequest } from 'next/server';
import {
  getServicesConfig,
  upsertServicesConfig,
  defaultServicesConfig,
  type ServicesPageConfig,
} from '@entities/tenant/server';
import { withTenant } from '@entities/tenant/server';
import {
  getSessionAndRole,
  runWithRLS,
  getRLSContext,
  apiError,
  apiForbidden,
  apiSuccess,
  apiInternalError,
  apiUnauthorized,
} from '@api/server';
import { isAdmin } from '@shared/lib';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('services-config-api');

export async function GET(request: NextRequest) {
  try {
    const ctx = await getRLSContext(request);
    if (!ctx) return apiUnauthorized();

    const { tenantId } = await withTenant();
    const config = await getServicesConfig(tenantId);
    return apiSuccess(config);
  } catch (error) {
    log.error({ operation: 'GET' }, 'Failed to get services config', error);
    return apiInternalError(String(error));
  }
}

export async function PUT(request: NextRequest) {
  try {
    const sessionRole = await getSessionAndRole();
    if (!sessionRole || !isAdmin(sessionRole.role)) return apiForbidden();

    const ctx = await getRLSContext(request);
    if (!ctx) return apiUnauthorized();

    return runWithRLS(ctx, async tx => {
      const body = (await request.json()) as Partial<ServicesPageConfig>;
      const defaults = defaultServicesConfig();
      const config: ServicesPageConfig = { ...defaults, ...body };

      const success = await upsertServicesConfig(tx, ctx.tenantId, config);
      if (success) return apiSuccess({ success: true });

      return apiInternalError('Failed to save');
    });
  } catch (error) {
    log.error({ operation: 'PUT' }, 'Failed to update services config', error);
    return apiInternalError(String(error));
  }
}
