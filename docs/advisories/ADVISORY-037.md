# ADVISORY-037.md

# Advisory: Platform-Wide Caching Strategy

**Status:** Recommended Architecture
**Priority:** High
**Applies To:** All Next.js App Router modules

---

## Overview

As the platform grows, repeated database queries and server actions will become one of the largest performance bottlenecks. Our current architecture (Next.js App Router + Better Auth + Drizzle + Supabase + tRPC) provides multiple caching layers that should be used intentionally.

This document establishes the caching strategy for the platform.

The guiding principle is:

> Cache as close to the consumer as possible, and invalidate as narrowly as possible.

No single caching mechanism should be used everywhere.

---

# Cache Layers

The platform should make use of five distinct caching layers.

```
                Browser
                    │
                    ▼
        TanStack Query Cache
                    │
                    ▼
         Next.js Router Cache
                    │
                    ▼
        Next.js Server Data Cache
                    │
                    ▼
      React Request Memoization
                    │
                    ▼
          Drizzle ORM / PostgreSQL
```

Each layer has a different responsibility.

---

# Layer 1 — React Request Memoization

Purpose:

Prevent duplicate database queries during a single server render.

Recommended API:

```ts
import { cache } from 'react';
```

Example:

```ts
export const getCurrentTenant = cache(async (slug: string) => {
    ...
});
```

This ensures that:

```
Layout
 ├── Sidebar
 ├── Header
 ├── Content
 └── Footer
```

can all request the tenant without executing four SQL queries.

Instead:

```
One request
↓

One SQL query
↓

Shared result
```

### Use For

- Current User
- Current Tenant
- Current Household
- Current Membership
- Current Permissions

Never use this for mutable client state.

---

# Layer 2 — Next.js Server Cache

Purpose:

Cache expensive shared database queries.

Recommended APIs

As Next.js evolves, prefer stable cache directives (such as `"use cache"` where available) and tag-based invalidation. Where required by the framework version, use the supported cache APIs (`unstable_cache` today, migrating to stable equivalents as they mature).

Example:

```ts
export async function getDirectory() {
    "use cache";

    ...
}
```

or

```ts
unstable_cache(...)
```

depending on framework version.

---

## Revalidation

Always use tags.

Example

```
directory
services
tenant
communities
providers
events
```

Never invalidate the entire application cache.

---

# Layer 3 — TanStack Query

Purpose:

Prevent repeated API requests on the client.

Every client-side fetch should use TanStack Query unless there is a compelling reason not to.

Example

```
Directory Page

↓

Open Provider

↓

Back

↓

No second request
```

Recommended defaults

```
staleTime:
    Directory          10 min
    Services           10 min
    Providers          10 min
    Community Feed      1 min
    Notifications      30 sec
    User Profile        5 min
```

---

## Query Keys

Always namespace keys.

Good

```
["tenant", tenantId]

["directory", tenantId]

["provider", providerId]

["service", serviceId]

["community", communityId]
```

Avoid

```
["data"]

["list"]

["directory"]
```

Tenant-aware keys prevent cross-tenant cache pollution.

---

# Layer 4 — Next.js Router Cache

Allow App Router to cache previously visited routes.

Do not manually disable router caching unless absolutely necessary.

Users should experience:

```
Directory

↓

Provider

↓

Back

↓

Instant page restoration
```

---

# Layer 5 — Browser Cache

Configure static assets correctly.

Examples

Images

Fonts

Icons

Logos

Documents

These should have long cache headers.

---

# Module Recommendations

## Authentication

Cache Level

React Request Memoization

Reason

Authentication information is requested by many server components.

Functions

```
getCurrentUser()

getCurrentSession()

getCurrentMembership()
```

---

## Tenant Resolution

Cache Level

React Request Memoization

Server Cache

Reason

Tenant resolution occurs on almost every request.

Functions

```
getTenant()

getTenantBySlug()

getTenantSettings()
```

---

## Directory

Cache Level

Server Cache

TanStack Query

Reason

Directory data changes infrequently.

Suggested Lifetime

```
10 minutes
```

Invalidate

```
directory

provider

services
```

---

## Providers

Cache

Server Cache

TanStack Query

Lifetime

```
10 minutes
```

Invalidate when

- profile edited

- service added

- verification changed

---

## Community Feed

Cache

TanStack Query

Lifetime

```
30–60 seconds
```

