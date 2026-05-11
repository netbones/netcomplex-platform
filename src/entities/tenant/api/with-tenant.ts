import 'server-only';

import { headers } from 'next/headers';
import { getTenantBySlug } from './base';

/**
 * Enforce tenant context in API routes.
 * Must be called at the top of every API route handler.
 * Throws if tenant headers are not present (middleware failure).
 */
export async function withTenant(): Promise<{ tenantId: string; tenantSlug: string }> {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id');
  const tenantSlug = headersList.get('x-tenant-slug');

  if (tenantId && tenantSlug) {
    return { tenantId, tenantSlug };
  }

  if (tenantSlug && !tenantId) {
    const tenant = await getTenantBySlug(tenantSlug);
    if (tenant) return { tenantId: tenant.id, tenantSlug: tenant.slug };
  }

  const localTenantSlug = process.env.LOCAL_TENANT_SLUG || 'soralia';
  const tenant = await getTenantBySlug(tenantSlug || localTenantSlug);
  if (!tenant) {
    throw new Error('Tenant not resolved');
  }

  return { tenantId: tenant.id, tenantSlug: tenant.slug };
}

/**
 * Optional tenant context - returns undefined if not present.
 * Use when tenant is optional for the operation.
 */
export async function withTenantOptional(): Promise<{ tenantId?: string; tenantSlug?: string }> {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') ?? undefined;
  const tenantSlug = headersList.get('x-tenant-slug') ?? undefined;

  if (tenantId && tenantSlug) return { tenantId, tenantSlug };

  if (tenantSlug && !tenantId) {
    const tenant = await getTenantBySlug(tenantSlug);
    if (tenant) return { tenantId: tenant.id, tenantSlug: tenant.slug };
  }

  return { tenantId, tenantSlug };
}
