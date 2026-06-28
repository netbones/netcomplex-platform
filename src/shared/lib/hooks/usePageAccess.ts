'use client';

/**
 * usePageAccess — TanStack Query wrapper for GET /api/access
 *
 * Centralized client-side access resolution hook (D-02).
 * Every nav component uses this single cached access map instead
 * of inline role/flag/provider logic. The server (/api/access) is
 * the single source of truth per D-05/D-06.
 *
 * Phase 111-03: Extended with optional agentToken parameter for agent callers.
 * When agentToken is provided, the hook adds ?caller=agent&token=X to the request.
 *
 * Also exports useVisibleSpaces() for consumers that need
 * SpaceDefinition[] directly — combines usePageAccess + filterSpaces.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@api/client';
import type { SpaceId, SpaceDefinition } from '@widgets/dashboard';
import type { PlatformPageFlags } from '@shared/lib';
import { filterSpaces } from '@widgets/dashboard';

// ── Types ────────────────────────────────────────────────────────

/** Return type of usePageAccess(), matching the /api/access response shape */
export interface PageAccessResult {
  /** Allowed space IDs from the server */
  spaces: SpaceId[];
  /** Enabled page keys (camelCase) */
  pages: string[];
  /** Enabled module/feature keys */
  features: string[];
  /**
   * Agent access if resolved from a valid agent token.
   * - `scope`: Combined space/page/API keys the agent can access
   * - `expiresAt`: Token expiration (ISO 8601), null for non-expiring
   * - `tokenId`: AgentToken.id for audit trail
   * - `delegationId`: AgentAccess.id if token was issued from a delegation
   */
  agent: {
    scope: string[];
    expiresAt: string | null;
    tokenId?: string;
    delegationId?: string | null;
  } | null;
  /** Whether the query is currently loading */
  isLoading: boolean;
  /** Query error if fetch failed */
  error: Error | null;
  /** Manually refetch from /api/access */
  refetch: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────

/**
 * Fetch per-user page access from /api/access via TanStack Query.
 *
 * - Query enabled when session exists OR agentToken is provided
 * - staleTime=0 ensures fresh data on every mount
 * - refetchOnWindowFocus=true covers role-switch scenarios
 * - Unauthenticated → returns empty arrays (graceful degradation)
 *
 * Phase 111-03: When agentToken is provided, adds ?caller=agent&token=X
 * to the request URL. The server validates the token and returns resolved
 * agent scopes.
 *
 * @param agentToken - Optional agent bearer token for agent callers
 */
export function usePageAccess(agentToken?: string): PageAccessResult {
  const { data: session } = useSession();
  const hasSession = !!session?.user?.id;

  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery<{
    spaces: SpaceId[];
    pages: string[];
    features: string[];
    agent: {
      scope: string[];
      expiresAt: string | null;
      tokenId?: string;
      delegationId?: string | null;
    } | null;
    resolvedAt: string;
  }>({
    queryKey: ['pageAccess', session?.user?.id ?? 'anonymous', agentToken ?? ''],
    queryFn: async () => {
      const url = new URL('/api/access', window.location.origin);
      if (agentToken) {
        url.searchParams.set('caller', 'agent');
        url.searchParams.set('token', agentToken);
      }
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`/api/access returned ${res.status}`);
      }
      const body = await res.json();
      // Handle both apiSuccess envelope and direct body shapes
      const payload = body?.data ?? body;
      return payload;
    },
    enabled: hasSession || !!agentToken,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // Extract with graceful degradation
  const spaces: SpaceId[] = data?.spaces ?? [];
  const pages: string[] = data?.pages ?? [];
  const features: string[] = data?.features ?? [];
  const agent = data?.agent ?? null;
  const error: Error | null = queryError instanceof Error ? queryError : null;

  return { spaces, pages, features, agent, isLoading, error, refetch };
}

// ── useVisibleSpaces — convenience wrapper ───────────────────────

/**
 * Combine usePageAccess + filterSpaces into a single call.
 *
 * Consumers (SpaceChrome, MobileSpaceBar) call this instead of
 * usePageAccess + useMemo(filterSpaces(...)) to reduce boilerplate.
 *
 * @param flags - PlatformPageFlags for optional space sub-filtering
 * @param agentToken - Optional agent bearer token for agent callers
 */
export function useVisibleSpaces(
  flags?: PlatformPageFlags | null,
  agentToken?: string
): {
  spaces: SpaceDefinition[];
  isLoading: boolean;
  error: Error | null;
} {
  const { spaces: accessibleSpaceIds, isLoading, error } = usePageAccess(agentToken);
  const spaces = useMemo(
    () => filterSpaces(accessibleSpaceIds, flags ?? ({} as PlatformPageFlags)),
    [accessibleSpaceIds, flags]
  );
  return { spaces, isLoading, error };
}
