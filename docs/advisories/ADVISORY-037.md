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

---

## Audit Scope

The audit covers all `src/` code. Framework version: **Next.js 15.5** (not 14 as originally described). TanStack Query v5. Better Auth. Drizzle + Supabase. tRPC. All findings are static analysis — file reads and ripgrep scans. No runtime tracing.

---

## Primitive Counts

| Primitive                          | Files importing | Files using | Call sites |
| ---------------------------------- | --------------- | ----------- | ---------- |
| `cache` from `react`               | 0               | 0           | 0          |
| `unstable_cache` from `next/cache` | 4               | 8           | 8          |
| `"use cache"` directive            | 0               | 0           | 0          |
| `revalidateTag`                    | 5               | 5           | 5          |
| `revalidatePath`                   | 2               | 2           | 40         |
| `useQuery` / `useInfiniteQuery`    | 34              | 49          | 71         |

---

## Layer 1 — React Request Memoization

**Status: ABSENT.**

Zero files import `cache` from `react`. Every call to `getCurrentTenant()`, `getSessionAndRole()`, and `resolveTenantFromRequestHeaders()` executes a fresh database query on every server component render. A single page render with a layout + sidebar + header + content produces 3+ identical DB reads for the same tenant, the same user, and the same session.

The advisory recommends `cache()` for: Current User, Current Tenant, Current Household, Current Membership, Current Permissions. **None are implemented.**

---

## Layer 2 — Next.js Server Cache

**Status: PARTIAL — 8 wrappers, 2 have cross-tenant key bugs.**

### Active wrappers (non-dead)

| Wrapper                       | File:line                                     | keys                             | revalidate (s) | tags            | tenant-scoped key?                                                |
| ----------------------------- | --------------------------------------------- | -------------------------------- | -------------- | --------------- | ----------------------------------------------------------------- |
| `getTenantById`               | `tenant/api/base.ts:216`                      | `['tenant-by-id']`               | 60             | `tenant-lookup` | Yes (auto-hashed arg)                                             |
| `getTenantBySlug`             | `tenant/api/base.ts:225`                      | `['tenant-by-slug']`             | 60             | `tenant-lookup` | Yes                                                               |
| `getTenantByDomain`           | `tenant/api/base.ts:234`                      | `['tenant-by-domain']`           | 60             | `tenant-lookup` | Yes                                                               |
| `getPlatformPageFlags`        | `tenant/api/flags/platform-flags.ts:66`       | `['platform-page-flags']`        | 300            | `settings`      | **No** — global key, tenant arg auto-hashed but not in keys array |
| `getProviderRegistrationMode` | `tenant/api/provider-registration-mode.ts:43` | `['provider-registration-mode']` | 300            | `settings`      | **No** — global key                                               |

### Dead wrappers (exported but never called outside tests)

| Wrapper             | File:line                        | keys                  | revalidate (s) | tags                                                    |
| ------------------- | -------------------------------- | --------------------- | -------------- | ------------------------------------------------------- |
| `getDashboardStats` | `shared/api/data-fetching.ts:11` | `['dashboard-stats']` | 300            | `stats, maintenance, bookings, messages, notifications` |
| `getStaticStats`    | `shared/api/data-fetching.ts:66` | `['static-stats']`    | 600            | `stats`                                                 |
| `getUserContent`    | `shared/api/data-fetching.ts:94` | `['user-content']`    | 120            | `content`                                               |

### Cross-tenant key bug

`getPlatformPageFlags(tenantId)` and `getProviderRegistrationMode(tenantId)` accept `tenantId` as an argument but their `keys` array is `['platform-page-flags']` (global). In Next 15's per-key cache, the global key holds whichever tenant's data was fetched most recently. A request for tenant A's flags can return tenant B's flags if tenant B's request arrived first within the 300s TTL.

The advisory's rule "tenant-aware keys prevent cross-tenant cache pollution" applies to both client and server layers. The server layer violates it in 2 of 5 active wrappers.

---

## Layer 3 — TanStack Query

**Status: IMPLEMENTED with uniform defaults that diverge from the advisory.**

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

### Actual staleTime distribution

| Value   | Count   | Advisory says                          |
| ------- | ------- | -------------------------------------- |
| 0       | 1       | —                                      |
| 10s     | 1       | —                                      |
| 15s     | 1       | —                                      |
| 30s     | ~16     | Notifications 30s ✓; Community 1 min ✗ |
| **60s** | **~22** | Directory 10 min ✗; Services 30 min ✗  |
| 120s    | 1       | —                                      |
| 300s    | 3       | User Profile 5 min ✓                   |

The advisory prescribes a data-freshness matrix with distinct lifetimes per data class. The codebase uses a single 60s default for nearly everything. The only correct overrides: `useUserProfile` (5 min), `usePageAccess` (0 — always fresh).

### Wallet balance staleTime

`walletQuery` at `entities/dwallet/model/useWallet.ts:50-54` has `staleTime: 30_000`. This directly violates the advisory's "Wallet Balance — None — Never cache — Always fresh" rule. Severity: medium. The API layer is uncached; only the client holds stale data for up to 30s.

