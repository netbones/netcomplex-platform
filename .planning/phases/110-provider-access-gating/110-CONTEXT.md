# Phase 110: Provider Access Gating — Context

**Gathered:** 2026-06-26
**Status:** Ready for planning
**Source:** BD soralia-village-b51v

<domain>
## Phase Boundary

Centralize provider access gating into a single source of truth. Currently provider space nav visibility is scattered across role checks in `spaces.ts`, `ProvidersLayer.tsx`, and individual API routes. The "does this user have a linked provider record?" check needs to be fast (client-side per-render), cached, and consumed identically everywhere.

Depends on: Phase 46 (Provider Platform — provider records, `requireProviderAccess()`, serviceProviders table).
</domain>

<decisions>
## Implementation Decisions

### Architecture

- D-01: Create a lightweight `GET /api/providers/access` endpoint returning `{ hasRecord: boolean, isSuspended: boolean, accessMode: string }` — cached via `unstable_cache` with `providers:access:{userId}` tag
- D-02: Create `useProviderAccess()` hook in `@entities/provider` — wraps the access endpoint fetch with TanStack Query for caching, returns `{ hasRecord, isSuspended, accessMode, isLoading }`
- D-03: Replace hardcoded `normalizedRole === 'PROVIDER'` in `spaces.ts:204` with the hook result's `hasRecord`
- D-04: Consume the hook in all provider-gated UI: SpaceLauncher, MobileSpaceBar, ProvidersLayer, NAV_REGISTRY
- D-05: Align server-side `requireProviderAccess()` with the access endpoint so both use the same logic

### Agent's Discretion

- Cache duration (default: 5 minutes)
- Whether to use `unstable_cache` + revalidateTag or TanStack Query `staleTime`
- Exact hook return shape beyond `hasRecord`, `isSuspended`, `accessMode`
  </decisions>

<canonical_refs>

## Canonical References

- `src/shared/api/provider-platform.ts` — `requireProviderAccess()` server-side gate
- `src/widgets/dashboard/model/spaces.ts:195-219` — space visibility logic
- `src/widgets/dashboard/ui/ProvidersLayer.tsx` — provider layer with role gating
- `src/app/api/providers/verification/route.ts` — existing provider access pattern
  </canonical_refs>

<deferred>
## Deferred Ideas

- Role-driven access vs record-driven access migration for other spaces
- Generalizing to a `useSpaceAccess()` hook that covers all spaces
  </deferred>

---

_Phase: 110-provider-access-gating_
_Context gathered: 2026-06-26 from BD soralia-village-b51v_