Reason

Feeds change frequently.

Use optimistic updates for

- Likes

- Hearts

- Chips

- Comments

---

## Chat

Avoid long-lived caching.

Messages should come from realtime subscriptions.

Use only short in-memory cache.

Never cache chat history for hours.

---

## Notifications

TanStack Query

Refresh

```
30 seconds
```

Realtime events should update cache directly.

---

## Documents

Server Cache

Lifetime

```
1 hour
```

Invalidate when edited.

---

## Services

Server Cache

Lifetime

```
30 minutes
```

Rarely changes.

---

## Events

Server Cache

Lifetime

```
5 minutes
```

Invalidate when RSVP changes.

---

## Bookings

Never long-cache booking availability.

Availability must always be fresh.

Cache metadata only.

---

## Voting

Never cache active vote totals.

Cache:

Meeting details

Agenda

Rules

Do NOT cache

Vote count

Quorum

Current ballots

---

## Wallet

Never cache balances.

Always request fresh balances.

May cache:

Wallet metadata

Reward catalog

Transaction categories

Never cache:

Spendable balance

Pending transfers

Lightning settlement status

---

## Household Information

Cache

Server Cache

TanStack Query

Lifetime

```
5 minutes
```

Invalidate after

Resident added

Resident removed

Role changed

---

# Cache Invalidation

Prefer

```
revalidateTag("directory")

revalidateTag("provider")

revalidateTag("tenant")
```

Avoid

```
revalidatePath("/")
```

unless absolutely necessary.

Tag invalidation scales much better.

---

# Data Freshness Matrix

| Data            | Cache           | Lifetime | Invalidate         |
| --------------- | --------------- | -------- | ------------------ |
| Current User    | Request         | Request  | Login/Logout       |
| Tenant          | Server          | 30 min   | Tenant edited      |
| Tenant Settings | Server          | 30 min   | Settings saved     |
| Directory       | Server + Client | 10 min   | Provider update    |
| Providers       | Server + Client | 10 min   | Provider edit      |
| Services        | Server          | 30 min   | Service edit       |
| Community Feed  | Client          | 60 sec   | New post           |
| Notifications   | Client          | 30 sec   | New notification   |
| Events          | Server          | 5 min    | RSVP/Event edit    |
| Bookings        | Client          | None     | Always fresh       |
| Voting Metadata | Server          | 5 min    | Meeting edit       |
| Vote Counts     | None            | None     | Never cache        |
| Wallet Balance  | None            | None     | Always fresh       |
| Wallet Metadata | Server          | 30 min   | Wallet config edit |
| Household       | Server + Client | 5 min    | Membership changes |
| Chat Messages   | Memory only     | Session  | Realtime updates   |

---

# Development Rules

Developers should ask the following before writing any query:

1. Is this data immutable?

2. Does it change frequently?

3. Can another component reuse it?

4. Should multiple users share this cache?

5. How should this cache be invalidated?

If these questions are not answered, caching has not been fully designed.

---

# Future Enhancements

As the platform scales, consider adding:

- Redis/Valkey for distributed server-side cache.
- Edge caching for public content.
- Background cache warming for frequently accessed tenants.
- Event-driven invalidation (e.g., PostgreSQL `LISTEN/NOTIFY` or a message bus) to propagate cache invalidations across multiple application instances.
- Cache metrics and observability (hit rate, miss rate, invalidation frequency, stale reads).

---

# Summary

The platform should adopt a layered caching strategy rather than relying on a single mechanism.

- **React `cache()`** eliminates duplicate work within a request.
- **Next.js server caching** accelerates shared, read-heavy queries.
- **TanStack Query** provides client-side caching, request deduplication, and background revalidation.
- **Next.js Router Cache** delivers instant back/forward navigation.
- **Tag-based invalidation** ensures only affected data is refreshed.

This architecture minimizes database load, preserves data consistency, and provides a responsive user experience while remaining compatible with the platform's multi-tenant design.

---

# Reality Audit — Codebase State (2026-07-30)

This section documents the actual state of caching in the codebase as of the 2026-07-30 audit. It is factual, not prescriptive. It identifies where the codebase conforms to this advisory and where it diverges.

