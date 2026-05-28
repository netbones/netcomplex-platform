import { NextRequest } from 'next/server';
import {
  setPlatformPageFlag,
  getPlatformPageFlags,
  type PlatformPageFlags,
} from '@entities/tenant/api/flags/platform-flags';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { getSessionAndRole } from '@api/auth-utils';
import { createComponentLogger } from '@shared/lib';

import { apiError, apiForbidden, apiSuccess, apiInternalError } from '@api/api-response';
const log = createComponentLogger('page-flags-api');

export async function GET() {
  try {
    const { tenantId } = await withTenant();
    const flags = await getPlatformPageFlags(tenantId);
    return apiSuccess(flags);
  } catch (error) {
    log.error({ operation: 'GET' }, 'Failed to get page flags', error);
    return apiInternalError(String(error));
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionRole = await getSessionAndRole();
    if (!sessionRole || sessionRole.role !== 'ADMIN') {
      return apiForbidden();
    }

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

    const success = await setPlatformPageFlag(tenantId, key, value);

    if (success) {
      return apiSuccess({ success: true, key, value });
    }

    return apiInternalError('Failed to update');
  } catch (error) {
    log.error({ operation: 'POST' }, 'Failed to update page flag', error);
    return apiInternalError(String(error));
  }
}
