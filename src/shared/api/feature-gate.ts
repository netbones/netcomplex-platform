/**
 * Feature gate guard for API routes.
 *
 * Checks whether a module is enabled for the current tenant
 * and returns a canonical FEATURE_DISABLED error if not.
 *
 * Uses the DB-backed module enforcement system (platform_modules + tenant_modules + tier).
 */

import { apiError, ERROR_CODES } from './api-response';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { isModuleEnabled } from '@entities/tenant/lib/modules';

/**
 * Assert that a module is enabled for the current tenant.
 * Returns a NextResponse with FEATURE_DISABLED error if the module is not enabled.
 * Returns null if the module is enabled.
 */
export async function assertModuleEnabled(
  moduleKey: string
): Promise<ReturnType<typeof apiError> | null> {
  try {
    const { tenantId } = await withTenant();

    const enabled = await isModuleEnabled(tenantId, moduleKey);
    if (!enabled) {
      return apiError(
        ERROR_CODES.FEATURE_DISABLED,
        'This feature is not available for your community',
        403
      );
    }

    return null;
  } catch {
    return apiError(ERROR_CODES.INTERNAL_ERROR, 'Failed to check feature availability', 500);
  }
}
