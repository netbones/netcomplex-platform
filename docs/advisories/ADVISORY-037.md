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
