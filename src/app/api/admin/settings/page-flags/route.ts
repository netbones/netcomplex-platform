import { NextRequest, NextResponse } from 'next/server';
import {
  setPlatformPageFlag,
  getPlatformPageFlags,
  type PlatformPageFlags,
} from '@/lib/flags/platform-flags';
import { withTenant } from '@/lib/tenant/with-tenant';
import { getSessionAndRole } from '@/lib/auth-utils';
import { logError } from '@/lib/logging';

export async function GET() {
  try {
    const { tenantId } = await withTenant();
    const flags = await getPlatformPageFlags(tenantId);
    return NextResponse.json(flags);
  } catch (error) {
    logError({ component: 'page-flags-api', operation: 'GET' }, 'Failed to get page flags', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionRole = await getSessionAndRole();
    if (!sessionRole || sessionRole.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    ];

    if (!validKeys.includes(key)) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
    }

    const success = await setPlatformPageFlag(tenantId, key, value);

    if (success) {
      return NextResponse.json({ success: true, key, value });
    }

    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  } catch (error) {
    logError(
      { component: 'page-flags-api', operation: 'POST' },
      'Failed to update page flag',
      error
    );
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
