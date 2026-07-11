import 'server-only';

import { NextResponse } from 'next/server';
import { getRLSContext } from './rls-context';
import { apiUnauthorized } from './api-response';
import { apiTenantForbidden } from './api-response';
import type { RLSContext } from './db';

/**
 * Require a valid session AND tenant context for an API route.
 *
 * Call at the top of any tenant-scoped route handler. On success, returns the
 * narrowed `tenantId: string` so downstream code never sees `null`.
 *
 * Usage:
 * ```ts
 * const result = await requireTenantRLS(request);
 * if (!result.ok) return result.response;
 * const { ctx, tenantId } = result;
 * // tenantId is string — no guard needed
 * ```
 */
export async function requireTenantRLS(
  request: Request
): Promise<
  { ok: true; ctx: RLSContext; tenantId: string } | { ok: false; response: NextResponse }
> {
  const ctx = await getRLSContext(request);
  if (!ctx) return { ok: false, response: apiUnauthorized() };
  if (ctx.tenantId === null) return { ok: false, response: apiTenantForbidden() };
  return { ok: true, ctx, tenantId: ctx.tenantId };
}
