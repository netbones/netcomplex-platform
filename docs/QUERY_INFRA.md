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