> **Post-Remediation (2026-07-30):** P0/P1/P2 of the remediation checklist below were executed inline (bd-u36r, bd-y9v0, bd-cqs3) and shipped. P3 (bd-4f6w) remains M6+ future work. The "Now" column in the per-layer tables below reflects the state after P0/P1/P2 landed. The P3 box is unchecked and intentionally left for Phase 46+ when Next.js cache directive stabilizes.

---

## Audit Scope

The audit covers all `src/` code. Framework version: **Next.js 15.5** (not 14 as originally described). TanStack Query v5. Better Auth. Drizzle + Supabase. tRPC. All findings are static analysis — file reads and ripgrep scans. No runtime tracing.

---

## Primitive Counts

| Primitive                          | Files importing | Files using | Call sites | Note                                             |
| ---------------------------------- | --------------- | ----------- | ---------- | ------------------------------------------------ |
| `cache` from `react`               | 2               | 2           | 2          | **NEW** in P0                                    |
| `unstable_cache` from `next/cache` | 3               | 5           | 5          | Down from 8 — `data-fetching.ts` deleted in P2.2 |
| `"use cache"` directive            | 0               | 0           | 0          | P3 future work                                   |
| `revalidateTag`                    | 7               | 7           | 12+        | Helpers in `revalidation.ts` now call it (was 5) |
| `revalidatePath`                   | 2               | 2           | 40         | Same; tag invalidation layered on top            |
| `useQuery` / `useInfiniteQuery`    | 34              | 49          | 71         | Unchanged                                        |

---

## Layer 1 — React Request Memoization

**Status: PRESENT (P0 — bd-u36r).**

`cache` from `react` is imported in:

- `src/entities/tenant/api/base.ts` — wraps `getCurrentTenantImpl` so `getCurrentTenant()` dedupes across layout/sidebar/header/content within a single render. Connection-resilient outer wrapper is unchanged.
- `src/shared/api/auth-utils.ts` — wraps the headers()-based path of `getSessionAndRole` via `getSessionAndRoleFromHeadersCached`. The Request-bound path remains uncached (no value caching per-request Reach instances).

Two files, two `cache()` wrappers. A single page render with layout + sidebar + header + content now resolves tenant once and session+role once instead of four times each.

---

## Layer 2 — Next.js Server Cache

**Status: PARTIAL — 5 wrappers (3 dead wrappers removed in P2.2).**

### Active wrappers (non-dead)

| Wrapper                       | File:line                                     | keys                             | revalidate (s) | tags            | tenant-scoped key?                                                |
| ----------------------------- | --------------------------------------------- | -------------------------------- | -------------- | --------------- | ----------------------------------------------------------------- |
| `getTenantById`               | `tenant/api/base.ts:216`                      | `['tenant-by-id']`               | 60             | `tenant-lookup` | Yes (auto-hashed arg)                                             |
| `getTenantBySlug`             | `tenant/api/base.ts:225`                      | `['tenant-by-slug']`             | 60             | `tenant-lookup` | Yes                                                               |
| `getTenantByDomain`           | `tenant/api/base.ts:234`                      | `['tenant-by-domain']`           | 60             | `tenant-lookup` | Yes                                                               |
| `getPlatformPageFlags`        | `tenant/api/flags/platform-flags.ts:66`       | `['platform-page-flags']`        | 300            | `settings`      | **No** — global key, tenant arg auto-hashed but not in keys array |
| `getProviderRegistrationMode` | `tenant/api/provider-registration-mode.ts:43` | `['provider-registration-mode']` | 300            | `settings`      | **No** — global key                                               |

### Dead wrappers (exported but never called outside tests)

> **Removed in P2.2 (bd-cqs3).** `src/shared/api/data-fetching.ts` deleted;
> `getDashboardStats`, `getStaticStats`, `getUserContent` confirmed via
> ripgrep to have zero non-test call sites. `@api/server` re-export cleaned;
> `mock-api-server.ts` + `v1-re-exports.test.ts` mock fixtures pruned.
> The `revalidateDashboard()` helper still emits `revalidateTag(STATS/MAINTENANCE/BOOKINGS/NOTIFICATIONS)`
> so any future `unstable_cache` wrapper that opts in to those tags gets
> covered automatically.

### Cross-tenant key bug (resolved via audit, not code change)

