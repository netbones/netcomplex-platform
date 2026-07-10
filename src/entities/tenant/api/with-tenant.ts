import 'server-only';

import { headers } from 'next/headers';
import { resolveTenantFromRequestHeaders } from './base';

/**
 * Enforce tenant context in API routes.
 * Must be called at the top of every API route handler.
 *
 * Resolution order matches getCurrentTenant() / resolveTenantFromRequestHeaders():
 * 1. x-tenant-id header (when present)
 * 2. host → getTenantByDomain (custom domains)
 * 3. x-tenant-slug → getTenantBySlug (middleware-forwarded subdomain slug)
 * 4. *.netbones.co.za subdomain + SUBDOMAIN_ALIASES
 * 5. LOCAL_TENANT_SLUG env fallback (development)
 */
export async function withTenant(): Promise<{ tenantId: string; tenantSlug: string }> {
  const headersList = await headers();
  const tenant = await resolveTenantFromRequestHeaders(headersList);
  if (!tenant) throw new Error('Tenant not resolved');
  return { tenantId: tenant.id, tenantSlug: tenant.slug };
}

/**
 * Optional tenant context - returns empty object if not present.
 * Use when tenant is optional for the operation.
 *
 * Resolution order matches withTenant() but never throws.
 */
export async function withTenantOptional(): Promise<{ tenantId?: string; tenantSlug?: string }> {
  const headersList = await headers();
  const tenant = await resolveTenantFromRequestHeaders(headersList);
  if (tenant) return { tenantId: tenant.id, tenantSlug: tenant.slug };
  return {};
}
