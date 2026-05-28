import { NextRequest } from 'next/server';
import { getTenantById, updateTenant, deleteTenant } from '@entities/tenant/api/base';
import { requirePlatformAdmin } from '@entities/tenant/api/guards';
import { logError } from '@shared/lib';

import { apiError, apiSuccess, apiInternalError, apiNotFound } from '@api/api-response';
import { writeAuditLog } from '@api/audit-log';
import { auth } from '@api/auth';
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePlatformAdmin(request);
  if (guard) return guard;

  try {
    const { id } = await params;
    const tenant = await getTenantById(id);

    if (!tenant) {
      return apiNotFound('Tenant not found');
    }

    return apiSuccess(tenant);
  } catch (error) {
    logError({ component: 'tenant-api', operation: 'GET' }, 'Failed to get tenant', error);
    return apiInternalError('Failed to get tenant');
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

    // Audit log: record tenant update with updated fields
    const session = await auth.api.getSession({ headers: request.headers });
    writeAuditLog({
      action: 'TENANT_UPDATED',
      actorId: session?.user?.id || 'unknown',
      targetId: id,
      details: { updatedFields: Object.keys(body) },
      requestId: request.headers.get('x-request-id') || undefined,
    });

    return apiSuccess(tenant);
  } catch (error) {
    logError({ component: 'tenant-api', operation: 'UPDATE' }, 'Failed to update tenant', error);
    return apiInternalError('Failed to update tenant');
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
    return apiSuccess({ success: true });
  } catch (error) {
    logError({ component: 'tenant-api', operation: 'DELETE' }, 'Failed to delete tenant', error);
    return apiInternalError('Failed to delete tenant');
  }
}