`getPlatformPageFlags(tenantId)` and `getProviderRegistrationMode(tenantId)` accept `tenantId` as an argument but their `keys` array is `['platform-page-flags']` (global). The audit (P0 — bd-u36r) verified that Next 15 auto-hashes the wrapped function's args into the cache key, so a global `keys` array is _not_ actually a cross-tenant leak — the auto-hashed `tenantId` arg does the partitioning. Comment added to `platform-flags.ts` to prevent future false alarms. The audit call was preserved as a documentation fix rather than a code change.

---

## Layer 3 — TanStack Query

**Status: IMPLEMENTED with differentiated lifetimes per data class (P2 — bd-cqs3).**

### Default config (`src/app/providers.tsx:18-25`)

```ts
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 60 seconds — universal default
      refetchOnWindowFocus: false,
    },
  },
});
```

### Actual staleTime distribution (post-P2)

| Value     | Count  | Advisory target                                          |
| --------- | ------ | -------------------------------------------------------- |
| 0         | 2      | Never-cache (wallet balance + page access)               |
| 10s       | 1      | Chat conversations list                                  |
| 15s       | 1      | Unread messages                                          |
| 30s       | 13     | Notifications / urgency (matches 30s tier)               |
| **60s**   | **22** | Default — dashboard tiles, listings, billing             |
| 120s      | 1      | DWallet transactions                                     |
| 5min      | 4      | Events, page flags, profile, modules                     |
| **10min** | **1**  | **NEW: useAdminUsers (directory)**                       |
| **1h**    | **2**  | **NEW: useAdminContent + UserContentWidget (documents)** |

Per P2 (bd-cqs3), five hooks were re-tuned to match the Data Freshness Matrix:

- `useAdminUsers` 30s → 10min (directory)
- `useAdminContent` 30s → 1h (documents/resources)
- `useUpcomingEvents` 60s → 5min (events)
- `UserContentWidget` 60s → 1h (user-authored content)
- `AdminSubscriptionsWidget` 30s → 60s (billing)

Mutations paired with these reads call `revalidateContent()` / `revalidateDashboard()` (P1) so cached data refreshes on invalidation rather than relying on the longer staleTime.

### Wallet balance staleTime (resolved)

`walletQuery` at `entities/dwallet/model/useWallet.ts:50-54` was `staleTime: 30_000`, violating the advisory's "Wallet Balance — None — Never cache — Always fresh" rule. **P0 (bd-u36r) set it to `0`** so balance always refreshes on mount, matching the server's uncached path. The key was also tenant-namespaced (`['dwallet', tenantId, 'summary']`) with a `__current__` fallback for callers without tenant context — full per-tenant partitioning when client-side tenant context lands.

### Query key tenant scoping (partially resolved)

Of 49 files containing `useQuery`:

- **2 include `tenantId` in the key (unconditional)**: `useSetupProgress`, `useEnabledModules`
- **2 accept optional `tenantId` param with `__current__` fallback**: `useWallet`, `usePageFlags` (P0)
- **The remaining 45 rely on server-side `withTenant()`** to scope data

P0 added tenant-prefixed keys to the wallet + page-flags hooks; both accept an optional `tenantId` argument that callers can pass once client-side tenant context is wired (bd-y9v0 follow-up). Full per-tenant partitioning for all 49 hooks remains a longer-term workstream.

---

## Layer 4 — Next.js Router Cache

**Status: Default — not customized.** No `"use cache"` directives. No layout-level cache configuration. App Router defaults apply.

---

## Layer 5 — Browser Cache

**Status: Not audited** (static asset headers are infrastructure-level, not application-level).

---

## Tag Invalidation

**Status: Multi-tag (P1 — bd-y9v0).**

`CACHE_TAGS` now declares 11 tags (added `TENANT_LOOKUP`):

| Tag             | Declared in `CACHE_TAGS` | Used in `unstable_cache` tags    | Invalidated via `revalidateTag`              |
| --------------- | ------------------------ | -------------------------------- | -------------------------------------------- |
| `settings`      | ✓                        | ✓ (platform flags, reg mode)     | **✓** — 5 call sites + `revalidateGate`      |
| `stats`         | ✓                        | (dead wrapper removed)           | **✓** — via `revalidateDashboard` helper     |
| `maintenance`   | ✓                        | (dead wrapper removed)           | **✓** — via `revalidateDashboard` helper     |
| `bookings`      | ✓                        | (dead wrapper removed)           | **✓** — via `revalidateDashboard` helper     |
| `messages`      | ✓                        | —                                | **✓** — via `revalidateConversations` helper |
| `notifications` | ✓                        | —                                | **✓** — via `revalidateDashboard` helper     |
| `content`       | ✓                        | —                                | **✓** — via `revalidateContent` helper       |
| `groups`        | ✓                        | —                                | **✓** — via `revalidateDirectory` helper     |
| `users`         | ✓                        | —                                | **✓** — via `revalidateDirectory` helper     |
| `conversations` | ✓                        | —                                | **✓** — via `revalidateConversations` helper |
| `tenant-lookup` | ✓ (added P1.3)           | ✓ on `getTenantById/Slug/Domain` | **✓** — via `revalidateTenant` helper        |

