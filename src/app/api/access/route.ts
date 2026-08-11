/**
 * GET /api/access — Canonical access resolution endpoint (D-01).
 *
 * Returns typed PageAccess (spaces, pages, features, agent) for the
 * authenticated caller. This is the single source of truth for every
 * nav component and page guard — replaces scattered role/flag/permission
 * checks across the codebase.
 *
 * Supports human callers (default, via Better Auth session) and agent
 * callers (query param caller=agent&token=X — validated via
 * resolveAgentScope(): JWT verify + DB lookup + delegation check +
 * owner suspension check per D-17).
 *
 * Unauthenticated callers receive empty access (no error).
 *
 * Phase 110-01: Entity layer + endpoint for page navigation access control.
 * Phase 111-03: Agent token now fully validated (no longer a stub).
 */

import { type NextRequest } from 'next/server';
import { withTenant, getPlatformPageFlags } from '@entities/tenant/server';
import { getProviderRecordForUser } from '@/shared/api/provider-platform';
import { createComponentLogger } from '@shared/lib';

import {
  apiError,
  apiSuccess,
  getSessionAndRole,
  db,
  serviceProviders,
  notDeleted,
} from '@api/server';
import { eq, and } from 'drizzle-orm';

import { resolvePageAccess } from '@entities/access';
import type { AccessContext, AccessInput } from '@entities/access';
import type { Role } from '@shared/lib';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const log = createComponentLogger('access');
export const dynamic = 'force-dynamic';
export const maxDuration = 5; // Cap execution time (D-05 mitigation)

// ═══════════════════════════════════════════════════════════════
// REVALIDATION TRIGGERS (to be wired in follow-up phases)
// ═══════════════════════════════════════════════════════════════
// - Role change via PATCH /api/users/[id] → revalidateTag(`access:${userId}`)
// - Provider record create/delete → revalidateTag(`access:${userId}`)
// - Suspension toggle via POST /api/users/[id]/suspend → revalidateTag(`access:${userId}`)
// - Feature flag change via Vercel flags webhook or polling → revalidateTag(`access:${userId}`)

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Parse caller identity from query parameters.
 *
 * Extracts `caller` and `token` from the request URL.
 * When caller === 'agent' and a non-empty token is present,
 * returns an agent-flavoured AccessInput. The token is validated
 * downstream by resolveAgentScope():
 * - JWT signature verified (ES256, asymmetric keypair)
 * - Token lookup in AgentToken table (existence, revocation)
 * - Delegation grant checked (AgentAccess.status === ACTIVE)
 * - Owner suspension checked (D-17: suspended owners pause delegations)
 * Invalid/expired/revoked tokens → agent: null (no access granted).
 */
function parseCaller(request: NextRequest): AccessInput {
  const searchParams = request.nextUrl.searchParams;
  const caller = searchParams.get('caller');
  const token = searchParams.get('token');

  if (caller === 'agent' && token && token.trim().length > 0) {
    return { caller: 'agent', token: token.trim() };
  }

  return {};
}

/**
 * Resolve provider record existence for the authenticated user.
 *
 * Checks the serviceProviders table for a record matching the user within the
 * current tenant. Matches by userId first (in-house providers), then by email
 * (self-registered providers). Returns a boolean indicating existence.
 */
async function resolveProviderExists(
  tenantId: string,
  userId: string | null | undefined,
  userEmail: string | null | undefined
): Promise<boolean> {
  const emailRecord = await getProviderRecordForUser(tenantId, userEmail);
  if (emailRecord) return true;

  if (!userId) return false;

  const [userIdRecord] = await db
    .select({ id: serviceProviders.id })
    .from(serviceProviders)
    .where(
      and(
        eq(serviceProviders.tenantId, tenantId),
        eq(serviceProviders.userId, userId),
        notDeleted(serviceProviders)
      )
    )
    .limit(1);

  return userIdRecord !== undefined;
}

// ═══════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    // Resolve authenticated user FIRST so the session is looked up exactly
    // once per request. ADVISORY-037 / pool-exhaustion fix: /api/access is
    // called by every nav component + page guard; prior code ran
    // auth.api.getSession() up to 3x (withTenant's cross-check,
    // getSessionAndRole, requireNotSuspended), each hitting the DB and
    // saturating the connection pool under concurrent page loads.
    // React.cache() does not dedupe in route handlers, so the resolved
    // session is threaded through withTenant() instead.
    const auth = await getSessionAndRole(request);

    // Resolve tenant context (reuses the already-resolved session for the
    // tenant cross-check — no second getSession()).
    let tenantId: string;
    try {
      const tenant = await withTenant(auth?.session ?? null);
      tenantId = tenant.tenantId;
    } catch {
      return apiError('NOT_FOUND', 'Tenant not found', 404);
    }

    // Unauthenticated callers receive empty access (no error — D-01)
    if (!auth) {
      return apiSuccess(
        { spaces: [], pages: [], features: [], agent: null },
        {
          headers: {
            'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
          },
        }
      );
    }

    // Suspension is already resolved inside getSessionAndRole — no separate
    // requireNotSuspended() call (would re-run getSession + a duplicate query).
    const isSuspended = auth.suspension !== null;

    // Resolve provider record
    const providerRecordExists = await resolveProviderExists(
      tenantId,
      auth.userId,
      auth.session.user.email
    );

    // Build access context
    const flags = await getPlatformPageFlags(tenantId);

    const ctx: AccessContext = {
      tenantId,
      userId: auth.userId,
      userEmail: auth.session.user.email ?? null,
      role: auth.role as Role,
      providerRecordExists,
      isSuspended,
      flags,
    };

    // Parse caller identity (agent vs human)
    const input = parseCaller(request);

    // Resolve access
    const accessResolution = await resolvePageAccess(ctx, input);

    // Return with cache headers (per-user, short TTL)
    return apiSuccess(accessResolution, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    log.error({ operation: 'GET' }, 'Failed to resolve access', error);
    return apiError('INTERNAL_ERROR', 'Failed to resolve access', 500);
  }
}