### Query key tenant scoping

Of 49 files containing `useQuery`:

- **2 include `tenantId` in the key**: `useSetupProgress`, `useEnabledModules`
- **The other 47 rely on server-side `withTenant()`** to scope data

This works for single-tenant but violates the advisory's "tenant-aware keys prevent cross-tenant cache pollution" mandate. A multi-tenant deployment would serve stale cross-tenant data from the client cache.

---

## Layer 4 — Next.js Router Cache

**Status: Default — not customized.** No `"use cache"` directives. No layout-level cache configuration. App Router defaults apply.

---

## Layer 5 — Browser Cache

**Status: Not audited** (static asset headers are infrastructure-level, not application-level).

---

## Tag Invalidation

**Status: Monotone — only `'settings'` is invalidated.**

`CACHE_TAGS` declares 10 tags: `stats, maintenance, bookings, messages, notifications, content, groups, users, conversations, settings`.

| Tag             | Declared in `CACHE_TAGS` | Used in `unstable_cache` tags | Invalidated via `revalidateTag` |
| --------------- | ------------------------ | ----------------------------- | ------------------------------- |
| `settings`      | ✓                        | ✓                             | **✓** (5 call sites)            |
| `stats`         | ✓                        | ✓ (dead wrapper)              | ✗                               |
| `maintenance`   | ✓                        | ✓ (dead wrapper)              | ✗                               |
| `bookings`      | ✓                        | ✓ (dead wrapper)              | ✗                               |
| `messages`      | ✓                        | ✓ (dead wrapper)              | ✗                               |
| `notifications` | ✓                        | ✓ (dead wrapper)              | ✗                               |
| `content`       | ✓                        | ✓ (dead wrapper)              | ✗                               |
| `groups`        | ✓                        | ✗ (unused)                    | ✗                               |
| `users`         | ✓                        | ✗ (unused)                    | ✗                               |
| `conversations` | ✓                        | ✗ (unused)                    | ✗                               |
| `tenant-lookup` | ✗ (undeclared)           | ✓                             | **✗**                           |

The `tenant-lookup` tag is set on `getTenantById/Slug/Domain` but never invalidated by any `revalidateTag` call. Tenant record freshness depends entirely on the 60s TTL.

`revalidateTag('settings')` is called from 4 admin routes (page-flags, hero-carousel, services-config, provider-registration-mode). The advisory's guidance to "always use tags" is correct but only implemented for 1 of 10 declared tags.

---

## Path Invalidation

**Status: Path-only, no tag invalidation in helpers.**

All 7 revalidation helpers in `src/shared/api/revalidation.ts` use `revalidatePath` exclusively:

| Helper                       | Paths invalidated                                                                                           | Tags invalidated |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------- |
| `revalidateDashboard()`      | `/dashboard`, `/api/stats`, `/api/maintenance`, `/api/bookings`, `/api/conversations`, `/api/notifications` | **None**         |
| `revalidateDirectory()`      | `/directory`, `/api/users`, `/api/groups`                                                                   | **None**         |
| `revalidateContent()`        | `/resources`, `/conservation`, `/api/content`                                                               | **None**         |
| `revalidateConversations()`  | `/messages`, `/api/conversations`, `/api/messages`                                                          | **None**         |
| `revalidateAdminChanges()`   | composite (all above + `/admin`)                                                                            | **None**         |
| `revalidateUserData(userId)` | `/resident/:id`, `/member/:id`, `/directory`                                                                | **None**         |
| `revalidateGate(tenantId)`   | 14 gated pages + `/api/flags`                                                                               | **None**         |

**No `revalidatePath('/')` or `revalidatePath('/', 'layout')` calls exist.** This is correct per the advisory.

### Dead helpers

- `revalidateUserData(userId)` — declared, zero call sites
- `revalidateGate(tenantId)` — declared, zero call sites; body ignores `tenantId` entirely (line 131: `void tenantId`)

---

## Never-Cache List Compliance

| Data class                        | Advisory rule | Actual status      | Evidence                                                                                                                                                 |
| --------------------------------- | ------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vote counts / quorum / ballots    | Never cache   | **PASS**           | No ballot/quorum models exist. Comment votes are denormalised counters updated transactionally, not cached.                                              |
| Wallet balances                   | Never cache   | **FAIL (client)**  | `walletQuery` at `entities/dwallet/model/useWallet.ts:50` — staleTime 30s. Server is uncached.                                                           |
| Pending transfers / payout status | Never cache   | **PASS**           | `payoutRequests` reads are uncached.                                                                                                                     |
| Lightning settlement              | Never cache   | **PASS (vacuous)** | No Lightning integration exists.                                                                                                                         |
| Booking availability              | Never cache   | **PASS**           | `checkBookingConflict` and `getBookedSlots` are uncached. Client uses raw `useState`.                                                                    |
| Chat message history              | Realtime only | **FAIL**           | Main `/messages` page (`page-modules/chat/model/useMessages.ts`) is pull-only. `subscribeChatMessages` exists but is only wired in 2 marketplace modals. |