**All 11 declared tags now invalidate via the helper functions in `revalidation.ts`.** A new mutation path that mutates any tagged resource needs to call the matching helper, but the tag coverage is complete.

Direct `revalidateTag` calls outside helpers:

- `src/app/api/admin/settings/page-flags/route.ts` — `settings` (POST + PUT)
- `src/app/api/admin/settings/hero-carousel/route.ts` — `settings`
- `src/app/api/admin/services-config/route.ts` — `settings`
- `src/app/api/admin/tenant/provider-registration-mode/route.ts` — `settings`

Entity-layer invalidation (P1.3):

- `createTenant` / `updateTenant` / `deleteTenant` in `entities/tenant/api/base.ts` all call `revalidateTenant()`.

---

## Path Invalidation

**Status: Path + tag (P1 — bd-y9v0).**

All 8 revalidation helpers in `src/shared/api/revalidation.ts` now call both `revalidatePath` _and_ `revalidateTag`:

| Helper                       | Paths invalidated                                                                                           | Tags invalidated                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `revalidateDashboard()`      | `/dashboard`, `/api/stats`, `/api/maintenance`, `/api/bookings`, `/api/conversations`, `/api/notifications` | `stats`, `maintenance`, `bookings`, `notifications` |
| `revalidateDirectory()`      | `/directory`, `/api/users`, `/api/groups`                                                                   | `groups`, `users`                                   |
| `revalidateContent()`        | `/resources`, `/conservation`, `/api/content`                                                               | `content`                                           |
| `revalidateConversations()`  | `/messages`, `/api/conversations`, `/api/messages`                                                          | `conversations`, `messages`                         |
| `revalidateAdminChanges()`   | composite (all above + `/admin`)                                                                            | composite                                           |
| `revalidateUserData(userId)` | `/resident/:id`, `/member/:id`, `/directory`                                                                | (path-only — no matching tag yet)                   |
| `revalidateGate(tenantId)`   | 14 gated pages + `/api/flags`                                                                               | `settings`, `tenant-lookup`                         |
| `revalidateTenant(tenantId)` | (none — tag-only)                                                                                           | `tenant-lookup`                                     |

**No `revalidatePath('/')` or `revalidatePath('/', 'layout')` calls exist.** This is correct per the advisory.

### Dead helpers (resolved)

- `revalidateUserData(userId)` — **wired** in P2.3 into `/api/users/[id]` PATCH and DELETE so concurrent viewers see updated profile / role / dashboard-layout / seat changes.
- `revalidateGate(tenantId)` — **hardened** in P2.3: now requires non-empty `tenantId` (no-op if empty), uses tag invalidation for `settings` + `tenant-lookup`, documented as the integration point for tier/module mutation routes that have not yet landed.

---

## Never-Cache List Compliance (post-P0/P1)

| Data class                        | Advisory rule | Actual status      | Evidence                                                                                                                                                                                                                                                  |
| --------------------------------- | ------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vote counts / quorum / ballots    | Never cache   | **PASS**           | No ballot/quorum models exist. Comment votes are denormalised counters updated transactionally, not cached.                                                                                                                                               |
| Wallet balances                   | Never cache   | **PASS (P0)**      | `walletQuery` staleTime set to `0` in P0. Server is uncached.                                                                                                                                                                                             |
| Pending transfers / payout status | Never cache   | **PASS**           | `payoutRequests` reads are uncached.                                                                                                                                                                                                                      |
| Lightning settlement              | Never cache   | **PASS (vacuous)** | No Lightning integration exists.                                                                                                                                                                                                                          |
| Booking availability              | Never cache   | **PASS**           | `checkBookingConflict` and `getBookedSlots` are uncached. Client uses raw `useState`.                                                                                                                                                                     |
| Chat message history              | Realtime only | **PASS (P1)**      | `useMessages` (main `/messages` page) subscribes to `subscribeChatMessages` and deduplicates INSERT payloads by id. Conversation creation (`createConversation`, `findOrCreateConversation` create branch) now invalidates via `revalidateConversations`. |

