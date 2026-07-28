---
title: Dashboard Query Infrastructure Report
status: current
reviewed: 2026-07-28
tags: [report, analysis]
audience: developer
---

# Dashboard Query Infrastructure Report

**Date:** 2026-06-21
**Status:** ⚠️ Needs work — 94% of dashboard data fetches are uncached raw fetch calls

---

## Executive Summary

The dashboard fires ~35 API calls on load from ~18 components. Only **2 calls** use TanStack Query with cache deduplication. The remaining **33+ calls** use raw `useEffect` + `fetch` with per-component `useState`, meaning every component re-fetches its data on every mount with zero cache sharing, zero request cancellation on unmount, and zero deduplication across components that call the same endpoint.

---

## 1. Current State

### 1.1 Caching Coverage

| Pattern                     | Count | %   |
| --------------------------- | ----- | --- |
| TanStack Query (`useQuery`) | 2     | 6%  |
| Raw `useEffect` + `fetch`   | 33+   | 94% |

The only TanStack Query users are:

- `DashboardStats` — `/api/dashboard/stats` with `staleTime: 30s`
- `MobileSpaceBar` — `/api/messages/unread` with `staleTime: 15s`, `refetchInterval: 30s`

### 1.2 TanStack Query Setup

`QueryClientProvider` is configured in `src/app/providers.tsx` with default `staleTime: 60s` and `refetchOnWindowFocus: false`. The infrastructure is in place — it's just not used.

---

## 2. Duplication Map

### 2.1 `/api/messages/unread` — 3 independent callers

| Component      | Pattern                                          | Cache          |
| -------------- | ------------------------------------------------ | -------------- |
| HomeLayer      | `useEffect` + raw `fetch`                        | None           |
| MobileSpaceBar | `useQuery({ queryKey: ['messages', 'unread'] })` | TanStack Query |
| DirectoryGrid  | `useEffect` + `apiGet`                           | None           |

Only MobileSpaceBar benefits from cache deduplication. HomeLayer and DirectoryGrid each make uncached duplicate requests.

### 2.2 `/api/announcements` — 4 calls (HomeLayer alone makes 3)

| Component                 | URL                        | Purpose           |
| ------------------------- | -------------------------- | ----------------- |
| HomeLayer                 | `?priority=urgent`         | Urgency zone      |
| HomeLayer                 | `?limit=5`                 | Recent activity   |
| HomeLayer                 | `?limit=5&priority=normal` | Community section |
| AnnouncementsStreamWidget | `?active=true&limit=5`     | Standalone widget |

The `?limit=5` and `?limit=5&priority=normal` calls return overlapping data.

### 2.3 `/api/events?upcoming=true&limit=5` — 2 callers

| Component    | Pattern     |
| ------------ | ----------- |
| HomeLayer    | raw `fetch` |
| EventsWidget | raw `fetch` |

Same data, different param ordering (`upcoming=true&limit=5` vs `limit=5&upcoming=true`). Both uncached.

### 2.4 `/api/maintenance` — 3 calls in HomeLayer alone

1. `?overdue=true&userId=...` — urgency zone count
2. `?limit=5&scope=mine` — activity zone rows
3. `?overdue=true` (fallback when no userId)

All within one `Promise.all` block.

### 2.5 `/api/conversations?userId=...` — 2 callers

| Component      | File                                          |
| -------------- | --------------------------------------------- |
| MessagesWidget | `src/widgets/dashboard/ui/MessagesWidget.tsx` |
| MessagesWidget | `src/widgets/chat/ui/MessagesWidget.tsx`      |

Two different MessagesWidget implementations fetching the same endpoint.

### 2.6 `/api/premium/listings` — 2 callers

`AgentWidget` and `PremiumPortfolioWidget` both call this. `PremiumPortfolioWidget` embeds `AgentWidget` — when the listings tab is shown, the endpoint is called twice.

---

## 3. HomeLayer: 8 Parallel Fetches

`HomeLayer.tsx` fires **8 requests** in a single `Promise.all`:

