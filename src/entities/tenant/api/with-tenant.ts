import 'server-only';

import { auth } from '@api/server';
import { headers } from 'next/headers';
import { resolveTenantFromRequestHeaders } from './base';

/** Thrown when resolved tenant disagrees with the authenticated user's tenant. */
export class TenantMismatchError extends Error {
  readonly code = 'TENANT_MISMATCH' as const;

  constructor() {
    super('TENANT_MISMATCH');
    this.name = 'TenantMismatchError';
  }
}

/**
 * Minimal session shape consumed by the tenant-match cross-check.
 * - undefined  → caller has NOT resolved a session: resolve it here (legacy callers)
 * - null       → caller resolved and found NO session (already-resolved request path)
 * - object     → reuse the caller's resolved session (no second lookup)
 */
export type TenantSessionLike = {
  user?: {
    id?: string;
    tenantId?: string | null;
    isPlatformAdmin?: boolean;
  };
} | null;

async function assertSessionTenantMatch(
  resolvedTenantId: string,
  headersList: Headers,
  session?: TenantSessionLike
): Promise<void> {
  const resolvedSession =
    session === undefined ? await auth.api.getSession({ headers: headersList }) : session;
  if (!resolvedSession?.user?.id) return;

  const user = resolvedSession.user as { tenantId?: string | null; isPlatformAdmin?: boolean };
  if (!user.tenantId || user.isPlatformAdmin) return;
  if (user.tenantId !== resolvedTenantId) throw new TenantMismatchError();
}

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
 *
 * When a session exists, cross-checks resolved tenantId against the user's
 * tenantId unless the user is a platform admin (ADVISORY-032 Phase 3).
 */
export async function withTenant(
  session?: TenantSessionLike
): Promise<{ tenantId: string; tenantSlug: string }> {
  const headersList = await headers();
  const tenant = await resolveTenantFromRequestHeaders(headersList);
  if (!tenant) throw new Error('Tenant not resolved');

  await assertSessionTenantMatch(tenant.id, headersList, session);

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
