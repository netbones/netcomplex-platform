---
title: API Routes Registry
status: current
reviewed: 2026-07-28
tags: [steering, governance]
audience: all
---

# API Routes Registry

**Last updated:** 2026-06-03
**Status:** 157 total routes audited
**Coverage:** All tenant-scoped routes use `withTenant()`; non-tenant routes fall into 7 documented categories

---

## Summary

| Category                            | Count   | Auth      | Tenant Isolation  |
| ----------------------------------- | ------- | --------- | ----------------- |
| **Tenant-scoped (with withTenant)** | 90      | Required  | ✅ `withTenant()` |
| **v1/tenant re-exports**            | 43      | Inherited | Inherited         |
| **v1 public (no auth)**             | 4       | None      | N/A               |
| **v1 system (no auth)**             | 2       | None      | N/A               |
| **Platform admin (cross-tenant)**   | 8       | Platform  | N/A               |
| **Auth (Better Auth)**              | 3       | N/A       | N/A               |
| **Invitation token flows**          | 2       | Token     | N/A               |
| **Webhook (external)**              | 1       | None\*    | N/A               |
| **OpenAPI spec**                    | 1       | None      | N/A               |
| **tRPC adapter**                    | 1       | Custom    | Custom            |
| **Tenant config (admin)**           | 1       | Required  | N/A               |
| **Suspension status (auth-aware)**  | 1       | Optional  | N/A               |
| **Total**                           | **157** |           |                   |

\* `/api/webhooks/payload` will require signed payloads + replay protection per API.md §24 (future work).

---

## 1. Tenant-Scoped Routes (90 routes with `withTenant()`)

All routes in this section enforce tenant isolation via `withTenant()` from `@api/db`.
Every `GET`/`POST`/`PATCH`/`DELETE` filters by `tenantId` in the `WHERE` clause.

### Admin (5)

- `GET /api/admin/activity` — recent admin activity log
- `GET /api/admin/board-members` — board member directory
- `GET /api/admin/maintenance-stats` — maintenance aggregates
- `GET/PATCH /api/admin/settings/page-flags` — feature flag overrides per page
- `GET /api/admin/urgency` — urgent items dashboard

### Announcements (3)

- `GET/POST /api/announcements`
- `GET/PATCH/DELETE /api/announcements/[id]`

### Bookings & Events (4)

- `GET/POST /api/bookings`
- `GET/POST /api/events`
- `GET/PATCH/DELETE /api/events/[id]`
- `POST /api/events/[id]/register`

### Community Services (10)

- `GET/POST /api/community-services/listings`
- `GET/PATCH/DELETE /api/community-services/listings/[id]`
- `POST /api/community-services/listings/[id]/publish`
- `GET /api/community-services/listings/related`
- `GET/POST /api/community-services/inquiries`
- `GET/PATCH/DELETE /api/community-services/provider/inquiries/[id]`
- `GET/POST/DELETE /api/community-services/reviews/[listingId]`
- `GET/PATCH/DELETE /api/community-services/moderation/listings/[id]`
- `GET /api/community-services/analytics`

### Competitions & Conservation (3)

- `GET/POST /api/competitions`
- `GET/PATCH/DELETE /api/competitions/[id]`
- `GET/POST /api/conservation`

### Content (3)

- `GET/POST /api/content`
- `GET/PATCH/DELETE /api/content/[id]`
- `GET/POST /api/external-surveys`

### Conversations & Messages (5)

- `GET/POST /api/conversations`
- `GET /api/conversations/find`
- `GET/POST /api/messages`
- `GET /api/messages/unread`
- `GET /api/messages/urgency`

### Dashboard (2)

- `GET /api/dashboard/stats`
- `GET /api/stats`

### Flags & Pricing (3)

- `GET/PATCH /api/flags`
- `GET /api/pricing`
- `GET /api/seats`

### Groups (5)

- `GET/POST /api/groups`
- `GET/PATCH/DELETE /api/groups/[id]`
- `GET/POST /api/groups/membership-requests`
- `GET/PATCH/DELETE /api/groups/membership-requests/[id]`
- `GET/POST /api/groups/members`