```
/api/announcements?priority=urgent
/api/maintenance?overdue=true&userId=...
/api/events?upcoming=true&limit=5
/api/bookings?date=today
/api/announcements?limit=5
/api/announcements?limit=5&priority=normal
/api/maintenance?limit=5&scope=mine
/api/messages/unread
```

Three of these calls are to `/api/announcements` with slightly different params. Two to `/api/maintenance`. None of them are cached. Every dashboard mount triggers all 8.

---

## 4. Recommendations

### Priority 1: Shared TanStack Query hooks for duplicated endpoints

Create dedicated hooks with shared query keys:

```typescript
// src/shared/lib/hooks/useUnreadMessages.ts
export function useUnreadMessages() {
  return useQuery({
    queryKey: ['messages', 'unread'],
    queryFn: () => fetch('/api/messages/unread').then(r => r.json()),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
```

Same pattern for `useUpcomingEvents`, `useActiveAnnouncements`, `useConversations`, `usePremiumListings`. TanStack Query automatically deduplicates identical `queryKey` calls in flight — no coordination needed.

**Effort**: 5 hook files (~15 lines each) + 10 component updates to switch from raw fetch to hook.

### Priority 2: Consolidate HomeLayer into a single urgency endpoint

The `ServicesLayer`, `MessagesLayer`, and `AdminLayer` already follow the pattern of a single `/api/*/urgency` endpoint that returns everything needed in one response. HomeLayer should follow suit — a single `/api/dashboard/home` endpoint returning all 7 data shapes eliminates 7 of 8 calls.

**Effort**: New server route (~50 lines) + simplify HomeLayer component (~200 lines removed).

### Priority 3: Invalidation on mutations

When a user posts a message, creates a booking, or responds to an event, add `queryClient.invalidateQueries()` to their mutation success handlers so the dashboard refetches automatically. Currently, navigating away and back re-triggers all fetches from scratch.

**Effort**: One `invalidateQueries` call per mutation handler (~1 line each).

---

## 5. Appendix: Full Endpoint Inventory

| #   | Endpoint                                     | Caller(s)                                | Pattern          | Cached   |
| --- | -------------------------------------------- | ---------------------------------------- | ---------------- | -------- |
| 1   | `/api/messages/unread`                       | HomeLayer, MobileSpaceBar, DirectoryGrid | fetch / useQuery | Partial  |
| 2   | `/api/announcements?priority=urgent`         | HomeLayer                                | fetch            | No       |
| 3   | `/api/announcements?limit=5`                 | HomeLayer                                | fetch            | No       |
| 4   | `/api/announcements?limit=5&priority=normal` | HomeLayer                                | fetch            | No       |
| 5   | `/api/announcements?active=true&limit=5`     | AnnouncementsStreamWidget                | fetch            | No       |
| 6   | `/api/events?upcoming=true&limit=5`          | HomeLayer, EventsWidget                  | fetch            | No       |
| 7   | `/api/maintenance?overdue=true&userId=`      | HomeLayer                                | fetch            | No       |
| 8   | `/api/maintenance?limit=5&scope=mine`        | HomeLayer                                | fetch            | No       |
| 9   | `/api/bookings?date=today`                   | HomeLayer                                | fetch            | No       |
| 10  | `/api/dashboard/stats`                       | DashboardStats                           | useQuery         | Yes      |
| 11  | `/api/services/urgency`                      | ServicesLayer                            | fetch            | No       |
| 12  | `/api/messages/urgency`                      | MessagesLayer                            | fetch            | No       |
| 13  | `/api/admin/urgency`                         | AdminLayer                               | fetch            | No       |
| 14  | `/api/admin/activity`                        | AdminActivityStream                      | fetch            | No       |
| 15  | `/api/conversations?userId=`                 | MessagesWidget (x2)                      | fetch            | No       |
| 16  | `/api/users/[id]`                            | MyHomeSpace, page.tsx                    | fetch            | No       |
| 17  | `/api/agents/marketplace`                    | AgentWidget                              | fetch            | No       |
| 18  | `/api/agents/activity`                       | AgentActivityWidget                      | fetch            | No       |
| 19  | `/api/agents/managed-properties`             | AgentDashboardWidget                     | fetch            | No       |
| 20  | `/api/premium/listings`                      | AgentWidget, PremiumPortfolioWidget      | fetch            | No       |
| 21  | `/api/premium/portfolio`                     | PremiumPortfolioWidget                   | fetch            | No       |
| 22  | `/api/surveys?status=ACTIVE`                 | SurveysWidget                            | fetch            | No       |
| 23  | `/api/competitions?status=ACTIVE`            | CompetitionsWidget                       | fetch            | No       |
| 24  | `/api/user/albums`                           | MyAlbumWidget                            | fetch            | No       |
| 25  | `/api/media`                                 | MyAlbumWidget                            | fetch            | No       |
| 26  | `/api/content?authorId=`                     | UserContentWidget, TagCloudWidget        | fetch            | No       |
| 27  | `https://api.open-meteo.com/...`             | WeatherWidget                            | fetch            | External |

