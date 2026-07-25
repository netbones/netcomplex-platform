/**
 * Access Resolution — 5-Layer Server-Side Pipeline
 *
 * Implements the canonical access resolution per D-03. Layers 0-3 are synchronous;
 * Layer 4 (agent token) is async — it validates the token, checks delegation status,
 * and intersects with tenant feature flags.
 *
 * Layer precedence:
 *   Layer 0 — Role (synchronous, in-memory ROLE_PERMISSIONS)
 *   Layer 1 — Record existence (providerRecordExists gates providers space)
 *   Layer 2 — Suspension (isSuspended overrides to messages-only)
 *   Layer 3 — Feature flags (flags-based visibility for optional spaces)
 *   Layer 4 — Agent token (validates JWT → checks delegation → intersects flags)
 *
 * Phase 110-01: Entity layer for page navigation access control.
 * Phase 111-03: Real agent scope resolution via resolveAgentScope().
 */

import type { AccessContext, AccessInput, AccessResolution } from './types';
import type { SpaceId } from '@widgets/dashboard';
import { ADMIN_ROLES } from '@widgets/dashboard';
import { ROLE_PERMISSIONS } from '@shared/lib';
import { validateToken } from '@shared/lib/agent-token';
import type { PlatformPageFlags } from '@shared/lib';
import { eq, and } from 'drizzle-orm';
import { agentAccesses } from '@schema/agent-accesses';
import { users } from '@schema/users';
import { platformSuspensions } from '@schema/platform-suspensions';
import { db } from '@api/server';
import type { EffectiveScope, AgentScopeConfig } from '@entities/agent';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Core spaces that are always visible for all non-suspended authenticated users. */
const CORE_SPACES: SpaceId[] = ['home', 'messages'];

/**
 * Community feature flags. Community space auto-hides when ALL of these are false
 * (Q2 hybrid module gating decision from Phase 30).
 */
const COMMUNITY_FLAGS: (keyof PlatformPageFlags)[] = [
  'events',
  'groups',
  'surveys',
  'competitions',
  'news',
];

/** Boolean flags on PlatformPageFlags that map to page route slugs. */
const PAGE_FLAG_KEYS: (keyof PlatformPageFlags)[] = [
  'news',
  'events',
  'directory',
  'groups',
  'services',
  'resources',
  'maintenance',
  'surveys',
  'competitions',
  'dashboard',
  'disputes',
  'dWallet',
  'providers',
  'bookings',
  'messages',
  'campaign',
  'chat',
];

// ═══════════════════════════════════════════════════════════════
// PIPELINE
// ═══════════════════════════════════════════════════════════════

/**
 * Resolve page access for a given context and input.
 *
 * Layers 0-3 are synchronous. Layer 4 (agent token resolution) is async —
 * it validates the token against the DB, checks delegation status, and
 * intersects with tenant feature flags.
 *
 * @param ctx - Pre-resolved access context from session + DB lookups
 * @param input - Caller identity (user or agent with optional token)
 * @returns Structured AccessResolution with spaces, pages, features, and agent info
 */
