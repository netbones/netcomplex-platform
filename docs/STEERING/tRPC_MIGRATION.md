---
title: tRPC Migration Status
status: current
reviewed: 2026-07-28
tags: [steering, governance]
audience: all
---

# tRPC Migration Status

**Last updated:** 2026-07-16 (verified live/dead routes)
**Status:** Active tracking document — 6/8 migrations complete
**Applies To:** All REST routes in `src/app/api/` and tRPC routers in `src/server/routers/`
**Related:** `API.md`, `tRPC.md`, `API_ROUTES.md`

---

## Summary

| Category                | Count                    |
| ----------------------- | ------------------------ |
| Fully covered by tRPC   | 26 domains (~132 routes) |
| Candidate for migration | 2 domains (~25 routes)   |
| Permanent REST          | ~70 routes               |
| Total REST route files  | 208                      |
| tRPC routers deployed   | 20 (34 files)            |

---

## ✅ Fully Covered by tRPC (Frontend Not Yet Migrated)

These domains have comprehensive tRPC routers, but **the frontend still calls REST endpoints** via `fetch()`. No tRPC adoption has happened except `trpc.marketplace.listListings` and a handful of `trpc.identity.*` procedures. Each domain needs frontend migration before its REST routes can be removed.

| Domain                | Router(s)                                               | REST status                           |
| --------------------- | ------------------------------------------------------- | ------------------------------------- |
| Competitions          | `competitions.ts`                                       | LIVE — frontend uses REST via fetch() |
| Content               | `content.ts`                                            | LIVE — frontend uses REST via fetch() |
| Events                | `events.ts`                                             | LIVE — frontend uses REST via fetch() |
| Bookings              | `bookings.ts`                                           | LIVE — frontend uses REST via fetch() |
| Groups                | `groups.ts`                                             | LIVE — frontend uses REST via fetch() |
| Disputes              | `disputes.ts`                                           | LIVE — frontend uses REST via fetch() |
| Chat/Messages         | `chat.ts`, `chat/conversations.ts`, `chat/messaging.ts` | LIVE — frontend uses REST via fetch() |
| Resources             | `resources.ts`                                          | LIVE — frontend uses REST via fetch() |
| Notifications         | `notifications.ts`                                      | LIVE — frontend uses REST via fetch() |
| Maintenance           | `maintenance.ts`, `maintenance/*` (4 sub-routers)       | LIVE — frontend uses REST via fetch() |
| Surveys               | `surveys.ts`, `surveys/*` (4 sub-routers)               | LIVE — frontend uses REST via fetch() |
| DWallet               | `dwallet.ts`                                            | LIVE — frontend uses REST via fetch() |
| Merits                | `merits.ts`                                             | LIVE — frontend uses REST via fetch() |
| Identity/Users        | `identity.ts`                                           | LIVE — frontend uses REST via fetch() |
| Marketplace/Comm Svcs | `marketplace.ts`, `marketplace/*` (8 sub-routers)       | LIVE — frontend uses REST via fetch() |
| Achievements          | `achievements.ts`                                       | LIVE — frontend uses REST via fetch() |
| Agents                | `agents.ts`                                             | LIVE — frontend uses REST via fetch() |
| Invitations           | `invitations.ts`                                        | LIVE — frontend uses REST via fetch() |
| Settings              | `settings.ts`                                           | LIVE — frontend uses REST via fetch() |
| Dashboard Stats       | `identity.ts` (stats procedures)                        | LIVE — frontend uses REST via fetch() |

**Deleted REST routes (confirmed dead):**

- `src/app/api/marketplace/checkout/route.ts` — tRPC equivalent in `marketplace/checkout.ts`
- `src/app/api/marketplace/webhook/route.ts` — tRPC equivalent in `marketplace/checkout.ts`

> **Action:** For each domain above, migrate frontend `fetch()` calls to `trpc.<domain>.*` hooks, then delete the REST route files.

---

## 🔄 Candidates for Migration

Priority tiers based on usage frequency, complexity, and business value.

### P2 — Medium Priority ✅ DONE

### P3 — Lower Priority (large effort)

| Domain                   | REST Routes | Effort | Notes                                                      |
| ------------------------ | ----------- | ------ | ---------------------------------------------------------- |
| **Providers**            | ~20 files   | Large  | Registration, billing, reputation, verification, analytics |
| **Platform/Tenant Mgmt** | ~5 files    | Medium | Onboarding, tenant CRUD, modules                           |

---

## 🚫 Permanent REST

These routes stay as REST intentionally. Do not migrate.

### Infrastructure / System

| Route                                        | Reason                     |
| -------------------------------------------- | -------------------------- |
| `src/app/api/health/route.ts`                | Infrastructure probe       |
| `src/app/api/purge/route.ts`                 | Cache purge (CDN/internal) |
| `src/app/api/flags/route.ts`                 | Feature flags (edge-light) |
| `src/app/api/gate/context/route.ts`          | Gate context middleware    |
| `src/app/api/translate/route.ts`             | AI service proxy           |
| `src/app/api/cron/ai-pool-rollover/route.ts` | Internal scheduled task    |

### Auth (Better Auth)

| Route                                         | Reason                           |
| --------------------------------------------- | -------------------------------- |
| `src/app/api/auth/[...all]/route.ts`          | Better Auth manages its own flow |
| `src/app/api/auth/signup/route.ts`            | Better Auth flow                 |
| `src/app/api/auth/suspension-status/route.ts` | Auth-aware check                 |