---

# Admin Query Infrastructure Report

**Date:** 2026-06-21
**Status:** 🔴 Critical — 96% of admin data fetches are uncached raw fetch calls

---

## Executive Summary

The admin panel (`/admin` and its ~20 sub-pages + widgets) fires **~50 API calls** across **~25 components**. Only **2 query patterns** use TanStack Query (and only 1 of those is actually consumed by a component). The remaining **~48 calls** use raw `useEffect` + `fetch` with per-component `useState`. The admin panel has **zero cache sharing** between the main dashboard (`AdminLayer`), the admin widgets, and the individual admin sub-pages — even when they all request `/api/users`, `/api/content`, or `/api/groups`.

---

## 1. Current State

### 1.1 Caching Coverage

| Pattern                           | Count | %   |
| --------------------------------- | ----- | --- |
| TanStack Query (`useQuery`)       | 2     | 4%  |
| tRPC (`useQuery` / `useMutation`) | 4     | 8%  |
| Raw `useEffect` + `fetch`         | 44+   | 88% |

The only TanStack Query / tRPC users in admin:

- `AdminStatsWidget` → `useAdminStats()` → `useQuery({ queryKey: ['admin', 'stats'] })` — 60s staleTime
- `useAdminUrgency()` → `useQuery({ queryKey: ['admin', 'urgency'] })` — **exists but NOT used by AdminLayer** (AdminLayer does its own raw fetch)
- `CompetitionList > ParticipantsPanel` → `trpc.competitions.listParticipants.useQuery()`
- `CompetitionList` tRPC mutations: `drawWinners`, `markWinner`, `updateEntry` (with proper invalidation)

### 1.2 Admin Stats: Single Hook, 4 Internal Fetches

`useAdminStats()` (`src/features/admin/model/useAdminStats.ts:47`) fires **4 raw fetches** inside its `queryFn`:

```
/api/users       — to count users
/api/maintenance — to count active requests
/api/groups      — to count groups
/api/content     — to count content
```

These 4 internal calls are not individually cached or deduplicated — only the composite `['admin', 'stats']` key is cached. The raw `fetch` calls inside the `queryFn` bypass all TanStack Query caching, deduplication, and request cancellation.

---

## 2. Duplication Map

### 2.1 `/api/users` — 5 callers (3 independent component trees)

| Component                           | Pattern                   | Cache         |
| ----------------------------------- | ------------------------- | ------------- |
| AdminStatsWidget (via hook)         | `useQuery` → raw `fetch`  | Composite key |
| AdminUserWidget                     | `useEffect` + raw `fetch` | None          |
| UsersListSection / useUsersData     | `useEffect` + raw `fetch` | None          |
| UsersListSection (mutation refresh) | raw `fetch`               | None          |
| UsersListSection (seat ops refresh) | raw `fetch`               | None          |

`AdminUserWidget` and `UsersListSection` both fire `/api/users` on mount. `AdminLayer` loads them simultaneously on the admin dashboard — **3+ identical `/api/users` calls fire in parallel with zero deduplication**.

After any user mutation (edit, suspend, delete), `UsersListSection` re-fetches `/api/users/${id}` to refresh the local state — another uncached call.

