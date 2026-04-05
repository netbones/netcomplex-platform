import { headers } from 'next/headers';

/**
 * Enforce tenant context in API routes.
 * Must be called at the top of every API route handler.
 * Throws if tenant headers are not present (middleware failure).
 */
export async function withTenant(): Promise<{ tenantId: string; tenantSlug: string }> {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id');
  const tenantSlug = headersList.get('x-tenant-slug');

  if (!tenantId || !tenantSlug) {
    throw new Error('Tenant not resolved — middleware must run first');
  }

  return { tenantId, tenantSlug };
}

/**
 * Optional tenant context - returns undefined if not present.
 * Use when tenant is optional for the operation.
 */
export async function withTenantOptional(): Promise<{ tenantId?: string; tenantSlug?: string }> {
  const headersList = await headers();
  return {
    tenantId: headersList.get('x-tenant-id') ?? undefined,
    tenantSlug: headersList.get('x-tenant-slug') ?? undefined,
  };
}
