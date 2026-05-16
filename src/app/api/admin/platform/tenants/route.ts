import { NextRequest, NextResponse } from 'next/server';
import { listTenants, createTenant } from '@entities/tenant/api/base';
import { requirePlatformAdmin } from '@entities/tenant/api/guards';
import { logError } from '@shared/lib';

export async function GET(request: NextRequest) {
  const guard = await requirePlatformAdmin(request);
  if (guard) return guard;

  try {
    const tenants = await listTenants();
    return NextResponse.json(tenants);
  } catch (error) {
    logError({ component: 'tenants-api', operation: 'LIST' }, 'Failed to list tenants', error);
    return NextResponse.json({ error: 'Failed to list tenants' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const guard = await requirePlatformAdmin(request);
  if (guard) return guard;

  try {
    const body = await request.json();

    const tenant = await createTenant({
      id: crypto.randomUUID(),
      name: body.name,
      slug: body.slug,
      customDomain: body.customDomain || null,
      logoUrl: body.logoUrl || null,
      faviconUrl: body.faviconUrl || null,
      primaryColor: body.primaryColor || '#4F46E5',
      accentColor: body.accentColor || null,
      secondaryColor: body.secondaryColor || null,
      fontFamily: body.fontFamily || null,
      customCss: body.customCss || null,
      active: body.active ?? true,
      subscriptionTier: body.subscriptionTier || 'foundation',
      tier: body.tier || 'STANDARD',
      maxPages: body.maxPages ?? 5,
      pageCount: body.pageCount ?? 0,
      featureFlags: body.featureFlags || {},
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    logError({ component: 'tenants-api', operation: 'CREATE' }, 'Failed to create tenant', error);
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
  }
}