### 2.2 `/api/content` — 5 callers

| Component                   | Pattern                   | Cache         |
| --------------------------- | ------------------------- | ------------- |
| AdminStatsWidget (via hook) | `useQuery` → raw `fetch`  | Composite key |
| AdminContentWidget          | `useEffect` + raw `fetch` | None          |
| admin/content/page.tsx      | `useEffect` + raw `fetch` | None          |
| admin/content/[id]/page.tsx | `useEffect` + raw `fetch` | None          |
| admin/content (mutations)   | raw `fetch` DELETE/PATCH  | None          |

`AdminContentWidget` fetches all content items and computes stats locally (published/draft/total). `AdminStatsWidget` also fetches all content (for count only). `admin/content/page.tsx` also fetches all content. **3 full `/api/content` fetches fire on the admin dashboard alone**, each returning the full content list.

### 2.3 `/api/groups` — 3 callers

| Component                   | Pattern                   | Cache         |
| --------------------------- | ------------------------- | ------------- |
| AdminStatsWidget (via hook) | `useQuery` → raw `fetch`  | Composite key |
| admin/groups/page.tsx       | `useEffect` + raw `fetch` | None          |
| admin/groups/[id]/page.tsx  | `useEffect` + raw `fetch` | None          |

### 2.4 `/api/announcements` — 3 callers

| Component                        | Pattern                   | Cache |
| -------------------------------- | ------------------------- | ----- |
| AdminAnnouncementsWidget         | `useEffect` + raw `fetch` | None  |
| useAnnouncements hook            | `useEffect` + raw `fetch` | None  |
| AdminAnnouncementsWidget (retry) | raw `fetch`               | None  |

`AdminAnnouncementsWidget` uses `?limit=5`. `useAnnouncements` uses either `/api/announcements` or `?active=true&limit=N`. Both are uncached. Both can be mounted on the same admin dashboard.

### 2.5 `/api/events` — 3 callers + 2 mutation components

| Component                  | URL                                 | Pattern                   | Cache |
| -------------------------- | ----------------------------------- | ------------------------- | ----- |
| EventsWidget               | `/api/events?limit=5&upcoming=true` | `useEffect` + raw `fetch` | None  |
| EventList                  | `/api/events`                       | `useEffect` + raw `fetch` | None  |
| admin/events/[id]/page.tsx | `/api/events/${id}`                 | `useEffect` + raw `fetch` | None  |
| EventForm                  | `/api/events` POST/PATCH            | raw `fetch` (mutation)    | None  |
| EventForm                  | `/api/events/${id}` DELETE          | raw `fetch` (mutation)    | None  |

### 2.6 `/api/competitions` — 3 callers + 2 mutation components

| Component                           | URL                                | Pattern                   | Cache      |
| ----------------------------------- | ---------------------------------- | ------------------------- | ---------- |
| CompetitionList                     | `/api/competitions`                | `useEffect` + raw `fetch` | None       |
| admin/competitions/[id]/page.tsx    | `/api/competitions/${id}`          | `useEffect` + raw `fetch` | None       |
| CompetitionList > ParticipantsPanel | tRPC `listParticipants.useQuery()` | `useQuery`                | Yes (tRPC) |
| CompetitionForm                     | `/api/competitions` POST/PATCH     | raw `fetch` (mutation)    | None       |
| CompetitionForm                     | `/api/competitions/${id}` DELETE   | raw `fetch` (mutation)    | None       |

Interesting hybrid: `CompetitionList` fetches the competition list via raw fetch, but the participants panel inside it uses tRPC with proper caching.

### 2.7 `/api/admin/activity` — 2 callers

| Component             | URL                                    | Pattern                   | Cache |
| --------------------- | -------------------------------------- | ------------------------- | ----- |
| AdminActivityStream   | `/api/admin/activity?domain=&limit=20` | `useEffect` + raw `fetch` | None  |
| admin/system/page.tsx | `/api/admin/activity?limit=8`          | `useEffect` + raw `fetch` | None  |

