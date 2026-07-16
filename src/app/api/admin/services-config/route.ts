import { NextRequest } from 'next/server';
import {
  getServicesConfigWithTx,
  upsertServicesConfig,
  defaultServicesConfig,
  type ServicesPageConfig,
  servicesConfigSchema,
} from '@entities/tenant/server';
import {
  getSessionAndRole,
  guardSuspension,
  runWithRLS,
  requireTenantRLS,
  apiForbidden,
  apiUnauthorized,
  apiSuccess,
  apiInternalError,
  apiValidationError,
  writeAuditLog,
  rateLimitByUser,
  CACHE_TAGS,
} from '@api/server';
import { revalidateTag } from 'next/cache';
import { hasPermission } from '@shared/lib';
import { createComponentLogger } from '@shared/lib';

export const maxDuration = 8;

const log = createComponentLogger('services-config-api');

export async function GET(request: NextRequest) {
  try {
    const rls = await requireTenantRLS(request);
    if (!rls.ok) return rls.response;
    const { ctx, tenantId } = rls;

    return runWithRLS(ctx, async tx => {
      const config = await getServicesConfigWithTx(tx, tenantId);
      return apiSuccess(config);
    });
  } catch (error) {
    log.error({ operation: 'GET' }, 'Failed to get services config', error);
    return apiInternalError(String(error));
  }
}

export async function PUT(request: NextRequest) {
  try {
    const sessionRole = await getSessionAndRole();
    if (!sessionRole) return apiUnauthorized();
    const guard = guardSuspension(sessionRole);
    if (guard) return guard;
    if (!hasPermission(sessionRole.role, 'admin')) return apiForbidden();

    const rateLimit = await rateLimitByUser(sessionRole.userId, {
      windowMs: 60_000,
      maxRequests: 10,
    });
    if (rateLimit) return rateLimit;

    const rls = await requireTenantRLS(request);
    if (!rls.ok) return rls.response;
    const { ctx, tenantId } = rls;

    const rawBody = await request.json();
    const parsed = servicesConfigSchema.partial().safeParse(rawBody);

    if (!parsed.success) {
      return apiValidationError(parsed.error.flatten());
    }

    const defaults = defaultServicesConfig();
    const config: ServicesPageConfig = { ...defaults, ...parsed.data };

    const result = await runWithRLS(ctx, async tx => {
      const oldConfig = await getServicesConfigWithTx(tx, tenantId);
      const success = await upsertServicesConfig(tx, tenantId, config);
      return { success, oldConfig };
    });

    if (result.success) {
      writeAuditLog({
        action: 'SETTINGS_CHANGED',
        actorId: sessionRole.userId,
        tenantId,
        details: {
          key: 'services-config',
          oldValue: result.oldConfig,
          newValue: config,
          method: 'PUT',
        },
      });
      revalidateTag(CACHE_TAGS.SETTINGS);
      return apiSuccess({ success: true });
    }

    return apiInternalError('Failed to save');
  } catch (error) {
    log.error({ operation: 'PUT' }, 'Failed to update services config', error);
    return apiInternalError(String(error));
  }
}
