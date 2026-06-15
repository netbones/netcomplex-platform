import { NextRequest } from 'next/server';
import { listTenants, createTenant } from '@entities/tenant/server';
import { requirePlatformAdmin } from '@entities/tenant/server';
import { logError } from '@shared/lib';

import {
  apiCreated,
  apiError,
  apiSuccess,
  apiInternalError,
  writeAuditLog,
  auth,
} from '@api/server';

export async function GET(request: NextRequest) {
  const guard = await requirePlatformAdmin(request);
  if (guard) return guard;

  try {
    const tenants = await listTenants();
    return apiSuccess(tenants);
  } catch (error) {
    logError({ component: 'tenants-api', operation: 'LIST' }, 'Failed to list tenants', error);
    return apiInternalError('Failed to list tenants');
  }
}

export async function POST(request: NextRequest) {
  const guard = await requirePlatformAdmin(request);
  if (guard) return guard;

  try {
    const body = await request.json();

    // Get session for audit logging
    const session = await auth.api.getSession({ headers: request.headers });

    const tenant = await createTenant({
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

    // Audit log: record tenant creation with actor and details
    writeAuditLog({
      action: 'TENANT_CREATED',
      actorId: session?.user?.id || 'unknown',
      targetId: tenant.id,
      details: { name: tenant.name, slug: tenant.slug },
      requestId: request.headers.get('x-request-id') || undefined,
    });

    return apiCreated(tenant);
  } catch (error) {
    logError({ component: 'tenants-api', operation: 'CREATE' }, 'Failed to create tenant', error);
    return apiInternalError('Failed to create tenant');
  }
}