Both uncached. Both can fire on admin dashboard mount.

### 2.8 `/api/admin/urgency` — orphaned hook

| Component                 | Pattern                                        | Cache               |
| ------------------------- | ---------------------------------------------- | ------------------- |
| AdminLayer                | `useEffect` + raw `fetch`                      | None                |
| useAdminUrgency (unused!) | `useQuery({ queryKey: ['admin', 'urgency'] })` | Yes (30s staleTime) |

`useAdminUrgency` exists at `src/features/admin/model/useAdminUrgency.ts:5` with proper TanStack Query caching (`staleTime: 30s`). **No component imports or uses it.** `AdminLayer` does its own `useEffect` + raw `fetch` to `/api/admin/urgency`.

### 2.9 `/api/maintenance` — 2 query + 8 mutation patterns

| Component                         | URL Pattern                      | Type          | Cache           |
| --------------------------------- | -------------------------------- | ------------- | --------------- |
| AdminStatsWidget (via hook)       | `/api/maintenance`               | query (count) | Composite (60s) |
| admin/requests/page.tsx           | `/api/maintenance?...`           | query (list)  | None            |
| admin/requests/page.tsx           | `/api/maintenance/${id}/history` | query         | None            |
| admin/requests/page.tsx           | `/api/maintenance/${id}/notes`   | query         | None            |
| admin/requests/page.tsx           | `/api/maintenance/teams`         | query         | None            |
| admin/requests/page.tsx           | `/api/maintenance/providers`     | query         | None            |
| admin/requests/page.tsx           | `/api/maintenance/categories`    | query         | None            |
| admin/requests/analytics/page.tsx | `/api/admin/maintenance-stats`   | query         | None            |
| admin/requests/page.tsx           | multiple PATCH/POST/DELETE       | 8 mutations   | None            |

The requests page alone fires **6 independent queries** on load (maintenance list, history, notes, teams, providers, categories), plus an additional board-members query. None are cached.

---

## 3. Admin Dashboard: ~15 Parallel Fetches on Load

When `/admin` loads, these fetches fire from `AdminLayer` + its embedded widgets:

```
AdminLayer:
  /api/admin/urgency          (raw fetch)

AdminActivityStream:
  /api/admin/activity?domain=all&limit=20   (raw fetch)

AdminStatsWidget (via useAdminStats, TanStack but 4 internal raw fetches):
  /api/users                  (internal raw fetch)
  /api/maintenance            (internal raw fetch)
  /api/groups                 (internal raw fetch)
  /api/content                (internal raw fetch)

AdminUserWidget (if mounted):
  /api/users                  (raw fetch — DUPLICATE)

AdminContentWidget (if mounted):
  /api/content                (raw fetch — DUPLICATE)

AdminAnnouncementsWidget (if mounted):
  /api/announcements?limit=5  (raw fetch)

EventsWidget (if mounted):
  /api/events?limit=5&upcoming=true  (raw fetch)

SurveysWidget (if mounted):
  /api/surveys                (raw fetch)

PageSettingsWidget (if mounted):
  /api/admin/settings/page-flags  (raw fetch)

GroupModerationWidget (if mounted):
  /api/groups/membership-requests?status=PENDING  (raw fetch)

UsersListSection (if mounted):
  /api/users?...              (raw fetch — DUPLICATE)
  /api/invitations            (raw fetch)

CompetitionList (if mounted):
  /api/competitions           (raw fetch)

ResourceList (if mounted):
  /api/resources?...          (raw fetch)
```

Depending on which widgets are configured, the admin page can fire **15–20+ independent fetch calls**, of which at least **3–5 are duplicates** of `/api/users` and `/api/content`.

---

## 4. Missing Cache Invalidation

Every admin mutation (user edit, event delete, competition update, content moderate, announcement create, resource delete, etc.) uses raw `fetch` and manually updates local component `useState`. None of them:

