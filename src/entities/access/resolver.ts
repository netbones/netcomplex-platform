/**
 * Access Resolution — 5-Layer Server-Side Pipeline
 *
 * Implements the canonical access resolution per D-03. This is a pure
 * synchronous function — all context is pre-resolved by the route handler
 * before invocation. The pipeline determines what spaces, pages, and
 * features a caller can access.
 *
 * Layer precedence:
 *   Layer 0 — Role (synchronous, in-memory ROLE_PERMISSIONS)
 *   Layer 1 — Record existence (providerRecordExists gates providers space)
 *   Layer 2 — Suspension (isSuspended overrides to messages-only)
 *   Layer 3 — Feature flags (flags-based visibility for optional spaces)
 *   Layer 4 — Agent token (extension point, returns null for human callers)
 *
 * Phase 110-01: Entity layer for page navigation access control.
 */

import type { AccessContext, AccessInput, AccessResolution } from './types';
import type { SpaceId } from '@widgets/dashboard';
import { ADMIN_ROLES } from '@widgets/dashboard';
import { ROLE_PERMISSIONS } from '@shared/lib';
import type { PlatformPageFlags } from '@shared/lib';

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
 * Pure synchronous function — all DB lookups and session resolution
 * happen in the route handler before this is called.
 *
 * @param ctx - Pre-resolved access context from session + DB lookups
 * @param input - Caller identity (user or agent with optional token)
 * @returns Structured AccessResolution with spaces, pages, features, and agent info
 */
export function resolvePageAccess(ctx: AccessContext, input: AccessInput = {}): AccessResolution {
  const role = ctx.role;
  const normalizedRole = role?.toUpperCase() ?? 'RESIDENT';
  const isAdminRole = ADMIN_ROLES.includes(normalizedRole);

  // ──── Layer 2: Suspension (evaluated first — overrides everything) ────

  if (ctx.isSuspended) {
    return {
      spaces: ['messages'],
      pages: [],
      features: [],
      agent: resolveAgent(input),
      resolvedAt: new Date().toISOString(),
    };
  }

  // ──── Layer 0: Role — determine base spaces ────

  // PROVIDER role gets limited core: messages only (no home, no optional spaces).
  // This mirrors the existing getVisibleSpaces() pattern in spaces.ts.
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

  const agent = resolveAgent(input);

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
 * When caller is 'agent' and a token is present, returns the agent stub
 * contract (future extension point per D-08/D-10). Otherwise returns null.
 */
function resolveAgent(input: AccessInput): { scope: string[]; expiresAt: string | null } | null {
  if (input.caller === 'agent' && input.token) {
    // Stub — full agent gateway deferred per D-09.
    return { scope: [], expiresAt: null };
  }
  return null;
}
