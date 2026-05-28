import { NextRequest } from 'next/server';
import { getPlatformPageFlags } from '@entities/tenant/api/flags/platform-flags';
import { getStatsigExperimentFlags } from '@entities/tenant/api/flags/statsig-flags';
import { withTenantOptional } from '@entities/tenant/api/with-tenant';
import { createComponentLogger } from '@shared/lib';

import { apiError, apiSuccess } from '@api/api-response';
const log = createComponentLogger('flags-api');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const flagParam = searchParams.get('flag');
    const experiments = searchParams.get('experiments');

    const { tenantId } = await withTenantOptional();

    if (!flagParam && !experiments) {
      const allFlags = await getPlatformPageFlags(tenantId!);
      return apiSuccess({ flags: allFlags, tenantId });
    }

    if (flagParam) {
      const validFlags = [
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
        'headerEngagementFocus',
      ] as const;
      if (!validFlags.includes(flagParam as (typeof validFlags)[number])) {
        return apiError('VALIDATION_ERROR', 'Invalid flag parameter', 400);
      }
      const allFlags = await getPlatformPageFlags(tenantId!);
      const value = allFlags[flagParam as keyof typeof allFlags];
      return apiSuccess({ flag: flagParam, value, tenantId });
    }

    if (experiments === 'true') {
      const expFlags = await getStatsigExperimentFlags();
      return apiSuccess({ experiments: expFlags, tenantId });
    }

    return apiError('VALIDATION_ERROR', 'Invalid request', 400);
  } catch (error) {
    log.error({ operation: 'GET' }, 'Failed to evaluate flags', error);
    return apiSuccess(
      { error: 'Failed to evaluate flags', detail: String(error) },
      { status: 500 }
    );
  }
}