- Call `queryClient.invalidateQueries()` to refresh cached stats
- Call `router.refresh()` systematically (some do, most don't)
- Re-fetch related lists after mutations other than by re-triggering the component's own `useEffect`

This means:

- If `AdminStatsWidget` shows "45 users" and someone deletes a user through `UsersListSection`, the stat stays at 45 until the page is refreshed
- If a competition is created via `CompetitionList`, the `AdminStatsWidget` doesn't know to refresh
- Multiple widgets showing the same data become stale independently

---

## 5. Recommendations

### Priority 1: Fix `AdminLayer` to use the existing `useAdminUrgency` hook

```typescript
// AdminLayer.tsx — replace ~20 lines of useEffect+fetch+useState with:
const { data: urgency, isLoading, isError, refetch } = useAdminUrgency<UrgencyResponse>();
```

**Effort**: ~20 lines removed from AdminLayer, ~5 lines added. Already-written hook is unused.

### Priority 2: Create shared TanStack Query hooks for top-5 duplicated endpoints

```typescript
// src/shared/lib/hooks/useAdminUsers.ts
export function useAdminUsers(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => fetch(`/api/users?${new URLSearchParams(params)}`).then(r => r.json()),
    staleTime: 30_000,
  });
}
```

Create shared hooks for: `useAdminUsers`, `useAdminContent`, `useAdminGroups`, `useAdminEvents`, `useAdminActivity`.

**Effort**: 5 hook files (~20 lines each) + ~15 component updates.

### Priority 3: Alias the 4 raw fetches inside `useAdminStats` to use the new hooks

When `useAdminUsers` exists, `useAdminStats` can import and call it instead of raw `fetch`. This eliminates the "composite key hides internal duplication" problem.

```typescript
// useAdminStats.ts — simplified
async function fetchAdminStats() {
  const users = useAdminUsers(); // gets deduplication for free
  // ...
}
```

### Priority 4: Add `queryClient.invalidateQueries()` to admin mutation handlers

After any create/update/delete mutation in admin, invalidate the relevant query keys:

```typescript
// After user edit:
queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });

// After content creation:
queryClient.invalidateQueries({ queryKey: ['admin', 'content'] });
queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
```

### Priority 5: Consolidate admin/config endpoints

`PageSettingsWidget` hits `/api/admin/settings/page-flags`, `admin/categories` hits `/api/settings?key=interest_categories`, `admin/services` hits `/api/admin/services-config`, `admin/bookings` hits `/api/admin/bookings`, `admin/system` hits `/api/admin/system/health`. These are all configuration reads — consider a single `/api/admin/config` endpoint or at minimum add TanStack Query caching to each with 60s+ staleTime.

---

## 6. Appendix: Full Admin Endpoint Inventory

### 6.1 Query Endpoints (GET)

| #   | Endpoint                                   | Caller(s)                                           | Pattern            | Cached  |
| --- | ------------------------------------------ | --------------------------------------------------- | ------------------ | ------- |
| 1   | `/api/admin/urgency`                       | AdminLayer, useAdminUrgency (unused)                | fetch / useQuery   | Partial |
| 2   | `/api/admin/activity?domain=&limit=20`     | AdminActivityStream                                 | fetch              | No      |
| 3   | `/api/admin/activity?limit=8`              | admin/system/page.tsx                               | fetch              | No      |
| 4   | `/api/admin/system/health`                 | admin/system/page.tsx                               | fetch              | No      |
| 5   | `/api/admin/settings/page-flags`           | PageSettingsWidget                                  | fetch              | No      |
| 6   | `/api/admin/bookings`                      | admin/bookings/page.tsx                             | fetch              | No      |
| 7   | `/api/admin/services-config`               | admin/services/page.tsx                             | fetch              | No      |
| 8   | `/api/admin/board-members`                 | admin/requests/page.tsx                             | fetch              | No      |
| 9   | `/api/admin/maintenance-stats`             | admin/requests/analytics/page.tsx                   | fetch              | No      |
| 10  | `/api/users`                               | AdminStatsWidget, AdminUserWidget, UsersListSection | fetch (×3)         | No (\*) |
| 11  | `/api/users/${id}`                         | UsersListSection (refresh after mutations)          | fetch              | No      |
| 12  | `/api/users/${id}/suspend`                 | UsersListSection                                    | fetch (POST)       | N/A     |
| 13  | `/api/users/${id}/unsuspend`               | UsersListSection                                    | fetch (POST)       | N/A     |
| 14  | `/api/invitations`                         | UsersListSection / useUsersData                     | fetch              | No      |
| 15  | `/api/invitations/${id}`                   | UsersListSection (revoke)                           | fetch (DELETE)     | N/A     |
| 16  | `/api/seats`                               | UsersListSection (allocate/remove)                  | fetch (POST/DEL)   | No      |
| 17  | `/api/content`                             | AdminStatsWidget, AdminContentWidget, admin/content | fetch (×3)         | No (\*) |
| 18  | `/api/content/${id}`                       | admin/content/[id]/page.tsx                         | fetch              | No      |
| 19  | `/api/content/${id}/moderate`              | admin/content/page.tsx                              | fetch (PATCH)      | N/A     |
| 20  | `/api/content/${id}`                       | admin/content/page.tsx (delete)                     | fetch (DELETE)     | N/A     |
| 21  | `/api/groups`                              | AdminStatsWidget, admin/groups/page.tsx             | fetch (×2)         | No (\*) |
| 22  | `/api/groups/${id}`                        | admin/groups/[id]/page.tsx                          | fetch              | No      |
| 23  | `/api/groups/${id}`                        | admin/groups/page.tsx (delete)                      | fetch (DELETE)     | N/A     |
| 24  | `/api/groups/membership-requests?status=`  | GroupModerationWidget                               | fetch              | No      |
| 25  | `/api/groups/membership-requests/${id}`    | GroupModerationWidget                               | fetch (POST)       | N/A     |
| 26  | `/api/events`                              | EventList, HomeLayer (dashboard, also admin)        | fetch (×2)         | No      |
| 27  | `/api/events?limit=5&upcoming=true`        | EventsWidget, HomeLayer (dashboard, also admin)     | fetch (×2)         | No      |
| 28  | `/api/events/${id}`                        | admin/events/[id]/page.tsx                          | fetch              | No      |
| 29  | `/api/events`                              | EventForm (create/update)                           | fetch (POST/PATCH) | N/A     |
| 30  | `/api/events/${id}`                        | EventForm, EventList (delete)                       | fetch (DELETE)     | N/A     |
| 31  | `/api/competitions`                        | CompetitionList                                     | fetch              | No      |
| 32  | `/api/competitions/${id}`                  | admin/competitions/[id]/page.tsx                    | fetch              | No      |
| 33  | `/api/competitions`                        | CompetitionForm (create/update)                     | fetch (POST/PATCH) | N/A     |
| 34  | `/api/competitions/${id}`                  | CompetitionForm, CompetitionList (delete)           | fetch (DELETE)     | N/A     |
| 35  | `trpc.competitions.listParticipants`       | CompetitionList > ParticipantsPanel                 | tRPC useQuery      | Yes     |
| 36  | `trpc.competitions.drawWinners`            | CompetitionList > DrawWinnersModal                  | tRPC mutation      | Yes     |
| 37  | `trpc.competitions.markWinner`             | CompetitionList > AutoSelect/ParticipantsPanel      | tRPC mutation      | Yes     |
| 38  | `trpc.competitions.updateEntry`            | CompetitionList > ParticipantsPanel                 | tRPC mutation      | Yes     |
| 39  | `/api/surveys`                             | SurveysWidget                                       | fetch              | No      |
| 40  | `/api/announcements?limit=5`               | AdminAnnouncementsWidget                            | fetch              | No      |
| 41  | `/api/announcements`                       | useAnnouncements hook / admin/announcements         | fetch              | No      |
| 42  | `/api/announcements/${id}`                 | useAnnouncements (update/delete)                    | fetch (PATCH/DEL)  | N/A     |
| 43  | `/api/resources?...`                       | ResourceList                                        | fetch              | No      |
| 44  | `/api/resources/${id}`                     | ResourceList (expand details)                       | fetch              | No      |
| 45  | `/api/resources/${id}/download`            | ResourceList (download count)                       | fetch (POST)       | N/A     |
| 46  | `/api/resources/${id}`                     | ResourceList, ResourceForm (delete)                 | fetch (DELETE)     | N/A     |
| 47  | `/api/upload`                              | ResourceForm                                        | fetch (POST)       | N/A     |
| 48  | `/api/resources`                           | ResourceForm (create/update)                        | fetch (POST/PATCH) | N/A     |
| 49  | `/api/maintenance?params`                  | admin/requests/page.tsx                             | fetch              | No      |
| 50  | `/api/maintenance/${id}/history`           | admin/requests/page.tsx                             | fetch              | No      |
| 51  | `/api/maintenance/${id}/notes`             | admin/requests/page.tsx                             | fetch              | No      |
| 52  | `/api/maintenance/teams`                   | admin/requests/page.tsx                             | fetch              | No      |
| 53  | `/api/maintenance/providers`               | admin/requests/page.tsx                             | fetch              | No      |
| 54  | `/api/maintenance/categories`              | admin/requests/page.tsx                             | fetch              | No      |
| 55  | `/api/maintenance/${id}` PATCH             | admin/requests/page.tsx (8 mutation variants)       | fetch (PATCH)      | N/A     |
| 56  | `/api/maintenance/${id}/assign` POST       | admin/requests/page.tsx                             | fetch (POST)       | N/A     |
| 57  | `/api/maintenance/${id}/notify` POST       | admin/requests/page.tsx                             | fetch (POST)       | N/A     |
| 58  | `/api/maintenance/categories` POST         | admin/requests/page.tsx                             | fetch (POST)       | N/A     |
| 59  | `/api/maintenance/categories/${id}` PATCH  | admin/requests/page.tsx                             | fetch (PATCH)      | N/A     |
| 60  | `/api/maintenance/categories/${id}` DELETE | admin/requests/page.tsx                             | fetch (DELETE)     | N/A     |
| 61  | `/api/external-surveys`                    | admin/external-surveys/page.tsx                     | fetch              | No      |
| 62  | `/api/settings?key=interest_categories`    | admin/categories/page.tsx                           | fetch              | No      |
| 63  | `/api/settings` POST                       | admin/categories/page.tsx                           | fetch (POST)       | N/A     |
| 64  | `/api/households?...`                      | admin/households/page.tsx                           | fetch              | No      |

(\*) `AdminStatsWidget` uses `useQuery` but fires raw `fetch` inside queryFn — only the composite result is cached, not the individual endpoints.

### 6.2 Caching Summary

| Category              | Count | %   |
| --------------------- | ----- | --- |
| tRPC `useQuery`       | 1     | 2%  |
| tRPC mutations        | 3     | 5%  |
| `useQuery` (TanStack) | 2     | 3%  |
| Raw fetch queries     | 41    | 71% |
| Raw fetch mutations   | 14    | 24% |

**Overall caching coverage: ~5%** (5 cached queries out of ~60 total fetch calls in the admin tree)

### 6.3 Admin-only Widgets vs Pages: Same Data, Zero Sharing

| Data          | Dashboard Widget               | Admin Page                   | Shared cache? |
| ------------- | ------------------------------ | ---------------------------- | ------------- |
| Users         | AdminUserWidget, AdminStats    | UsersListSection             | No            |
| Content       | AdminContentWidget, AdminStats | admin/content/page.tsx       | No            |
| Events        | EventsWidget                   | admin/events → EventList     | No            |
| Groups        | AdminStats                     | admin/groups/page.tsx        | No            |
| Announcements | AdminAnnouncementsWidget       | admin/announcements/page.tsx | No            |
| Competitions  | CompetitionList                | admin/competitions/page.tsx  | No            |
| Resources     | ResourceList                   | admin/resources/page.tsx     | No            |
| Surveys       | SurveysWidget                  | admin/surveys/page.tsx       | No            |

Each widget is a separate component tree with its own `useState` + raw fetch. Each admin sub-page is also a separate component tree with its own `useState` + raw fetch. None share data, even when displaying the same list.
