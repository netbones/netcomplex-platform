import { NextRequest } from 'next/server';
import { withTenant } from '@entities/tenant/server';
import { apiSuccess, apiInternalError, getTenantBillingSnapshot } from '@api/server';
import { logError } from '@shared/lib';

export const maxDuration = 8;

export async function GET(_request: NextRequest) {
  try {
    const { tenantId } = await withTenant();
    const snapshot = await getTenantBillingSnapshot(tenantId);
    return apiSuccess(snapshot);
  } catch (error) {
    logError(
      { component: 'tenant-billing-snapshot-api', operation: 'GET' },
      'Failed to get billing snapshot',
      error
    );
    return apiInternalError();
  }
}
