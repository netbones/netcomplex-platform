import { NextRequest } from 'next/server';
import { getPlatformPageFlagsWithTx } from '@entities/tenant/server';
import { getStatsigExperimentFlags } from '@entities/tenant/server';
import { withTenant } from '@entities/tenant/server';
import { createComponentLogger } from '@shared/lib';
import { sql } from 'drizzle-orm';

import { apiError, apiSuccess, db } from '@api/server';

const log = createComponentLogger('flags-api');

export const dynamic = 'force-dynamic';

async function readFlagsForTenant(tenantId: string) {
  return db.transaction(async tx => {
    try {
      await tx.execute(sql`SET LOCAL ROLE app_user`);
    } catch {
      // app_user role not created yet — proceed without role switch
    }
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
    return getPlatformPageFlagsWithTx(
      tx as unknown as Parameters<typeof getPlatformPageFlagsWithTx>[0],
      tenantId
    );
  });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const flagParam = searchParams.get('flag');
    const experiments = searchParams.get('experiments');

    const { tenantId } = await withTenant();

    if (!flagParam && !experiments) {
      const allFlags = await readFlagsForTenant(tenantId);
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
        'headerLinks',
      ] as const;
      if (!validFlags.includes(flagParam as (typeof validFlags)[number])) {
        return apiError('VALIDATION_ERROR', 'Invalid flag parameter', 400);
      }
      const allFlags = await readFlagsForTenant(tenantId);
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
