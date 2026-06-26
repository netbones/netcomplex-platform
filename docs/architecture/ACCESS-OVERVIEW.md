# Access Control Architecture — Overview

**Phase:** 110 (Page & Navigation Access Control)
**Canonical endpoint:** `GET /api/access`
**Authoritative for:** All page navigation, space visibility, and feature access decisions
**Last updated:** 2026-06-26

---

## 1. Contract: `PageAccess`

The server returns the following shape from `GET /api/access`:

```typescript
interface PageAccess {
  /** Space IDs the caller is authorized to see */
  spaces: SpaceId[];
  /** Page keys the caller can navigate to */
  pages: string[];
  /** Feature keys the caller has enabled */
  features: string[];
  /** Agent delegation info — null for human callers */
  agent: { scope: string[]; expiresAt: string | null } | null;
  /** Server timestamp of resolution */
  resolvedAt: string;
}
```

**Type location:** `src/entities/access/types.ts`
**HTTP contract:** `apiSuccess(access)` envelope from Plan 35-A01
**Cache-Control:** `private, max-age=0, must-revalidate` (per-user, no shared cache)

---

## 2. 5-Layer Resolution Pipeline

The server-side `resolvePageAccess()` function executes layers in precedence order:

| Layer | Name                 | Source                                  | What it gates                     |
| ----- | -------------------- | --------------------------------------- | --------------------------------- |
| 1     | **Role**             | `session.user.role` + `isPlatformAdmin` | ADMIN space, core spaces          |
| 2     | **Record Existence** | `getProviderRecordForUser()`            | Providers space (D-04)            |
| 3     | **Suspension**       | `requireNotSuspended()`                 | Reduces access to messages-only   |
| 4     | **Feature Flags**    | `getPlatformPageFlags()`                | services, community sub-filtering |
| 5     | **Agent Token**      | `?caller=agent&token=X` (stub)          | Future: per-agent scope gates     |

**Key principle:** Provider space visibility is gated by `hasProviderRecord === true` (DB-backed), not by `role === 'PROVIDER'` string comparison. A user with a `PROVIDER` role but no linked provider record will NOT see the Providers space (D-04).

**Location:** `src/entities/access/resolver.ts`

---

## 3. Client-Side Consumption

### 3.1 `usePageAccess()` — Canonical access hook

Location: `src/shared/lib/hooks/usePageAccess.ts`

```typescript
const { spaces, pages, features, agent, isLoading, error, refetch } = usePageAccess();
```

- **Query key:** `['pageAccess', userId]` — per-user cache isolation
- **Enabled gate:** Query only fires when `session?.user?.id` exists (T-110-06 mitigation)
- **staleTime:** `0` — always refetch on mount
- **Retry:** `1` — single retry on failure
- **Unauthenticated:** Returns empty arrays (`{ spaces: [], pages: [], features: [], agent: null }`)
- **Error propagation:** Query error returned as `error: Error | null`; arrays default to `[]`

### 3.2 `useVisibleSpaces()` — Nav-oriented convenience wrapper

```typescript
const { spaces: visibleSpaces, isLoading } = useVisibleSpaces(ctx?.flags);
```

Combines `usePageAccess()` + `filterSpaces()` into a single call. This is what navigation components consume.

### 3.3 `filterSpaces()` — Pure client-side filter

Location: `src/widgets/dashboard/model/spaces.ts`

```typescript
function filterSpaces(accessibleSpaceIds: SpaceId[], flags: PlatformPageFlags): SpaceDefinition[];
```

Pure function — no auth, no role, no network. Takes the server-resolved `SpaceId[]` ceiling and sub-filters by client-side feature flags:

- Spaces with `requiredFlag` respect the flag (e.g., `services` requires `flags.services !== false`)
- Community space auto-hides when all sub-flags (events, groups, surveys, competitions, news) are `false`
- Core spaces (home, messages, admin) pass through unconditionally

**Security invariant:** `filterSpaces` only narrows the set, never expands. The server-resolved `accessibleSpaceIds` are the ceiling.

---

## 4. Navigation Components

All navigation components consume `useVisibleSpaces()` — **zero inline auth logic**:

| Component            | Auth Check Before Phase 110                             | Auth Check After Phase 110     |
| -------------------- | ------------------------------------------------------- | ------------------------------ |
| `SpaceChrome.tsx`    | `getVisibleSpaces(role, flags)` + session role          | `useVisibleSpaces(ctx?.flags)` |
| `MobileSpaceBar.tsx` | `getVisibleSpaces(role, flags)` + `session?.user?.role` | `useVisibleSpaces(ctx?.flags)` |
| `SpaceLauncher.tsx`  | Presentational (receives `SpaceDefinition[]` as prop)   | Unchanged                      |

**`getVisibleSpaces()`** is preserved as a deprecated shim in `spaces.ts` for backward compatibility. It fires `console.warn` in development mode. It will be removed in Phase 2 migration.

---

## 5. Agent Gateway Extension Points

The `/api/access` endpoint accepts `?caller=agent&token=X` as a future extension point (D-08/D-09):

- `resolvePageAccess()` recognizes the agent caller and returns `agent: { scope: [], expiresAt: null }` (stub)
- `usePageAccess()` returns `agent: null` for human callers
- The `agent` field is reserved for future agent authentication: token validation → scope resolution → space/page intersection using the same 5-layer pipeline

**Agent auth (deferred):** Token issuance, scope management, and audit logging are deferred to a future phase. The current implementation defines the contract but performs no token validation.

---

## 6. Cache Invalidation

- **Server-side:** `Cache-Control: private, max-age=0, must-revalidate` on `/api/access` — browsers cache but revalidate every request
- **Client-side:** `staleTime=0`, `refetchOnWindowFocus=true` — TanStack Query refetches on mount and on window focus
- **Deduplication:** TanStack Query deduplicates identical queries (same `queryKey`) — multiple nav components in a page share a single fetch (T-110-09 mitigation)
- **Manual refetch:** `usePageAccess().refetch()` available for programmatic invalidation

---

## 7. Threat Model Summary

| Threat ID | Category               | Mitigation                                                        |
| --------- | ---------------------- | ----------------------------------------------------------------- |
| T-110-06  | Information Disclosure | Query enabled only when session exists; user-scoped cache key     |
| T-110-07  | Tampering              | staleTime=0 + ISR max-age=30 + TanStack Query built-in dedup      |
| T-110-08  | Elevation of Privilege | filterSpaces only narrows (never expands) server-resolved ceiling |
| T-110-09  | Denial of Service      | TanStack Query deduplicates identical query keys                  |

---

## 8. Future Work

- **Phase 2 migration:** Remove `getVisibleSpaces()` deprecated shim and migrate any remaining direct callers
- **Agent gateway:** Implement token validation, scope resolution, and audit logging (D-08/D-09/D-10)
- **Access-based redirects:** Provider without record → redirect to registration
- **Widget-level access:** Extend beyond spaces/pages to individual widget visibility

---

_Architecture: ACCESS-OVERVIEW.md_
_Phase: 110-page-nav-access-control_
_Last updated: 2026-06-26_