---

## Realtime Coverage

| Channel                    | Transport                              | Tables | Wired into main UI?          |
| -------------------------- | -------------------------------------- | ------ | ---------------------------- |
| `subscribeChatMessages`    | `postgres_changes` INSERT on `Message` | Yes    | **No** — only 2 modals       |
| `subscribeNotifications`   | broadcast                              | —      | Yes (`useNotifSubscription`) |
| `subscribeDisputeMessages` | broadcast                              | —      | Yes (`MediationThread`)      |
| `sendTypingIndicator`      | broadcast                              | —      | **No** — no callers          |
| `createPresenceChannel`    | presence                               | —      | **No** — no callers          |

No `postgres_changes` channel exists for `Comment`, `CommentVote`, `Content`, or `ContentLike` tables.

---

## Domain Module Summary

| Module                | React `cache()` | `unstable_cache`                                                                                       | TanStack staleTime     | Realtime                            | Mutations invalidate                                                             |
| --------------------- | --------------- | ------------------------------------------------------------------------------------------------------ | ---------------------- | ----------------------------------- | -------------------------------------------------------------------------------- |
| Auth / Session        | None            | None                                                                                                   | Better Auth built-in   | n/a                                 | n/a                                                                              |
| Tenant resolution     | None            | `getTenantById/Slug/Domain` (60s); `getPlatformPageFlags` (300s); `getProviderRegistrationMode` (300s) | `useEnabledModules` 5m | n/a                                 | Tag `'settings'` from 4 admin routes; `tenant-lookup` never invalidated          |
| Directory / Providers | None            | None                                                                                                   | 30s–5m various         | n/a                                 | **None**                                                                         |
| Community Feed        | None            | None                                                                                                   | 30s–60s                | **None**                            | `revalidateContent()` on content CRUD only; likes/comments/votes no invalidation |
| Chat                  | None            | None                                                                                                   | 10s–30s                | `Message` (partial — 2 modals only) | `revalidateConversations()` on send/delete; client does not `invalidateQueries`  |
| Voting / Meetings     | None            | None                                                                                                   | None (no hooks)        | n/a                                 | **None**                                                                         |
| Wallet / dWallet      | None            | None                                                                                                   | 30s–120s               | n/a                                 | Client `invalidateQueries(['dwallet'])` after mutations ✓                        |
| Bookings              | None            | None                                                                                                   | None                   | n/a                                 | `revalidateDashboard()` on create/cancel                                         |
| Notifications         | None            | None                                                                                                   | N/A (no TanStack)      | broadcast channel ✓                 | **None**                                                                         |
| Documents / Resources | None            | None                                                                                                   | 30s                    | n/a                                 | `revalidateContent()` on CRUD                                                    |

---

## Key Divergences

1. **Layer 1 entirely absent** — zero React `cache()` usage. Auth, tenant, and session DB queries repeat on every nested server component render.

2. **Server cache keys not tenant-scoped** — `getPlatformPageFlags` and `getProviderRegistrationMode` use global keys while accepting tenant-specific arguments. Cross-tenant data leakage risk.

3. **Tag invalidation is monotone** — 10 tags declared; only `'settings'` ever invalidated. The other 9 are either attached to dead wrappers or declared but unused.

4. **Revalidation helpers are path-only** — no helper calls `revalidateTag`. Every dashboard mutation triggers ISR regeneration of 6+ paths regardless of what actually changed.

5. **TanStack staleTime is uniform** — 60s default applied to all data classes. Advisory prescribes distinct lifetimes (10min for directory, 30s for notifications, 5min for profile).

6. **Wallet balance cached at 30s** — direct violation of "never cache balances."

7. **Main chat is pull-only** — `subscribeChatMessages` exists but is not wired into the `/messages` page. Realtime is available but unused where it matters most.

8. **Query keys not tenant-namespaced** — 47 of 49 `useQuery` files omit `tenantId` from the key. Relies on server-side `withTenant()` scoping.

9. **Content likes/comments/votes have no invalidation** — no `revalidatePath`, no `revalidateTag`, no client `invalidateQueries`. Concurrent users cannot see each other's votes until page reload.

10. **`revalidateGate(tenantId)` and `revalidateUserData(userId)` are dead code** — declared, exported, zero call sites.

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

- [ ] Implement differentiated TanStack staleTime per data class (directory 10min, notifications 30s, community 60s, etc.)
- [ ] Remove dead wrappers (`getDashboardStats`, `getStaticStats`, `getUserContent`) or wire them into server components
- [ ] Remove or implement `revalidateUserData` and `revalidateGate`
- [ ] Add `postgres_changes` channel for `Comment` and `CommentVote` tables

### P3 — Future (M6+) · `bd-4f6w`

- [ ] Evaluate `"use cache"` directive when Next.js stabilizes it
- [ ] Redis/Valkey for distributed server cache
- [ ] Cache metrics and observability (hit rate, miss rate, invalidation frequency)
