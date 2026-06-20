import { NextRequest } from 'next/server';
import {
  getPlatformPageFlagsWithTx,
  setPlatformPageFlagWithTx,
  type PlatformPageFlags,
} from '@entities/tenant/server';
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

import { hasPermission } from '@shared/lib';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('page-flags-api');

export async function GET(request: NextRequest) {
  try {
    const ctx = await getRLSContext(request);
    if (!ctx) return apiUnauthorized();

    return runWithRLS(ctx, async tx => {
      const flags = await getPlatformPageFlagsWithTx(tx, ctx.tenantId);
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
    if (!sessionRole || !hasPermission(sessionRole.role, 'admin')) {
      return apiForbidden();
    }

    const ctx = await getRLSContext(request);
    if (!ctx) return apiUnauthorized();

    return runWithRLS(ctx, async tx => {
      const body = await request.json();
      const { key, value } = body as {
        key: keyof PlatformPageFlags;
        value: string | boolean | string[];
      };

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
        'dashboard',
        'bookings',
        'messages',
        'headerLinks',
      ];

      if (!validKeys.includes(key)) {
        return apiError('VALIDATION_ERROR', 'Invalid key', 400);
      }

      const success = await setPlatformPageFlagWithTx(tx, ctx.tenantId, key, value);

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
