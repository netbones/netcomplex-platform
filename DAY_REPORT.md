# Day Report — 2026-07-22

## Project Status Overview

**Milestone progress (GSD):**

| Milestone               | Status                              | Phases    |
| ----------------------- | ----------------------------------- | --------- |
| M0 Foundation           | ✅ Shipped                          | 9         |
| M1 Core Comm & Auth     | ✅ Shipped                          | 5         |
| M2 Dashboard & Nav      | ✅ Shipped                          | 9         |
| M3 Trust & Safety       | ✅ Shipped                          | 10        |
| M4 Production-Ready     | 🟡 2/3 planned (Phase 41, 42 ready) | 3         |
| M4.5 Stabilization      | 🚧 Blocked on M4                    | —         |
| M5 Anchor Tenant Launch | 📋 Planning                         | 10+ items |
| M7 Monorepo             | 📋 Planning                         | 6         |

**Outstanding GSD phases:** Phases 41, 42 (M4), then 43+ for M4.5/M5.

## BD Issues: 47 open (3 closed this session)

**P1** (2): Onboarding refactor, ADR-027 engine

**P2** (8): outbox, RLS hardening, CMS, ticketing, workspace bugs, agent gateway, provider billing, revenue confirm

**P3** (33): REST→tRPC duplication, rate limiting, Zod validation, FSD dead slices, RLS Stage C (blocked), model debt, provider platform (8), chat E2EE, dWallet sources, notifications, booking calendar, analytics, POPIA audit, passkeys, cookies

**P4** (4): G4 test fixtures, static content, OpenAPI export, barrel coupling

**Closed:** `hiu2.4` (marketplace JSDoc), `hiu2.5` (content/identity/settings JSDoc), `hiu2.6` (admin/platform JSDoc) — all confirmed done via existing commits.

## Ongoing tRPC Issues (still valid)

| Issue                                                       | Priority | Status                                                    |
| ----------------------------------------------------------- | -------- | --------------------------------------------------------- |
| `qzll` — legacy routes still primary, frontend not migrated | P3       | Still deferred — larger frontend effort                   |
| `e8hs` — 16+ domains with parallel REST + tRPC              | P3       | Deprecation markers added, frontend migration not started |
| `c2dd` — rate-limit infra, router splitting, middleware     | P3       | Infrastructure work, still deferred                       |
| `c3zg` — only 24/235+ procedures OpenAPI-exported           | P4       | Not yet addressed                                         |

## Recent Work

- Fixed test suite — 200/200 files, 2233/2233 tests passing
- Completed Phase 2 REST→tRPC migrations with `@deprecated` JSDoc sweep
- Burger menu fixes: My Space item order (Dashboard → Bookings → Messages → Maintenance), Campaign above Conservation, added `admin.disputes` i18n key
- Closed 3 stale BD issues (JSDoc deprecation subtasks that were already done)