export async function resolvePageAccess(
  ctx: AccessContext,
  input: AccessInput = {}
): Promise<AccessResolution> {
  const role = ctx.role;
  const normalizedRole = role?.toUpperCase() ?? 'RESIDENT';
  const isAdminRole = ADMIN_ROLES.includes(normalizedRole);

  // ──── Layer 2: Suspension (evaluated first — overrides everything) ────

  if (ctx.isSuspended) {
    return {
      spaces: ['messages'],
      pages: [],
      features: [],
      agent: await resolveAgent(input, ctx.tenantId, ctx.flags),
      resolvedAt: new Date().toISOString(),
    };
  }

  // ──── Layer 0: Role — determine base spaces ────

  // PROVIDER role gets limited core: messages only (no home, no optional spaces).
  const isProvider = normalizedRole === 'PROVIDER';

  const spaces = new Set<SpaceId>();

  if (isProvider) {
    // Providers get messages (core) + potentially providers space (Layer 1)
    spaces.add('messages');
  } else {
    // All other roles get full core spaces
    for (const s of CORE_SPACES) {
      spaces.add(s);
    }

    // ──── Layer 3: Feature flags — optional spaces (only for non-PROVIDER) ────

    // Services space: hidden when flags.services is false
    if (ctx.flags.services !== false) {
      spaces.add('services');
    }

    // Community space: auto-hides when ALL community flags are off (Q2 hybrid)
    const anyCommunityOn = COMMUNITY_FLAGS.some(flag => {
      const value = ctx.flags[flag];
      return value !== false;
    });
    if (anyCommunityOn) {
      spaces.add('community');
    }
  }

  // Admin space for admin/board roles
  if (isAdminRole) {
    spaces.add('admin');
  }

  // ──── Layer 1: Record existence — providers space gated by DB record ────

  // Providers space only when providerRecordExists is true (D-04).
  // This is NOT role-gated: a RESIDENT with a provider record gets providers space.
  if (ctx.providerRecordExists) {
    spaces.add('providers');
  }

  // Pages: map enabled boolean flags to page keys (camelCase matches route slugs)
  const pages: string[] = [];
  for (const key of PAGE_FLAG_KEYS) {
    const value = ctx.flags[key];
    // Include if boolean true, or truthy for non-boolean flags
    if (value === true || (typeof value === 'string' && value !== '')) {
      pages.push(key);
    }
  }

  // Features: combine role permissions + enabled flags
  const features = new Set<string>();

  // Role-based permissions: add each enabled Permission key as a feature
  const rolePermissions = ROLE_PERMISSIONS[role];
  if (rolePermissions) {
    for (const [permKey, enabled] of Object.entries(rolePermissions)) {
      if (enabled) {
        features.add(permKey);
      }
    }
  }

  // Flag-based features: add each enabled page key as a feature
  for (const pageKey of pages) {
    features.add(pageKey);
  }

  // ──── Layer 4: Agent token ────

  const agent = await resolveAgent(input, ctx.tenantId, ctx.flags);

  // ──── Assemble result ────

  return {
    spaces: [...spaces],
    pages,
    features: [...features],
    agent,
    resolvedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Layer 4 — Agent token resolution.
 *
 * When caller is 'agent' and a token is present, resolves the effective agent scope
 * via resolveAgentScope(). Otherwise returns null.
 *
 * @param input — AccessInput with caller/token
 * @param tenantId — current tenant for token validation
 * @param flags — feature flags for scope intersection
 */
async function resolveAgent(
  input: AccessInput,
  tenantId: string,
  flags: PlatformPageFlags
): Promise<{
  scope: string[];
  expiresAt: string | null;
  tokenId?: string;
  delegationId?: string | null;
} | null> {
  if (input.caller === 'agent' && input.token) {
    const effective = await resolveAgentScope(input.token, tenantId, flags);
    if (!effective) {
      // Token invalid — return null (no access)
      return null;
    }
    return {
      scope: [...effective.scope.spaces, ...effective.scope.pages, ...effective.scope.apis],
      expiresAt: effective.expiresAt,
      tokenId: effective.tokenId,
      delegationId: effective.delegationId,
    };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// LAYER 4 — AGENT SCOPE RESOLUTION
// ═══════════════════════════════════════════════════════════════

/**
 * Resolve the effective scope for an agent token.
 *
 * Pipeline:
 * 1. Parse and validate the token JWT
 * 2. For delegated tokens: look up the AgentAccess grant and verify it's still ACTIVE
 * 3. Intersect agent scope with tenant feature flags
 * 4. Return EffectiveScope — or null if any step fails
 *
 * Called by resolveAgent() for Phase 110's /api/access?caller=agent.
 */
export async function resolveAgentScope(
  rawToken: string,
  tenantId: string,
  flags: PlatformPageFlags
): Promise<EffectiveScope | null> {
  // Step 1: Validate token
  const validation = await validateToken(rawToken);
  if (!validation.valid || !validation.payload) {
    return null;
  }

  const payload = validation.payload;

  // Step 1b: Verify tenant match
  if (payload.tenantId !== tenantId) {
    return null;
  }

  // Step 2: For delegated tokens, verify the delegation grant is still ACTIVE
  let effectiveScope: AgentScopeConfig = payload.scope;

  if (payload.delegationId) {
    const [delegation] = await db
      .select()
      .from(agentAccesses)
      .where(eq(agentAccesses.id, payload.delegationId))
      .limit(1);

    if (!delegation || delegation.status !== 'ACTIVE') {
      return null;
    }

    // D-17: If the granting owner is suspended, delegation is paused
    const [owner] = await db
      .select()
      .from(users)
      .where(eq(users.id, delegation.grantedById))
      .limit(1);

    if (!owner) {
      return null;
    }

    const [activeSuspension] = await db
      .select()
      .from(platformSuspensions)
      .where(
        and(
          eq(platformSuspensions.userId, delegation.grantedById),
          eq(platformSuspensions.isActive, true)
        )
      )
      .limit(1);

    if (activeSuspension) {
      return null;
    }

    // Use the current delegation permissions as source of truth (they may have been modified)
    effectiveScope = delegationScopeToAgentScope(delegation.permissions, delegation.expiresAt);
  }

  // Step 3: Intersect with tenant feature flags
  effectiveScope = intersectScopeWithFlags(effectiveScope, flags);

  // Step 4: Return EffectiveScope in the shape AccessResolution.agent expects
  return {
    scope: effectiveScope,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    tokenId: payload.jti,
    delegationId: payload.delegationId ?? null,
  };
}

/**
 * Convert AgentPermission[] to AgentScopeConfig.
 * Maps delegation permissions to the structured scope format.
 */
function delegationScopeToAgentScope(permissions: string[], expiresAt: Date): AgentScopeConfig {
  const scope: AgentScopeConfig = {
    spaces: ['services'],
    pages: permissions.map(p => p.toLowerCase()),
    apis: [],
    dataDomains: permissions.map(p => p.toLowerCase()),
    actions: ['read'],
    maxDuration: Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000),
  };

  // Add write actions for write-capable permissions
  const writePerms = ['MANAGE_OCCUPANCY', 'CONTACT_OCCUPANTS', 'MARKET_PROPERTY'];
  if (permissions.some(p => writePerms.includes(p))) {
    scope.actions.push('write');
  }

  // Map permissions to API scope patterns
  const apiMap: Record<string, string[]> = {
    VIEW_LISTING: ['properties:read'],
    MANAGE_OCCUPANCY: ['properties:write', 'maintenance:write'],
    VIEW_FINANCIALS: ['finances:read'],
    CONTACT_OCCUPANTS: ['messages:write'],
    MARKET_PROPERTY: ['marketplace:write'],
  };
  const apis = new Set<string>();
  for (const p of permissions) {
    (apiMap[p] ?? []).forEach(a => apis.add(a));
  }
  scope.apis = [...apis];

  return scope;
}

/**
 * Intersect agent scope with tenant feature flags.
 * If a space/page/feature is disabled at the tenant level, it's stripped from the agent scope.
 */
function intersectScopeWithFlags(
  scope: AgentScopeConfig,
  flags: PlatformPageFlags
): AgentScopeConfig {
  // Filter spaces: only keep spaces that have their flag enabled (or have no flag dependency)
  const filteredSpaces = scope.spaces.filter(spaceId => {
    const flagKey = spaceId as keyof PlatformPageFlags;
    const flag = flags[flagKey];
    // If no flag key exists for this space, allow it (no gating)
    if (flag === undefined) return true;
    return flag !== false;
  });

  // Filter pages: only keep pages whose corresponding flag is enabled
  const filteredPages = scope.pages.filter(pageKey => {
    const flagKey = pageKey as keyof PlatformPageFlags;
    const flag = flags[flagKey];
    if (flag === undefined) return true;
    return flag !== false;
  });

  return {
    ...scope,
    spaces: filteredSpaces,
    pages: filteredPages,
  };
}
