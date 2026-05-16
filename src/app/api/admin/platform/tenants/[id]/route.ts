import { NextRequest, NextResponse } from 'next/server';
import { getTenantById, updateTenant, deleteTenant } from '@entities/tenant/api/base';
import { requirePlatformAdmin } from '@entities/tenant/api/guards';
import { logError } from '@shared/lib';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePlatformAdmin(request);
  if (guard) return guard;

  try {
    const { id } = await params;
    const tenant = await getTenantById(id);

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (error) {
    logError({ component: 'tenant-api', operation: 'GET' }, 'Failed to get tenant', error);
    return NextResponse.json({ error: 'Failed to get tenant' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePlatformAdmin(request);
  if (guard) return guard;

  try {
    const { id } = await params;
    const body = await request.json();

    const tenant = await updateTenant(id, {
      name: body.name,
      slug: body.slug,
      customDomain: body.customDomain,
      logoUrl: body.logoUrl,
      faviconUrl: body.faviconUrl,
      primaryColor: body.primaryColor,
      accentColor: body.accentColor,
      secondaryColor: body.secondaryColor,
      fontFamily: body.fontFamily,
      customCss: body.customCss,
      active: body.active,
      subscriptionTier: body.subscriptionTier,
      maxPages: body.maxPages,
      featureFlags: body.featureFlags,
    });

    return NextResponse.json(tenant);
  } catch (error) {
    logError({ component: 'tenant-api', operation: 'UPDATE' }, 'Failed to update tenant', error);
    return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePlatformAdmin(request);
  if (guard) return guard;

  try {
    const { id } = await params;
    await deleteTenant(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    logError({ component: 'tenant-api', operation: 'DELETE' }, 'Failed to delete tenant', error);
    return NextResponse.json({ error: 'Failed to delete tenant' }, { status: 500 });
  }
}
