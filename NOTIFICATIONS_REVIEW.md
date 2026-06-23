# Notifications System Review

**System:** In-App Notifications + Email  
**Documented:** 2026-06-23 by GSD Review  
**BD Tracking:** `soralia-village-oi9x`  
**Last Updated:** 2026-06-23 — P1–P2 items + schema hardening applied

---

## Executive Summary

The notification system is a **basic but functional in-app notification layer** with opt-in email delivery. Schema has been hardened (enum types, `payload` JSONB, `readAt`, `senderId`), a `DELETE` endpoint added, and dashboard polling implemented. Still missing: notification preferences, real-time delivery (SSE/WebSocket), queued emails, and richer frontend UX.

---

## 1. Schema & Data Model

### 1.1 Notifications Table (`notifications`)

- **Fields:** `id`, `tenantId`, `userId`, `title`, `message`, `type`, `link`, `read`, `createdAt`, `deletedAt`
- **Soft-delete:** Yes, via `deletedAt`
- **Relations:** Many-to-one with `users`

### 1.2 Key Gaps

- ~~**`type` is a string, not an enum** — Prone to typos, cannot enforce valid values at DB level~~ ✅ **Fixed** — Now `NotificationType` enum (`info`, `warning`, `success`, `error`)
- ~~**No `payload` or `metadata` field** — Cannot carry structured data (e.g., ticket ID, event details)~~ ✅ **Added** — `payload` JSONB
- ~~**No `senderId` or `actor` field** — Cannot attribute notifications to triggering users~~ ✅ **Added** — `senderId`
- ~~**`read` is a boolean, not a timestamp** — Cannot calculate "time to read" metrics~~ ✅ **Added** — `readAt` timestamp (alongside `read` boolean)
- **No `priority` field** — All notifications treated equally
- **No `deliveryStatus` field** — Cannot track if email was sent, bounced, or failed

---

## 2. API Surface

### 2.1 Endpoints

- `GET /api/notifications` — List notifications (up to 50), supports `?unread=true`
- `POST /api/notifications` — Create notification, optionally sends email
- `PATCH /api/notifications` — Mark single as read OR mark all as read
- `GET /api/v1/tenant/notifications` — Alias for future tRPC migration

### 2.2 Issues

- ~~**No `DELETE` endpoint** — Users cannot dismiss individual notifications~~ ✅ **Added** — `DELETE /api/notifications/[id]`
- **No `PUT` for idempotency** — Cannot upsert by external ID, risks duplicates
- **Paginated but no cursor-based pagination** — Offset/limit not implemented; hard 50-item cap
- **No bulk `PATCH` for selective read** — Can only mark ALL or ONE, not a subset
- **Mark-all-read is not atomic** — Race condition if new notifications arrive during the operation
- **No server-sent events (SSE) or WebSocket** — Frontend must poll

---

## 3. Email Integration

### 3.1 Current Flow

- `POST /api/notifications` accepts `sendEmail: true`
- Checks user preference (`showEmail` flag on User model)
- Sends via `emailNotification` template (MailerSend)

### 3.2 Issues

- **`showEmail` is a proxy, not a notification preference** — No per-type opt-in/out (e.g., "email me for maintenance, not for chat")
- **No queuing or retry logic** — If MailerSend fails, the notification is lost
- **No delivery tracking** — Cannot confirm if email was delivered, opened, or bounced
- **Template is generic HTML** — No dynamic content based on notification type
- **No fallback to SMS** — For critical alerts (e.g., emergency maintenance)

---

## 4. Frontend

### 4.1 Components

- `/notifications` page (full list with filters)
- `NotificationsWidget` (dashboard card)
- `DashboardStats` (includes unread count)
- Blue indicator dot on unread items

### 4.2 Issues

- ~~**No real-time badge update** — Unread count is stale until page refresh (no polling, no SSE)~~ ✅ **Added** — 30s polling on `NotificationsWidget`
- **No toast on new notification** — User must navigate to `/notifications` to see new items
- **No grouping/threading** — All notifications are a flat list
- **No swipe/dismiss on mobile** — Poor UX for clearing items
- **No empty state animation** — Static "No new notifications" text

---

## 5. Real-Time & Delivery

### 5.1 Current State

- ~~**No WebSocket, no SSE, no polling** — Frontend is entirely passive~~ ✅ **Polling added** — `NotificationsWidget` polls every 30s
- **ISR cache for stats** — `getDashboardStats` uses `unstable_cache`, but cache invalidation is manual
- **Supabase Realtime is not used** — Despite being in the tech stack

### 5.2 Recommended Priorities

1. **Polling fallback** — Simple `setInterval` on the notifications page/widget
2. **Supabase Realtime channel** — Subscribe to `notifications` table changes
3. **SSE endpoint** — `/api/notifications/stream` for authenticated clients
4. **Push notifications (Phase 2)** — Service worker + web push