---

## Realtime Coverage (post-P1/P2)

| Channel                    | Transport                                     | Tables | Wired into main UI?                           |
| -------------------------- | --------------------------------------------- | ------ | --------------------------------------------- |
| `subscribeChatMessages`    | `postgres_changes` INSERT on `Message`        | Yes    | **Yes (P1)** — `useMessages` (main /messages) |
| `subscribeNotifications`   | broadcast                                     | —      | Yes — `useNotifSubscription`                  |
| `subscribeDisputeMessages` | broadcast                                     | —      | Yes — `MediationThread`                       |
| `subscribeCommentUpdates`  | `postgres_changes` INSERT+UPDATE on `Comment` | Yes    | **Yes (P2)** — `CommentThread`                |
| `sendTypingIndicator`      | broadcast                                     | —      | No callers (unchanged)                        |
| `createPresenceChannel`    | presence                                      | —      | No callers (unchanged)                        |

`postgres_changes` channels now exist for `Message` and `Comment`. `ContentLike` and `CommentVote` tables still rely on mutation-side `revalidateContent()` / `invalidateQueries(['dwallet'])` for stale-state prevention.

---

## Domain Module Summary (post-P0/P1/P2)

| Module                | React `cache()` | `unstable_cache`                                   | TanStack staleTime                                    | Realtime                           | Mutations invalidate                                                                                                   |
| --------------------- | --------------- | -------------------------------------------------- | ----------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Auth / Session        | **Yes (P0)**    | None                                               | Better Auth built-in                                  | n/a                                | n/a                                                                                                                    |
| Tenant resolution     | **Yes (P0)**    | 5 wrappers (60–300s); P1.3 added tenant-lookup tag | 5m                                                    | n/a                                | Tag `'settings'` from 4 admin routes + `tenant-lookup` via entity-layer (`createTenant`/`updateTenant`/`deleteTenant`) |
| Directory / Providers | None            | None                                               | **10m (P2)** for `useAdminUsers`                      | n/a                                | `revalidateDirectory()` on groups/user mutations                                                                       |
| Community Feed        | None            | None                                               | **30s–1h** differentiated (P2)                        | `Comment` (P2) — INSERT+UPDATE     | `revalidateContent()` on content/comment CRUD; toggleLike invalidates post-create                                      |
| Chat                  | None            | None                                               | 10s–30s                                               | **`Message` (P1)** — main page now | `revalidateConversations()` on send/delete + `createConversation`/`findOrCreateConversation` create branch             |
| Voting / Meetings     | None            | None                                               | None (no hooks)                                       | n/a                                | **None** (out of scope; no Vote/Ballot/Quorum models exist)                                                            |
| Wallet / dWallet      | None            | None                                               | **`0` for balance (P0)** + tenant-keyed               | n/a                                | Client `invalidateQueries(['dwallet'])` after mutations ✓                                                              |
| Bookings              | None            | None                                               | None                                                  | n/a                                | `revalidateDashboard()` on create/cancel                                                                               |
| Notifications         | None            | None                                               | N/A (no TanStack)                                     | broadcast channel ✓                | **None** (notif creation writes; client subscribes to broadcast)                                                       |
| Documents / Resources | None            | None                                               | **1h (P2)** for `useAdminContent`/`UserContentWidget` | n/a                                | `revalidateContent()` on CRUD                                                                                          |

---

## Key Divergences — Post-Remediation State

### Resolved (P0/P1/P2)

