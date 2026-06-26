# Phase 110: Page & Navigation Access Control — Context

**Gathered:** 2026-06-26
**Status:** Ready for planning
**Source:** BD soralia-village-b51v

<domain>
## Phase Boundary

Build a centralized page and navigation access control layer that answers a single question uniformly: **"Can this caller see this page/space?"** — whether the caller is a logged-in user, a linked provider, or (in future) an AI agent.

Currently access control is scattered across three inconsistent systems:

1. **Spaces** (`spaces.ts`) — hardcoded role checks (`normalizedRole === 'PROVIDER'`)
2. **API routes** — `requireProviderAccess()`, `canReviewProviders()`, `hasPermission()` each doing their own check
3. **Server components** — ad-hoc role/flag checks with no single pattern

This phase establishes the canonical access resolution pipeline that the future Agent Gateway (unplanned) will also consume.

Depends on: Phase 41 (Feature Gate Consolidation — `canAccess()`), Phase 46 (Provider Platform — provider records), Phase 30 (Focus Spaces).
</domain>

<decisions>
## Implementation Decisions

### Core Abstraction

- **D-01:** Single `GET /api/access` endpoint returning typed `PageAccess` object per caller: `{ spaces: SpaceId[], pages: string[], features: string[] }` — cached per-user, invalidated on role/provider/suspension change
- **D-02:** `usePageAccess()` hook — TanStack Query wrapper consuming `/api/access`, returns cached access map. Used by every nav render (SpaceLauncher, MobileSpaceBar) and every page-level guard
- **D-03:** Access resolution pipeline (server-side):
  1. **Role** — `isPlatformAdmin` / `role` from session (Phase 41 Layer 0)
  2. **Record existence** — does user have a linked provider? (replaces `normalizedRole === 'PROVIDER'`)
  3. **Suspension** — `isSuspended` blocks all non-core access (Phase 33)
  4. **Feature flags** — `disputes: boolean` etc. from `usePageFlags` (Phase 22)
  5. **Agent token** — future extension point: caller passes `X-Agent-Token`, access resolves per-agent scopes

### Provider Access (first consumer)

- **D-04:** Provider space visibility switches from `role === 'PROVIDER'` to `hasProviderRecord === true` — a role-only user without a linked record won't see Providers in their nav
- **D-05:** `usePageAccess()` replaces the scattered `hasPermission('providers')` checks in nav components

### Navigation Integration

- **D-06:** `SpaceLauncher` / `MobileSpaceBar` consume `usePageAccess().spaces` instead of their own `getVisibleSpaces()` with inline role checks
- **D-07:** `getVisibleSpaces()` in `spaces.ts` becomes a pure filter over the resolved access map — no auth logic, just filtering

### Agent Gateway (future)

- **D-08:** `/api/access` supports `?caller=agent&token=X` — resolves access per-agent scope, returns subset of pages the agent can navigate
- **D-09:** `PageAccess` type extended with `agent: { scope: string[], expiresAt: Date } | null` — null for human callers, populated for agents
- **D-10:** Agent access pipeline: token validation → scope resolution → space/page intersection — same pipeline, different auth source

### Agent's Discretion

- Cache strategy (ISR tag `access:{userId}` vs TanStack `staleTime`)
- Whether to include `pageFlags` in the access response or keep separate `usePageFlags()`
- Exact `PageAccess` type shape — which fields are nullable, which are always present
- Agent token format and validation endpoint (just reserve the extension point; actual agent auth is deferred)
  </decisions>

<canonical_refs>

## Canonical References

- `src/shared/api/provider-platform.ts` — `requireProviderAccess()` current pattern
- `src/widgets/dashboard/model/spaces.ts:195-219` — space visibility with inline role checks
- `src/widgets/dashboard/ui/SpaceLauncher.tsx` — nav rendering from space list
- `src/widgets/dashboard/ui/MobileSpaceBar.tsx` — mobile nav rendering
- `src/shared/lib/permissions.ts` — `hasPermission()` helper
- `src/features/auth/model/useGateContext.ts` — Phase 41 `canAccess()` context
- `.planning/phases/41-feature-gate-consolidation/` — existing gate infrastructure
  </canonical_refs>

<deferred>
## Deferred Ideas

- Full agent gateway implementation (token issuance, scope management, audit log)
- Generalizing beyond spaces/pages to widget-level access
- Access-based redirects (e.g., provider without record → redirect to registration)
- Rate limiting per access endpoint (separate from existing API rate limits)
  </deferred>

---

_Phase: 110-page-nav-access-control_
_Context gathered: 2026-06-26 from BD soralia-village-b51v_
