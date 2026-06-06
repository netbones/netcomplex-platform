import { NextRequest } from 'next/server';
import {
  setPlatformPageFlagWithTx,
  getPlatformPageFlagsWithTx,
  type PlatformPageFlags,
} from '@entities/tenant';
import { withTenant } from '@entities/tenant';
import { getSessionAndRole } from '@api/auth-utils';
import { isAdmin } from '@entities/tenant';
import { createComponentLogger } from '@shared/lib';
import { runWithRLS, getRLSContext } from '@api/db';

import {
  apiError,
  apiForbidden,
  apiSuccess,
  apiInternalError,
  apiUnauthorized,
} from '@api/api-response';
const log = createComponentLogger('page-flags-api');

export async function GET(request: NextRequest) {
  try {
    const ctx = await getRLSContext(request);
    if (!ctx) return apiUnauthorized();

    return runWithRLS(ctx, async tx => {
      const { tenantId } = await withTenant();
      const flags = await getPlatformPageFlagsWithTx(tx, tenantId);
      return apiSuccess(flags);
    });
  } catch (error) {
    log.error({ operation: 'GET' }, 'Failed to get page flags', error);
    return apiInternalError(String(error));
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionRole = await getSessionAndRole();
    if (!sessionRole || !isAdmin(sessionRole.role)) {
      return apiForbidden();
    }

    const ctx = await getRLSContext(request);
    if (!ctx) return apiUnauthorized();

    return runWithRLS(ctx, async tx => {
      const { tenantId } = await withTenant();
      const body = await request.json();
      const { key, value } = body as { key: keyof PlatformPageFlags; value: string | boolean };

      const validKeys: (keyof PlatformPageFlags)[] = [
        'campaign',
        'conservation',
        'conservationExternalUrl',
        'chat',
        'news',
        'events',
        'directory',
        'groups',
        'services',
        'resources',
        'maintenance',
        'surveys',
        'competitions',
      ];

      if (!validKeys.includes(key)) {
        return apiError('VALIDATION_ERROR', 'Invalid key', 400);
      }

      const success = await setPlatformPageFlagWithTx(tx, tenantId, key, value);

      if (success) {
        return apiSuccess({ success: true, key, value });
      }

      return apiInternalError('Failed to update');
    });
  } catch (error) {
    log.error({ operation: 'POST' }, 'Failed to update page flag', error);
    return apiInternalError(String(error));
  }
}
