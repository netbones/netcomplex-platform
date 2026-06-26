'use client';

/**
 * usePageAccess — TanStack Query wrapper for GET /api/access
 *
 * Centralized client-side access resolution hook (D-02).
 * Every nav component uses this single cached access map instead
 * of inline role/flag/provider logic. The server (/api/access) is
 * the single source of truth per D-05/D-06.
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
  /** Agent delegation info — null for human callers */
  agent: { scope: string[]; expiresAt: string | null } | null;
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
 * - Query enabled only when session exists (T-110-06 mitigation)
 * - staleTime=0 ensures fresh data on every mount
 * - refetchOnWindowFocus=true covers role-switch scenarios
 * - Unauthenticated → returns empty arrays (graceful degradation)
 */
export function usePageAccess(): PageAccessResult {
  const { data: session } = useSession();

  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery<{
    spaces: SpaceId[];
    pages: string[];
    features: string[];
    agent: { scope: string[]; expiresAt: string | null } | null;
    resolvedAt: string;
  }>({
    queryKey: ['pageAccess', session?.user?.id ?? 'anonymous'],
    queryFn: async () => {
      const res = await fetch('/api/access');
      if (!res.ok) {
        throw new Error(`/api/access returned ${res.status}`);
      }
      const body = await res.json();
      // Handle both apiSuccess envelope and direct body shapes
      const payload = body?.data ?? body;
      return payload;
    },
    enabled: !!session?.user?.id,
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
 */
export function useVisibleSpaces(flags?: PlatformPageFlags | null): {
  spaces: SpaceDefinition[];
  isLoading: boolean;
  error: Error | null;
} {
  const { spaces: accessibleSpaceIds, isLoading, error } = usePageAccess();
  const spaces = useMemo(
    () => filterSpaces(accessibleSpaceIds, flags ?? ({} as PlatformPageFlags)),
    [accessibleSpaceIds, flags]
  );
  return { spaces, isLoading, error };
}