### Payments (third-party)

| Route                                            | Reason           |
| ------------------------------------------------ | ---------------- |
| `src/app/api/payments/paypal/capture/route.ts`   | SSP callback     |
| `src/app/api/payments/paypal/webhook/route.ts`   | Webhook receiver |
| `src/app/api/payments/paystack/verify/route.ts`  | SSP callback     |
| `src/app/api/payments/paystack/webhook/route.ts` | Webhook receiver |

### Media / Upload

| Route                         | Reason              |
| ----------------------------- | ------------------- |
| `src/app/api/media/route.ts`  | File I/O, multipart |
| `src/app/api/upload/route.ts` | File I/O, multipart |

### Webhooks

| Route                                   | Reason                    |
| --------------------------------------- | ------------------------- |
| `src/app/api/webhooks/payload/route.ts` | External payload receiver |

### OpenAPI / tRPC Adapter

| Route                               | Reason                        |
| ----------------------------------- | ----------------------------- |
| `src/app/api/trpc/[trpc]/route.ts`  | The tRPC HTTP endpoint itself |
| `src/app/api/openapi.json/route.ts` | Static generated spec         |

### Admin Routes (~40 files under `src/app/api/admin/`)

All admin routes are permanent REST. Admin-only UI pages access these directly.
The admin surface is a different trust boundary — direct DB access patterns are acceptable.

Key admin domains:

- Activity, Analytics, Board members, Bookings, DWallet (batches/payouts/streams)
- Maintenance stats, Media, Merits recalculate
- Platform management (AI pool, Assist, Billing, Tenants)
- Providers (approve/reject/suspend/verify/due-diligence)
- Revenue, Services config, Settings (hero carousel, page flags)
- System health, Transactions, Urgency

### V1 Legacy Re-exports (~43 routes under `src/app/api/v1/`)

These are the external-facing OpenAPI surface. They stay REST by design per ADR-021.
They delegate to internal tRPC or flat REST handlers.

---

## Migration Progress

| Domain                | Status         | PR / Commit                                    | Date       |
| --------------------- | -------------- | ---------------------------------------------- | ---------- |
| Competitions          | ✅ Complete    |                                                |            |
| Content               | ✅ Complete    |                                                |            |
| Events                | ✅ Complete    |                                                |            |
| Bookings              | ✅ Complete    |                                                |            |
| Groups                | ✅ Complete    |                                                |            |
| Disputes              | ✅ Complete    |                                                |            |
| Chat/Messages         | ✅ Complete    |                                                |            |
| Resources             | ✅ Complete    |                                                |            |
| Notifications         | ✅ Complete    |                                                |            |
| Maintenance           | ✅ Complete    |                                                |            |
| Surveys               | ✅ Complete    |                                                |            |
| DWallet               | ✅ Complete    |                                                |            |
| Merits                | ✅ Complete    |                                                |            |
| Identity/Users        | ✅ Complete    |                                                |            |
| Marketplace/Comm Svcs | ✅ Complete    | Deleted dead REST checkout/webhook routes      | 2026-07-16 |
| Achievements          | ✅ Complete    |                                                |            |
| Agents                | ✅ Complete    |                                                |            |
| Invitations           | ✅ Complete    |                                                |            |
| Settings              | ✅ Complete    |                                                |            |
| Dashboard Stats       | ✅ Complete    |                                                |            |
| Conservation          | ✅ Complete    | Migrated to `content.getConservationPage`      | 2026-07-07 |
| Campaign              | ✅ Complete    | Migrated to `content.getCampaignPage`          | 2026-07-07 |
| External Surveys      | ✅ Complete    | Added CRUD procedures to `surveys/external.ts` | 2026-07-07 |
| Households/Properties | ✅ Complete    | New `households.ts` router (9 procedures)      | 2026-07-07 |
| Education             | ✅ Complete    | New `education.ts` router (15 procedures)      | 2026-07-07 |
| Delegations           | ✅ Complete    | New `delegations.ts` router (6 procedures)     | 2026-07-07 |
| Providers             | ⬜ Not started |                                                |            |
| Platform/Tenant Mgmt  | ⬜ Not started |                                                |            |

---

## Dead Code Cleanup

As of 2026-07-16, a cross-domain trace confirmed that **nearly all REST routes are still live** — frontend code continues to call them via `fetch()`. Only `marketplace/checkout` and `marketplace/webhook` were dead (tRPC equivalents existed and no frontend callers).

For each future domain migration:

1. Migrate frontend `fetch()` calls to `trpc.<domain>.*` hooks
2. Verify no remaining callers (search `'/api/<domain>'` in `src/`)
3. Delete REST route files
4. Remove from `API_ROUTES.md`
5. Add commit reference above

---

## How to Migrate

1. Create a new tRPC router in `src/server/routers/` following `tRPC.md` conventions
2. Wire procedure tiers from `src/shared/api/trpc/server.ts` (`protectedProcedure`, `tenantProcedure`, etc.)
3. Add OpenAPI meta annotations for external-facing procedures
4. Update frontend calls to use `@trpc/react-query` hooks
5. Delete the old REST route file
6. Update `API_ROUTES.md` and this document
7. Run `pnpm api:generate && pnpm api:lint` to validate OpenAPI spec
