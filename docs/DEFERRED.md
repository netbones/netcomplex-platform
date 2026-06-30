# Deferred Items Register — NetComplex

Tracks all deferred items — phases, features, BD issues, and cross-cutting work — with blocker, disposition, and rationale.

---

## Deferred Phases (M6+ Post-Launch)

| Phase                | Status                       | Blocker / Depends On                                                                                                                                            | Plan            |
| -------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **03-second-tenant** | Planning Complete (deferred) | Requires production deployment + a willing second tenant. Cannot run against a synthetic tenant — the test validates onboarding under real adoption conditions. | `03-01-PLAN.md` |
| **04-content-i18n**  | Planning Complete (deferred) | Blocked on BD `l23` — i18n router must be extended to tenant routes (`/[lng]/(tenant)/...`) before TipTap content localization per locale can execute.          | `04-01-PLAN.md` |

## Milestone-Level Deferrals

| Milestone           | Disposition                                                                    |
| ------------------- | ------------------------------------------------------------------------------ |
| **M5+ Post-Launch** | Entire milestone deferred — second tenant, plugin system, event sourcing, etc. |

## Within-Phase Deferred Items

| Phase / Location  | Item                                                                                                                                    | Rationale                                                                                                         | Resolution          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------- |
| **Phase 01**      | FeatureGate navigation integration                                                                                                      | Deferred to keep plan focused on core tenant isolation                                                            | Resolved in `01-02` |
| **Phase 26**      | `NAV_LINKS` / `PUBLIC_NAV_LINKS` / `ADMIN_LINKS` constants cleanup                                                                      | Deferred to Plan 03 per plan spec                                                                                 | Still open          |
| **Phase 28**      | Pre-existing ESLint `no-explicit-any` in `FeatureManagementConsole.tsx`                                                                 | Blocks full `pnpm build` exit code, not caused by this plan                                                       | Not resolved        |
| **Phase 36**      | File upload for images (URL-only for launch); video support                                                                             | Deferred per CONTEXT.md                                                                                           | Not resolved        |
| **Phase 38**      | Domain grid 'Communication' heading hardcoded                                                                                           | i18n deferred to Plan 04 — follows plan spec                                                                      | Still open          |
| **Phase 39**      | Pre-existing `createCallerFactory` tRPC v11 error in template file                                                                      | Pre-dates Phase 39                                                                                                | Not resolved        |
| **Phase 44-01**   | Removing `@api/*` tsconfig alias                                                                                                        | Root cause of 461 FSD violations (79% of all debt); architectural decision deferred to a dedicated follow-up plan | Not resolved        |
| **Phase 44-02**   | PostHog feature flags configuration, group analytics                                                                                    | Not needed for M5b soak                                                                                           | Not resolved        |
| **Phase 44-06**   | Widget refactoring                                                                                                                      | Schema migration + hooks done; remaining widget work deferred                                                     | Not resolved        |
| **Phase 46.1**    | PDF invoice generation                                                                                                                  | Reuse `pdfUrl` pattern from Phase 46; no existing PDF dependency                                                  | Not resolved        |
| **Phase 46.1**    | Prorated billing adjustments                                                                                                            | MVP uses immediate plan swaps without proration                                                                   | Not resolved        |
| **Phase 46.1**    | Recurring billing (subscription API)                                                                                                    | Start with manual renewal per cycle; true recurring billing requires gateway subscription API                     | Not resolved        |
| **Phase 46.1**    | Coupon code validation                                                                                                                  | Parameter received but not validated                                                                              | Future plan         |
| **Phase 47**      | 7-day production soak                                                                                                                   | Deferred to a separate phase when system is stable                                                                | Not resolved        |
| **Phase 50**      | Full listing grid + booking UI for MarketplaceWidget                                                                                    | Initial placeholder renders "coming soon"                                                                         | Resolved in `50-04` |
| **Phase 50**      | Multi-currency support beyond ZAR                                                                                                       | Paystack handles ZAR; PayPal handles international. Full multi-currency deferred                                  | Not resolved        |
| **Phase 50**      | Provider analytics dashboard                                                                                                            | Phase 46 covers provider registration/verification; marketplace-specific analytics deferred                       | Not resolved        |
| **Phase 50**      | Automated dunning (failed payment retry)                                                                                                | MVP shows error to user with manual retry                                                                         | Not resolved        |
| **Phase 50**      | Marketplace space in MobileSpaceBar                                                                                                     | Deferred until adoption metrics justify top-level nav                                                             | Not resolved        |
| **Phase 50**      | Daily digest for inquiries                                                                                                              | Per-inquiry real-time is default                                                                                  | Not resolved        |
| **Phase 102**     | Merits as achievement trigger source (G3)                                                                                               | 6 domains only for v1 per ADVISORY-013                                                                            | Not resolved        |
| **Phase 102**     | Status-change events (cancelled bookings, resolved maintenance)                                                                         | Deferred to v2 for richer achievement types                                                                       | Not resolved        |
| **Phase 111/118** | Agent Gateway — close out deferred/incomplete items (DelegationWidget registration, Prisma migration, integration tests, ROADMAP entry) | Hardening phase                                                                                                   | Resolved in `118`   |