---

## 6. Testing

- `src/test/api/notifications.test.ts` — Covers GET, POST, PATCH
- **Missing:**
  - No tests for email delivery path
  - No tests for rate limiting
  - No tests for `unread=true` filter
  - No tests for soft-delete behavior
  - No frontend component tests

---

## 7. Security & Rate Limiting

- `middleware.ts` protects `/notifications` as a tenant route
- Rate limit: 60 req/min per user on notification endpoints
- **Concerns:**
  - No validation that `userId` in notification body matches authenticated user (IDOR risk)
  - No rate limit on email sends separately from API calls
  - No audit logging of notification delivery

---

## 8. i18n & Accessibility

- Translation strings exist in `public/locales/` for `en`, `xh`, `Evidence:`zu`, `af`
- **Concerns:**
  - Notification `title` and `message` are stored in English in DB, not localized at render time
  - No ARIA live region for screen readers to announce new notifications
  - No keyboard shortcut to open notifications panel

---

## 9. Findings & Recommendations

### 9.1 Data Model

1. **Migrate `type` to enum** — DB-level enforcement, prevent typos
2. **Add `payload` JSONB field** — Carry structured data without schema changes
3. **Add `senderId` and `priority`** — Attribution and tiered handling
4. **Change `read` to `readAt` timestamp** — Analytics and metrics
5. **Add `deliveryStatus` enum** — `PENDING`, `SENT`, `DELIVERED`, `FAILED`

### 9.2 API

6. **Add `DELETE /api/notifications/[id]`** — Allow users to dismiss
7. **Add `PUT /api/notifications` with idempotency key** — Prevent duplicates
8. **Add bulk `PATCH` for selective read** — Accept array of IDs
9. **Add polling endpoint or SSE stream** — `/api/notifications/stream`

### 9.3 Email & Delivery

10. **Build notification preferences page** — Per-type, per-channel toggles
11. **Queue email sends** — Use a job queue or at-least-once delivery
12. **Track delivery status** — Update `deliveryStatus` on callback/webhook

### 9.4 Frontend

13. **Auto-poll unread count** — Every 30s on dashboard, every 10s on notifications page
14. **Toast new notifications** — Trigger toast via polling or SSE
15. **Group by date/type** — Collapse old notifications, group by category

---

## 10. Priority Action Items

| Priority | Item                                             | Effort | Status        |
| -------- | ------------------------------------------------ | ------ | ------------- |
| ✅ Done  | P1: Add `DELETE` endpoint for dismissing         | 1h     | ✅ 2026-06-23 |
| ✅ Done  | P1: Add polling to frontend (unread count)       | 2h     | ✅ 2026-06-23 |
| ✅ Done  | P2: Migrate `type` to enum + add `payload` JSONB | 3h     | ✅ 2026-06-23 |
| ✅ Done  | P2: Add `readAt` timestamp                       | 1h     | ✅ 2026-06-23 |
| ✅ Done  | P3: Add `senderId` for attribution               | 0.5h   | ✅ 2026-06-23 |
| P2       | Build notification preferences page              | 4h     |               |
| P3       | Implement Supabase Realtime subscription         | 3h     |               |
| P3       | Queue email sends with retry                     | 4h     |               |
| P3       | Add bulk read endpoint                           | 2h     |               |
| P3       | Add `PUT` with idempotency key                   | 2h     |               |
| P3       | ARIA live region + keyboard shortcut             | 2h     |               |

### Implementation Notes

**Schema hardening:** `type` now uses `NotificationType` enum (`info`/`warning`/`success`/`error`). Added `payload` JSONB for structured data, `senderId` for attribution, `readAt` timestamp (non-breaking, alongside `read` boolean). Migration applied: `20260623095534_add_notification_type_enum_payload_readat_senderid`.

**DELETE endpoint:** `DELETE /api/notifications/[id]` — soft-deletes (sets `deletedAt`). Owner-scoped (only the notification recipient can dismiss).

**PATCH readAt:** `PATCH /api/notifications` now sets `readAt: now()` alongside `read: true`.

**Frontend polling:** `NotificationsWidget` polls `GET /api/notifications?unread=true` every 30 seconds. Falls back gracefully on error.

**Remaining P2:** Notification preferences page (per-type, per-channel opt-in). Candidate for next phase.

---

## 11. Cross-References

- `src/app/api/notifications/route.ts` — Core API
- `src/app/notifications/page.tsx` — UI page
- `src/widgets/dashboard/ui/NotificationsWidget.tsx` — Dashboard widget
- `src/shared/api/email/templates.ts` — Email templates
- `src/shared/api/revalidation.ts` — ISR cache tags
- `docs/features/notifications-research.md` — Architecture research
- `.planning/phases/10-email-notifications/` — Phase 10 artifacts
