# tRPC Migration Status

**Last updated:** 2026-07-07 (P1+P2 completed)
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
| Total REST route files  | 210                      |
| tRPC routers deployed   | 20 (34 files)            |

---

## ✅ Fully Covered by tRPC

These domains have comprehensive tRPC routers. No further migration work needed.

| Domain                | Router(s)                                               | REST routes still present? |
| --------------------- | ------------------------------------------------------- | -------------------------- |
| Competitions          | `competitions.ts`                                       | Likely dead — verify       |
| Content               | `content.ts`                                            | Likely dead — verify       |
| Events                | `events.ts`                                             | Likely dead — verify       |
| Bookings              | `bookings.ts`                                           | Likely dead — verify       |
| Groups                | `groups.ts`                                             | Likely dead — verify       |
| Disputes              | `disputes.ts`                                           | Likely dead — verify       |
| Chat/Messages         | `chat.ts`, `chat/conversations.ts`, `chat/messaging.ts` | Likely dead — verify       |
| Resources             | `resources.ts`                                          | Likely dead — verify       |
| Notifications         | `notifications.ts`                                      | Likely dead — verify       |
| Maintenance           | `maintenance.ts`, `maintenance/*` (4 sub-routers)       | Likely dead — verify       |
| Surveys               | `surveys.ts`, `surveys/*` (4 sub-routers)               | Likely dead — verify       |
| DWallet               | `dwallet.ts`                                            | Likely dead — verify       |
| Merits                | `merits.ts`                                             | Likely dead — verify       |
| Identity/Users        | `identity.ts`                                           | Likely dead — verify       |
| Marketplace/Comm Svcs | `marketplace.ts`, `marketplace/*` (8 sub-routers)       | Likely dead — verify       |
| Achievements          | `achievements.ts`                                       | Likely dead — verify       |
| Agents                | `agents.ts`                                             | Likely dead — verify       |
| Invitations           | `invitations.ts`                                        | Likely dead — verify       |
| Settings              | `settings.ts`                                           | Likely dead — verify       |
| Dashboard Stats       | `identity.ts` (stats procedures)                        | Likely dead — verify       |

> **Action:** For each domain above, verify that the flat REST routes under `src/app/api/<domain>/` are dead code and can be removed.

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
| Marketplace/Comm Svcs | ✅ Complete    |                                                |            |
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

For each ✅ domain, verify that the flat REST route files under `src/app/api/<domain>/` are no longer called from the frontend. If confirmed dead:

1. Remove route files
2. Remove from `API_ROUTES.md`
3. Add commit reference above

---

## How to Migrate

1. Create a new tRPC router in `src/server/routers/` following `tRPC.md` conventions
2. Wire procedure tiers from `src/shared/api/trpc/server.ts` (`protectedProcedure`, `tenantProcedure`, etc.)
3. Add OpenAPI meta annotations for external-facing procedures
4. Update frontend calls to use `@trpc/react-query` hooks
5. Delete the old REST route file
6. Update `API_ROUTES.md` and this document
7. Run `pnpm api:generate && pnpm api:lint` to validate OpenAPI spec