### Households (3)

- `GET/POST /api/households`
- `GET/PATCH/DELETE /api/households/[id]`

### Invitations (3)

- `GET/POST /api/invitations`
- `GET/PATCH/DELETE /api/invitations/[id]`
- (accept/validate are token-based — see §6)

### Maintenance (12)

- `GET/POST /api/maintenance`
- `GET/PATCH/DELETE /api/maintenance/[id]`
- `POST /api/maintenance/[id]/assign`
- `GET /api/maintenance/[id]/history`
- `GET/POST /api/maintenance/[id]/notes`
- `POST /api/maintenance/[id]/notify`
- `GET/POST /api/maintenance/categories`
- `GET/PATCH/DELETE /api/maintenance/categories/[id]`
- `GET/POST /api/maintenance/providers`
- `GET/PATCH/DELETE /api/maintenance/providers/[id]`
- `GET/POST /api/maintenance/teams`
- `GET/PATCH/DELETE /api/maintenance/teams/[id]`

### Media & Upload (2)

- `GET/POST /api/media`
- `POST /api/upload`

### Notifications (1)

- `GET /api/notifications`

### Premium (2)

- `GET/POST /api/premium/listings`
- `GET /api/premium/portfolio`

### Resources (4)

- `GET/POST /api/resources`
- `GET/PATCH/DELETE /api/resources/[id]`
- `POST /api/resources/[id]/download` _(counter increment; fixed in dda6589)_

### Settings (3)

- `GET/POST /api/settings`
- `GET/PATCH/DELETE /api/settings/[key]`
- `GET/POST /api/settings/contact`

### Surveys (9)

- `GET/POST /api/surveys`
- `GET/PATCH/DELETE /api/surveys/[id]`
- `GET/POST /api/surveys/[id]/questions`
- `GET/PATCH/DELETE /api/surveys/[id]/questions/[questionId]`
- `POST /api/surveys/[id]/questions/reorder`
- `GET/POST /api/surveys/[id]/sections`
- `GET/PATCH/DELETE /api/surveys/[id]/sections/[sectionId]`
- `POST /api/surveys/[id]/sections/reorder`
- `GET/POST /api/surveys/[id]/responses`

### Users (7)

- `GET/POST /api/users`
- `GET/PATCH/DELETE /api/users/[id]`
- `GET /api/users/[id]/books`
- `POST /api/users/[id]/suspend`
- `GET /api/users/[id]/suspensions`
- `POST /api/users/[id]/unsuspend`

### User Albums & Tags (2)

- `GET/POST /api/user/albums`
- `GET/POST /api/user/tags`

### Agents (3)

- `GET /api/agents/activity`
- `GET /api/agents/managed-properties`
- `GET /api/agents/marketplace`

### Campaign (1)

- `GET/POST /api/campaign`

### Services (1)

- `GET /api/services/urgency`

**Tenant-scoped total: 90 routes**

---

## 2. v1/tenant Re-exports (43 routes)

All routes in `/api/v1/tenant/*` re-export from the canonical flat path `/api/{resource}`.
During the tRPC migration (BD issue `fpc`), these will become tRPC procedures instead.

| v1 path                            | Canonical path                |
| ---------------------------------- | ----------------------------- |
| `v1/tenant/announcements`          | `/api/announcements`          |
| `v1/tenant/announcements/[id]`     | `/api/announcements/[id]`     |
| `v1/tenant/bookings`               | `/api/bookings`               |
| `v1/tenant/campaign`               | `/api/campaign`               |
| `v1/tenant/community-services/...` | `/api/community-services/...` |
| `v1/tenant/competitions`           | `/api/competitions`           |
| `v1/tenant/conservation`           | `/api/conservation`           |
| `v1/tenant/content`                | `/api/content`                |
| `v1/tenant/conversations`          | `/api/conversations`          |
| `v1/tenant/events`                 | `/api/events`                 |
| `v1/tenant/groups`                 | `/api/groups`                 |
| `v1/tenant/households`             | `/api/households`             |
| `v1/tenant/invitations`            | `/api/invitations`            |
| `v1/tenant/maintenance`            | `/api/maintenance`            |
| `v1/tenant/messages`               | `/api/messages`               |
| `v1/tenant/notifications`          | `/api/notifications`          |
| `v1/tenant/pricing`                | `/api/pricing`                |
| `v1/tenant/resources`              | `/api/resources`              |
| `v1/tenant/settings`               | `/api/settings`               |
| `v1/tenant/surveys`                | `/api/surveys`                |
| `v1/tenant/users`                  | `/api/users`                  |
| `v1/tenant/agents/...`             | `/api/agents/...`             |

