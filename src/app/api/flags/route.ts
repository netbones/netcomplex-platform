import { NextRequest, NextResponse } from 'next/server';
import { getPageFlags, getPageFlag } from '@/lib/flags';
import { getStatsigExperimentFlags } from '@/lib/flags/statsig-flags';
import { withTenantOptional } from '@/lib/tenant/with-tenant';
import { logError } from '@/lib/logging';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const flagParam = searchParams.get('flag');
    const experiments = searchParams.get('experiments');

    const { tenantId } = await withTenantOptional();

    if (!flagParam && !experiments) {
      const allFlags = await getPageFlags();
      return NextResponse.json({ flags: allFlags, tenantId });
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
      ] as const;
      if (!validFlags.includes(flagParam as (typeof validFlags)[number])) {
        return NextResponse.json({ error: 'Invalid flag parameter' }, { status: 400 });
      }
      const value = await getPageFlag(flagParam as (typeof validFlags)[number]);
      return NextResponse.json({ flag: flagParam, value, tenantId });
    }

    if (experiments === 'true') {
      const expFlags = await getStatsigExperimentFlags();
      return NextResponse.json({ experiments: expFlags, tenantId });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    logError({ component: 'flags-api', operation: 'GET' }, 'Failed to evaluate flags', error);
    return NextResponse.json(
      { error: 'Failed to evaluate flags', detail: String(error) },
      { status: 500 }
    );
  }
}
