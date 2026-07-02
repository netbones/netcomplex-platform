import 'server-only';

import { headers } from 'next/headers';
import { getTenantBySlug, getTenantByDomain } from './base';

/**
 * Enforce tenant context in API routes.
 * Must be called at the top of every API route handler.
 *
 * Resolution order:
 * 1. x-tenant-id + x-tenant-slug headers (middleware sets both)
 * 2. x-tenant-slug → getTenantBySlug (subdomain-based tenants)
 * 3. host header → getTenantByDomain (bare custom domains)
 * 4. LOCAL_TENANT_SLUG env fallback (development)
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
  if (tenant) return { tenantId: tenant.id, tenantSlug: tenant.slug };

  // Fallback: resolve by custom domain (e.g. solaris.co.za → solaris-heights).
  // New tenants only need their customDomain set in the DB — no code changes required.
  const host = headersList.get('host') || '';
  if (host) {
    const hostWithoutPort = host.split(':')[0] || '';
    const domainTenant = await getTenantByDomain(hostWithoutPort);
    if (domainTenant) return { tenantId: domainTenant.id, tenantSlug: domainTenant.slug };
  }

  throw new Error('Tenant not resolved');
}

/**
 * Optional tenant context - returns undefined if not present.
 * Use when tenant is optional for the operation.
 *
 * Resolution order matches withTenant() but never throws.
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

  // Fallback: resolve by custom domain
  const host = headersList.get('host') || '';
  if (host) {
    const hostWithoutPort = host.split(':')[0] || '';
    const domainTenant = await getTenantByDomain(hostWithoutPort);
    if (domainTenant) return { tenantId: domainTenant.id, tenantSlug: domainTenant.slug };
  }

  return { tenantId, tenantSlug };
}