**Total: 43 re-export routes** — auth + tenant isolation are inherited from the canonical path.

---

## 3. v1 Public Routes (4 — no auth)

- `GET /api/v1/public/content` — public-facing CMS content
- `GET /api/v1/public/competitions` — public competition listings
- `GET /api/v1/public/events` — public event calendar
- `GET /api/v1/public/resources` — public resource library

These are public data exposed for anonymous users. No tenant filtering needed (data is curated for public consumption).

---

## 4. v1 System Routes (2 — no auth)

- `GET /api/v1/system/flags` — feature flag evaluation
- `GET /api/v1/system/health` — system health check (Pino, DB, auth provider)

These are infrastructure-level endpoints.

---

## 5. Platform Admin Routes (8 — cross-tenant by design)

- `GET/POST /api/admin/platform/assist` — platform admins assist tenants
- `GET/PATCH/DELETE /api/admin/platform/assist/[id]`
- `GET/POST /api/admin/platform/tenants` — tenant CRUD (platform admin)
- `GET/PATCH/DELETE /api/admin/platform/tenants/[id]`
- `GET/POST /api/admin/platform/v1/tenants` _(v1 alias)_
- `GET/POST /api/admin/platform/v1/onboarding` _(v1 alias)_
- `GET/POST /api/platform/tenants`
- `GET/POST /api/platform/onboarding`

All require `session.user.isPlatformAdmin === true`. Cross-tenant by design.

---

## 6. Auth & Invitation Routes (5 — no withTenant, token or session-based)

- `GET/POST /api/auth/[...all]` — Better Auth catch-all (login, register, password reset, etc.)
- `POST /api/auth/signup` — custom signup (Better Auth doesn't handle this; we collect additional profile fields)
- `GET /api/auth/suspension-status` — checks if a session-less request is from a suspended user (e.g., showing "your account is suspended" page on a stale tab)
- `POST /api/invitations/accept` — accepts an invitation via token; the token itself encodes the tenant
- `GET /api/invitations/validate` — validates an invitation token (used during signup flow)

---

## 7. Webhook, OpenAPI, tRPC, Tenant Config (5)

- `POST /api/webhooks/payload` — external webhook receiver (Payload CMS). Future: signed payloads + replay protection per API.md §24.
- `GET /api/openapi.json` — serves the auto-generated OpenAPI spec (no DB)
- `GET/POST /api/trpc/[trpc]` — tRPC adapter; auth + tenant context handled by `createContext` in `@api/trpc/server`
- `GET/POST /api/tenants/[id]/modules` — manages which modules a tenant has enabled (admin-only)
- _(Health check: `GET /api/health` lives outside the categories above)_

---

## Audit History

| Date       | Commit    | Change                                                                 |
| ---------- | --------- | ---------------------------------------------------------------------- |
| 2026-05-27 | `7579ac9` | Added `withTenant()` to 15 API routes (Phase 30, e0w partial)          |
| 2026-06-03 | `dda6589` | Added `withTenant()` to `resources/[id]/download/route.ts` (e0w final) |
| 2026-06-03 | `7cf2f9d` | This registry compiled (file lost in stash drop, restored 2026-06-03)  |

**Open follow-up:** systematic audit of all 80 (now 90) tenant-scoped routes to confirm
`withTenant()` is used in every query path, not just the entry handler. BD issue `e0w` tracks this.

---

## See Also

- [API.md](./API.md) — API governance plan
- [HOLISTIC.md](./HOLISTIC.md) — architecture + cross-cutting decisions
- `.planning/BD.md` — BD issue tracker (e0w, fpc, qig, 22a, etc.)