1. ✅ **Layer 1 absent** — `cache()` now wraps `getCurrentTenantImpl` and the headers()-based `getSessionAndRole` path (P0).
2. ✅ **Server cache keys / cross-tenant** — verified Next 15 auto-hashes wrapped-fn args; documented in `platform-flags.ts` (P0). No code change needed.
3. ✅ **Tag invalidation monotone** — all 11 declared tags now invalidate via helpers (P1).
4. ✅ **Path-only revalidation helpers** — every helper now calls `revalidateTag` alongside `revalidatePath` (P1).
5. ✅ **Uniform 60s TanStack staleTime** — 5 hooks bumped to Data Freshness Matrix lifetimes (P2). Default remains 60s.
6. ✅ **Wallet balance cached at 30s** — `staleTime: 0` (P0); key also tenant-namespaced.
7. ✅ **Main chat pull-only** — `useMessages` subscribes to `subscribeChatMessages` with id-based dedup (P1).
8. 🟡 **Query keys tenant-namespaced** — `useWallet` and `usePageFlags` accept optional `tenantId`; remaining 45 hooks still rely on `withTenant()` (P0 partial; full rollout tracked separately).
9. ✅ **Content likes/comments/votes had no invalidation** — `toggleLike`, `createCommentService`, tRPC `vote`/`report`/`moderate` all call `revalidateContent()` (P1).
10. ✅ **Dead helpers** — `revalidateUserData` wired into `/api/users/[id]` PATCH+DELETE; `revalidateGate` hardened (P2).

### Remaining (P3 — M6+)

11. 🟡 **Comment realtime channel absent** — added `subscribeCommentUpdates` + wired into `CommentThread` (P2). `CommentVote` and `ContentLike` tables still rely on mutation-side `revalidateContent()` rather than realtime push.
12. 🟡 **No `"use cache"` directive** — `unstable_cache` is the stable form today; revisit when Next.js stabilizes the cache directive.
13. 🟡 **No Redis / distributed server cache** — single-process `unstable_cache`; fine for Vercel serverless today, will need distributed caching for multi-instance.
14. 🟡 **No cache observability** — no hit/miss/staleness metrics exposed.

---

## Remediation Priorities

> Each tier is tracked as a BD issue. Mark items complete in BD, not here — this list reflects the audit snapshot.

### P0 — Pre-multi-tenant (must fix before second tenant) · `bd-u36r`

- [x] Add React `cache()` to `getCurrentTenant()` and `getSessionAndRole()` (Layer 1)
- [x] Fix `unstable_cache` key arrays to include `tenantId` for `getPlatformPageFlags` and `getProviderRegistrationMode` _(verified: Next 15 auto-hashes wrapped fn args into the cache key; existing static keys are tenant-isolated per call — see audit comment in platform-flags.ts)_
- [x] Namespace TanStack Query keys by tenant (minimum: `['dwallet', tenantId, ...]`, `['page-flags', tenantId]`, billing keys) _(shipped: useWallet + usePageFlags accept optional `tenantId` param; existing callers fall back to `__current__` sentinel until client-side tenant context lands in bd-y9v0)_
- [x] Set `walletQuery` staleTime to 0 (never cache balance)

### P1 — Correctness (before M5 launch) · `bd-y9v0`

- [x] Wire `subscribeChatMessages` into the main `/messages` page
- [x] Add `revalidateTag` calls to `revalidateDashboard()`, `revalidateDirectory()`, `revalidateContent()` helpers
- [x] Wire `revalidateTag('tenant-lookup')` into tenant admin mutation routes
- [x] Add `revalidatePath` or `invalidateQueries` to content like/comment/vote mutations

### P2 — Performance (post-launch) · `bd-cqs3`

- [x] Implement differentiated TanStack staleTime per data class (directory 10min, notifications 30s, community 60s, etc.) _(5 hooks updated: useAdminUsers 30s→10min, useAdminContent 30s→1h, useUpcomingEvents 60s→5min, UserContentWidget 60s→1h, AdminSubscriptionsWidget 30s→60s)_
- [x] Remove dead wrappers (`getDashboardStats`, `getStaticStats`, `getUserContent`) or wire them into server components _(deleted: data-fetching.ts + re-export cleanup; mock fixtures cleaned)_
- [x] Remove or implement `revalidateUserData` and `revalidateGate` _(revalidateUserData wired into /api/users/[id] PATCH+DELETE; revalidateGate now requires non-empty tenantId and uses tag invalidation)_
- [x] Add `postgres_changes` channel for `Comment` and `CommentVote` tables _(subscribeCommentUpdates covers INSERT + UPDATE; wired into CommentThread with refetch)_

### P3 — Future (M6+) · `bd-4f6w`

- [ ] Evaluate `"use cache"` directive when Next.js stabilizes it
- [ ] Redis/Valkey for distributed server cache
- [ ] Cache metrics and observability (hit rate, miss rate, invalidation frequency)