## BD Issues Deferred

| Issue  | Description                                      | Disposition                                                                    |
| ------ | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| `t78`  | RLS expansion to more tables                     | Deferred to M6+                                                                |
| `nn39` | 19 high-severity pnpm audit findings             | Reclassified P1→P3 (dev/build-only paths); defer to runtime-impact-only filter |
| `mls9` | `prisma.seed` config in package.json             | Pre-existing blocker for soak AC                                               |
| `n0rh` | `gen_random_uuid` default on `Tenant.id`         | Pre-existing blocker for soak AC                                               |
| `cs5`  | MyHomeSpace: Property not linked (183 Pagoda Rd) | Data/linking issue, not architecture bug. Deferred from Phase 30 checkpoint    |
| `ka6`  | Widget placement across Focus Spaces             | UX decision needed. Deferred from Phase 30 checkpoint                          |
| `byj`  | Add search/filter to AddWidgetModal              | Enhancement. Deferred from Phase 30 checkpoint                                 |
| `l23`  | i18n router extension to tenant routes           | Blocks Phase 04 (Content i18n)                                                 |
| `0f7`  | TipTap content localization                      | Blocked by `l23`                                                               |

## Cross-Cutting / Infra Deferred

| Item                                   | Description                                                           | Disposition                                                                                                  |
| -------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **cuid2/uuid standardization**         | Mix of cuid/uuid/string IDs fragile in multi-tenant queries           | Revisit                                                                                                      |
| **Soft deletes** (`deletedAt`)         | Compliance/audit need exists but feature work has higher priority     | Revisit. Partial via Phase 101                                                                               |
| **C4 conflict**                        | `docs/UBIQUITOUS_LANGUAGE.md` C4 still OPEN                           | Deferred to Phase 47 (dWallet)                                                                               |
| **FeatureGate navigation integration** | `getTierLevel()` soft-fallback — unknown inputs return `'foundation'` | Advisory's "throw on unknown" deferred                                                                       |
| **`11-prisma-to-drizzle`**             | Originally deferred M6+ planning-only phase                           | ✅ **RESOLVED** — Verified complete 2026-06-03 (incremental delivery, 179 Drizzle imports, 0 Prisma imports) |

---

## Legend

- **Not resolved** — still pending, no plan to address
- **Future plan** — allocated to a known follow-up plan
- **Resolved in `XX-YY`** — resolved in a subsequent sub-plan
- **Deferred to M6+** — explicitly pushed to post-launch milestone
- **Revisit** — acknowledged but no committed timeline

_Last updated: 2026-06-29_
