# BD Issue Tracker

> **⚠️ GSD-ESCALATED (2026-07-08):** `soralia-village-bawf` — _Onboarding refactor:
> defer tenant provisioning until post-verification_ (ADVISORY-031 / Option C, P1).
> This is **GSD territory** (schema migration to make `users.tenantId` nullable + auth
> config + multiple FSD slices) — it is a **post-completion gap in the completed Phase 123
> (Setup Center)** and should be handled via a GSD phase, not a BD quick-fix. Related:
> `soralia-village-zbvq` (401 hotfix, committed), `soralia-village-0jh1` (Setup Center).
> Docs: `docs/advisories/ADVISORY-031.md` (supersedes ADVISORY-030), `ONBOARDING_REFACTOR.md`.

> **Last updated:** 2026-07-08 (Session 16 — onboarding refactor discovery)
> **Total remaining:** 43 issues
> **Closed this session:** 7 (`0orq`, `7a02`, `gb5p`, `tbtr`, `2pxb`, `owuh`, `bnxu`)
> **Created this session:** 21 (`5z3g`, `0orq`, `7a02`, `gb5p`, `tbtr`, `7tqj`, `sioz`, `g8c3`, `2pxb`, `8rve`, `owuh`, `h9o4`, `e8hs`, `tkt5`, `ee5p`, `3m0h`, `qzll`, `axh6`, `vukt`, `c3zg`, `bnxu`)
> **Note:** BD is for quick fixes and small tasks. **Any BD issue touching 5+ files across multiple FSD slices, or requiring new directories/types, is GSD territory — escalate it.**

## Summary by Priority

| Priority | Open  | Focus                                              |
| -------- | ----- | -------------------------------------------------- |
| **P1**   | **1** | **Supply-chain: pnpm audit high-severity cleanup** |
| P2       | 8     | Core features, epics, bugs, **architecture**       |
| P3       | 25    | Tech debt, Phase 4/5 features, enhancements        |
| P4       | 10    | Backlog, blocked events                            |

## Summary by Status

| Status        | Count |
| ------------- | ----- |
| ○ Open        | 29    |
| ◐ In Progress | 1     |

---

## P2 — High Priority (2 issues)

### Bugs

| ID     | Type | Title                                                                         | Status | Source                  |
| ------ | ---- | ----------------------------------------------------------------------------- | ------ | ----------------------- |
| `cs5`  | bug  | MyHomeSpace: Property not linked despite user having property (183 Pagoda Rd) | ○      | Phase 30 checkpoint     |
| `8rve` | bug  | Investigate tsc --noEmit hang                                                 | ○      | S5-11/S6-5 pre-existing |

### Features & Tasks

| ID    | Type | Title                    | Status |
| ----- | ---- | ------------------------ | ------ |
| `l23` | epic | Epic: i18n for all pages | ✅     |

### Features & Tasks

| ID     | Type    | Title                                                                                           | Status |
| ------ | ------- | ----------------------------------------------------------------------------------------------- | ------ |
| `2at`  | feature | Phase 35: Community Merits & Standing System                                                    | ○      |
| `k3h`  | task    | Verify external API consumers can access the OpenAPI spec                                       | ○      |
| `qig`  | task    | Architecture: Build shared HTTP client (src/shared/api/client.ts)                               | ○      |
| `fpc`  | task    | Architecture: Expand tRPC coverage from 2 to all entities                                       | ○      |
| `22a`  | task    | Add connection pool config + retry to Drizzle singleton                                         | ○      |
| `4a6`  | task    | **RLS migration: move add_rls.sql into proper Prisma migration, narrow to 14 tables, fix bugs** | ○      |
| `5m7l` | task    | Confirm Schedule F Table 2 revenue share percentages with anchor tenant (Soralia Village)       | ○      |
| `5z3g` | task    | Define USER role + role lifecycle for sign-ups, adoptions, and providers                        | ○      |
| `0orq` | task    | AI Pool: Add estimatedCostUSD to AiUsageEvent + pricing.ts + wire into recordUsage()            | ✅     |
| `7a02` | task    | AI Pool: Add estimatedCostUSD aggregation to platform admin usage routes                        | ✅     |
| `gb5p` | task    | AI Pool: Make capability required on AiCompletionOptions (type-level enforcement)               | ✅     |
| `tbtr` | task    | AI Pool: Fix ENTERPRISE seed overageTokens (500k→250k) and migrate to Drizzle pattern           | ✅     |

### Blocked Tasks

| ID     | Title                                                                | Blocked By | Status |
| ------ | -------------------------------------------------------------------- | ---------- | ------ |
| `0f7`  | i18n: Database content localization for Tiptap                       | `l23`      | ✅     |
| `7qkl` | i18n: server-side locale routing + content localization (structural) | —          | ○      |
| `oqw`  | Phase 3: Wrap API routes with runWithRLS()                           | `4a6`      | ○      |

---

## FSD Cross-Slice Cleanup (from Phase 44 baseline)

| ID     | Priority | Title                                             | Status | Scope | Approach                      | Note                                                                                                                                                                           |
| ------ | -------- | ------------------------------------------------- | ------ | ----- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `08st` | P2       | entities/tenant cross-slice fan-in (9 violations) | ✅     | 18f   | ~~BD~~ (should have been GSD) | Moved RBAC + tenant types to @shared/lib                                                                                                                                       |
| `bszk` | P3       | Remove entities/tenant re-export shims (2 files)  | ✅     | 2f    | **BD**                        | Shim files deleted, 49 consumer files migrated to @shared/lib                                                                                                                  |
| `nf5r` | P3       | entities/admin cross-slice fan-in (26 violations) | ✅     | 1f    | **BD**                        | Barrel imports + Steiger config for widget registry. 0 remaining                                                                                                               |
| `znjo` | P3       | shared layers importing entities (41 violations)  | ✅     | 13f   | **BD**                        | schemas.ts deletion, tenantConfig move, PlatformPageFlags redirect. 0 shared→entities violations                                                                               |
| `qjpa` | P3       | @api/\* deep-import sidestep violations (389)     | ✅     | 51f   | **GSD phase 44-04**           | Sub-barrels created, aliases registered, all 163 consumers migrated. 185 cosmetic `⚠` remain (Steiger allow-list limitation — sub-barrels ARE the correct public API per plan) |

**Sizing rule:** If a BD issue will touch 5+ files across multiple FSD slices, or requires new shared directories/types → escalate to GSD phase.

---

## RLS Work (cross-phase)

The RLS work spans three issues. The migration (`4a6`) is a Phase 43 prerequisite; the expansion (`t78`) and enforcement (`57d`) are deferred.

| ID    | Priority | Type | Title                                                                           | Blocked By | Phase    |
| ----- | -------- | ---- | ------------------------------------------------------------------------------- | ---------- | -------- |
| `4a6` | P2       | task | RLS migration: move add_rls.sql, narrow to 14 tables, fix GUC name + WITH CHECK | —          | 43 (now) |
| `oqw` | P2       | task | Phase 3: Wrap API routes with runWithRLS() for RLS enforcement                  | `4a6`      | 43 (now) |
| `t78` | P3       | task | RLS expansion: extend policies to 33 non-sensitive tenant tables                | `4a6`      | M6+      |
| `57d` | P3       | task | RLS enforcement: wrap remaining ~100 tenant-scoped routes in runWithRLS()       | `4a6`      | post-43  |

**Dependency chain:** `4a6` → `oqw` (Phase 43 43-04) → `57d` (Stage C rollout). `t78` is parallel to `57d`, deferred to M6+.

**Plan:** `.commandcode/plans/rls-migration.md`

---

## dWallet (Phase 47, M5b — reclassified 2026-06-06)

Phase 47 was originally classified as M6+ (post-launch) on the assumption that dWallet depended on an external NetBones Privacy-as-a-Service product. The `docs/architecture/DWALLET_SPEC.md` (written 2026-06-06) reframes this: **dWallet IS the privacy module.** The append-only `DataConsent` + `WalletTransaction` models are themselves the consent ledger and rights-of-data-subject surface (POPIA / LGPD principles).

Phase 47 is now M5b (anchor tenant launch) because dWallet is the **headline selling point** for the Soralia Village anchor tenant. Without dWallet, the pitch collapses to "another community portal." Execution is launch-blocking, alongside Community Merits (phase 45) and the other M5b features.

### Related BD issues

| ID     | Title                                                                   | Status | Note                                                                                                                                                           |
| ------ | ----------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `7cp`  | Complete formal POPIA compliance audit for South Africa tenant          | ○      | Elevated from "should do" to launch-readiness by dWallet. Original M4.5 deferral re-scoped.                                                                    |
| `jc1`  | Implement cookie management for privacy compliance                      | ○      | Re-scoped. dWallet's `DataConsent` is consent of record — cookie management may still be useful for general privacy hygiene but is not a dWallet prerequisite. |
| `5m7l` | Confirm Schedule F Table 2 revenue share percentages with anchor tenant | ○      | **NEW.** dWallet M5b launch-readiness blocker. Production `DataRevenueStream` seed is gated on this. Development (Sub-phases A-F) proceeds in parallel.        |

**Spec source of truth:** `docs/architecture/DWALLET_SPEC.md`

**Sub-phase decomposition (per spec §Implementation Order):** A (schema), B (API), C (FSD entity), D (widgets), E (feature gates), F (page + nav). 6 separate PLAN.md files to be created when planning starts.

---

## P3 — Medium Priority (18 issues)

### Bugs

| ID    | Type | Title                                                            | Status |
| ----- | ---- | ---------------------------------------------------------------- | ------ |
| `tc4` | bug  | prisma/seed.ts type errors: missing id, tenantId in user creates | ○      |

### Features

| ID    | Type    | Title                                                              | Status |
| ----- | ------- | ------------------------------------------------------------------ | ------ |
| `ltn` | feature | Add request validation plugin                                      | ○      |
| `7td` | feature | Enable One Tap passkey login                                       | ○      |
| `byj` | feature | Add search/filter to AddWidgetModal for space-scoped widget picker | ○      |

### Tasks

| ID     | Title                                                                       | Status | Source                            |
| ------ | --------------------------------------------------------------------------- | ------ | --------------------------------- |
| `ka6`  | Design decision: widget placement across Focus Spaces                       | ○      | Phase 30 checkpoint               |
| `jc1`  | Implement cookie management for privacy compliance                          | ○      |                                   |
| `6d8`  | Migrate React imports to Preact and remove dead code                        | ○      |
| `gtm`  | Phase 5: Notification system                                                | ○      |
| `cp8`  | Phase 5: Payment processing                                                 | ○      |
| `qx7`  | Phase 5: Booking calendar integration                                       | ○      |
| `kia`  | Phase 4: Advanced analytics                                                 | ○      |
| `9e8`  | Phase 4: Provider dashboard                                                 | ○      |
| `69c`  | Phase 4: Third party registration flow                                      | ○      |
| `5u2`  | Architecture: De-duplicate maintenance API transform logic                  | ○      | cleaner_react_architecture audit  |
| `9xr`  | Architecture: Extract pure domain helpers (useIdentity, ticketNumber, etc.) | ○      | cleaner_react_architecture audit  |
| `1ei`  | Architecture: Migrate widget useEffect+fetch to useQuery/useMutation        | ○      | cleaner_react_architecture audit  |
| `b5d`  | Standardize ID strategy across all models (cuid/uuid/plain String mix)      | ○      | REPORT.md schema audit            |
| `zjm`  | Extract high-frequency JSON fields into proper columns                      | ○      | REPORT.md schema audit            |
| `6i9`  | Add soft deletes (deletedAt) across all entities                            | ○      | REPORT.md schema audit            |
| `8re`  | Verify Preact compatibility with TipTap, charts, maps, and React Flow       | ○      | REPORT.md schema audit            |
| `7cp`  | Complete formal POPIA compliance audit for South Africa tenant              | ○      | REPORT.md schema audit            |
| `hfy`  | Implement per-tenant and per-module usage analytics                         | ○      | REPORT.md schema audit            |
| `sioz` | Model duplication: seat polymorphism, invoice/payment overlap               | ○      | PRISMA_ANALYSIS.md finding #6, #7 |
| `g8c3` | Denormalized aggregate drift risk                                           | ○      | PRISMA_ANALYSIS.md finding #8     |
| `2pxb` | Soft-delete inconsistency policy                                            | ✅     | PRISMA_ANALYSIS.md finding #10    |
| `owuh` | Soft-delete alignment: add deletedAt to orphan child models                 | ✅     | Follow-up from `2pxb`             |
| `h9o4` | Adopt notDeleted() helper across all query files                            | ○      | Follow-up from `2pxb`             |
| `e8hs` | tRPC/REST duplication: 16+ domains have parallel REST + tRPC handlers       | ○      | API_REVIEW.md finding #2          |
| `tkt5` | REST routes: inconsistent auth — inline getSessionAndRole duplicates        | ○      | API_REVIEW.md finding #3          |
| `ee5p` | REST routes: inconsistent Zod validation                                    | ○      | API_REVIEW.md finding #4          |
| `3m0h` | REST routes: missing rate limiting on mutation endpoints                    | ○      | API_REVIEW.md finding #5          |
| `qzll` | Incomplete v1 API migration — flat legacy routes still primary              | ○      | API_REVIEW.md finding #6          |

### In Progress

| ID     | Type | Title                                           | Status |
| ------ | ---- | ----------------------------------------------- | ------ |
| `bgb`  | epic | Interests Visualization                         | ◐      |
| `7tqj` | task | Fix mock isolation in remaining colocated tests | ○      |

---

## P4 — Backlog (10 issues)

| ID      | Type    | Title                                                                   | Status | Notes                     |
| ------- | ------- | ----------------------------------------------------------------------- | ------ | ------------------------- |
| `0tb`   | feature | Upgrade to OTP-based password reset                                     | ○      |                           |
| `p81.1` | event   | State change: patrol → active                                           | ○      | Blocked by `p81`          |
| `rbs.1` | event   | State change: patrol → active                                           | ○      | Blocked by `p81`          |
| `up2`   | task    | Configure Better Auth background tasks for Vercel                       | ○      |                           |
| `4vk`   | task    | Phase 5: Mobile app optimization                                        | ○      |                           |
| `4fh`   | task    | Phase 4: Billing integration                                            | ○      |                           |
| `axh6`  | task    | DTO schemas duplicated across src/server/dto/ and src/shared/api/dto/   | ○      | API_REVIEW.md finding #7  |
| `vukt`  | task    | Barrel file: src/shared/api/server/index.ts at 234 lines tight coupling | ○      | API_REVIEW.md finding #8  |
| `c3zg`  | task    | Only ~10% of tRPC procedures OpenAPI-exported (24 of 235+)              | ○      | API_REVIEW.md finding #9  |
| `bnxu`  | task    | CI missing redocly lint enforcement for OpenAPI spec                    | ✅     | API_REVIEW.md finding #10 |

---

## Closed This Session (37 issues)

### Session 12b — FSD Cleanup (2 closed)

| ID     | Title                                                | Reason                                                                                                                                                                                                             |
| ------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `rnov` | Pricing page pre-existing sidesteps and cross-import | Fixed: moved `PageCTA` to `shared/ui`, fixed `withTenant` to use `@entities/tenant` barrel                                                                                                                         |
| `qjpa` | @api/\* deep-import sidestep violations (389)        | Sub-barrel architecture complete. All 163 consumers migrated to `@api/server`/`@api/client`/`@api/shared`. 185 cosmetic `⚠` remain (Steiger allow-list limitation). `@api/*` wildcard alias removed from tsconfig. |

### Session 12 - FSD Cleanup (4 closed)

| ID     | Title                                                   | Reason                                                                                                                                    |
| ------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `s50y` | src/types/ at wrong FSD layer (1 violation)             | Fixed: moved `css.d.ts` to `src/shared/types/css.d.ts`, deleted `src/types/` directory.                                                   |
| `3qio` | features/pricing importing app layer (1 violation)      | Fixed: extracted `PricingPlan` type to `features/pricing/model/types.ts`. Updated 3 consumers to import from `@features/pricing` barrel.  |
| `nf5r` | entities/admin cross-slice fan-in (26 violations)       | Fixed: barrel imports + Steiger config for widget registry. 0 cross-import.\*admin violations remaining. Phase 44-05 Task 4.              |
| `znjo` | shared layers importing entities (41 violations)        | Fixed: schemas.ts deletion, tenantConfig move, PlatformPageFlags redirect. 0 shared→entities violations remaining. Phase 44-05 Tasks 1-3. |
| `bszk` | Remove entities/tenant re-export shims (permissions.ts) | Fixed: shims deleted, 49 consumer files migrated to @shared/lib. Closed in prior session, BD.md was stale.                                |

### Session 11 - FSD Cross-Slice Cleanup (1 closed)

| ID     | Title                                             | Reason                                                                                                                                                              |
| ------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `08st` | entities/tenant cross-slice fan-in (9 violations) | Fixed: moved RBAC to @shared/lib/permissions, tenant types to @shared/lib/types/tenant, updated 5 entity imports. 0 violations remaining. **Should have been GSD.** |

### Session 8 - Cross-Tenant Data Leakage Audit (1 closed, 6 created)

| ID    | Title                                                           | Reason                                                                                                                                                                                                                                                                                                              |
| ----- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e0w` | Fix route-level cross-tenant data leakage (20 remaining routes) | Fixed: commit `7579ac9` + live fix for `resources/[id]/download/route.ts`. M4.5 systematic 90-route audit complete in plan 43-03 (see `docs/SECURITY_AUDIT_M4.5.md`): 157 routes audited, 0 FAIL, 8 WHITELISTED, 13 N/A. All tenant-scoped routes use `withTenant()`; v1 re-exports inherit the canonical's status. |

#### Created

| ID    | Title                                                                 | Priority |
| ----- | --------------------------------------------------------------------- | -------- |
| `b5d` | Standardize ID strategy across all models                             | P3       |
| `zjm` | Extract high-frequency JSON fields into proper columns                | P3       |
| `6i9` | Add soft deletes (deletedAt) across all entities                      | P3       |
| `8re` | Verify Preact compatibility with TipTap, charts, maps, and React Flow | P3       |
| `7cp` | Complete formal POPIA compliance audit for South Africa tenant        | P3       |
| `hfy` | Implement per-tenant and per-module usage analytics                   | P3       |

### Session 5 - Phase 35 API Alignment (1 created, 0 closed)

| ID    | Title                                                                                | Reason                                                                                  |
| ----- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `k3h` | Verify external API consumers can access the OpenAPI spec generated by @trpc/openapi | Created: Phase 35 deviation — @trpc/openapi generates OpenAPI 3.1 with tRPC-style paths |

### Session 4 - Phase 30 Focus Space Architecture (3 created, 0 closed)

| ID    | Title                                                                         | Reason                                                                                     |
| ----- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `cs5` | MyHomeSpace: Property not linked despite user having property (183 Pagoda Rd) | Created: deferred from Phase 30 checkpoint — data/linking issue, not architecture bug      |
| `ka6` | Design decision: widget placement across Focus Spaces                         | Created: deferred from Phase 30 checkpoint — UX decision needed on widget-to-space mapping |
| `byj` | Add search/filter to AddWidgetModal for space-scoped widget picker            | Created: deferred from Phase 30 checkpoint — enhancement, not a bug                        |

### Session 3 - Bot Protection & Type Safety (8 issues)

| ID      | Title                                 | Reason                                                                                                                        |
| ------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `yml`   | Implement bot protection with captcha | Fixed: added Turnstile to sign-in, sign-up, forgot-password, reset-password; created /api/auth/signin route with verification |
| `c3y`   | Fix ESLint any type errors            | Fixed: replaced 3 `any` usages with `InferSelectModel` and `InferInsertModel` from drizzle-orm                                |
| `wmm`   | Improve directory cards with chat     | Implemented: created DirectoryChatModal with find-or-create flow, Supabase realtime, wired to card chat buttons               |
| `71p`   | Continue improving test coverage      | Closed: added 69 new tests across auth routes, forms, hooks, and UI components (205 total passing)                            |
| `71p.1` | Add tests for API routes              | Added auth route tests for signup, signin, forgot-password, reset-password                                                    |
| `71p.2` | Add tests for form components         | Added SignInPage, ForgotPasswordPage, ResetPasswordPage component tests                                                       |
| `71p.3` | Add tests for custom hooks            | Added usePresence and useMessageSend hook tests                                                                               |
| `71p.4` | Add tests for UI components           | Added LoadingSpinner, LoadingSkeleton, Breadcrumbs, ErrorBoundary, Tooltip, TurnstileWidget tests                             |

### Session 2 - High Priority (5 issues)

| ID    | Title                                                | Reason                                                                                                                      |
| ----- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `ywr` | Debug and test authentication login/sign-up flow     | Fixed: added /reset-password page, stored reset token in DB, fixed sign-up to use API route, added Turnstile token callback |
| `uou` | SEO-friendly public profile links                    | Implemented: profileSlug generated on signup, API resolves both UUIDs and slugs                                             |
| `dlc` | Implement BookshelfWidget and MediaWidget            | Already implemented: both widgets have full CRUD functionality                                                              |
| `utj` | Add admin household management page                  | Implemented: GET /api/households + /admin/households page with search, pagination                                           |
| `og6` | Determine bookings data flow to maintenance services | Research complete: No data flow exists - independent features                                                               |

### Session 1 - Performance & Verification (22 issues)

#### Completed

| ID      | Title                                                     | Reason                                      |
| ------- | --------------------------------------------------------- | ------------------------------------------- |
| `fso`   | Build Performance: Convert dashboard to server components | Converted 8 widgets to server components    |
| `7jp`   | Build Performance: Convert directory to server components | Converted Breadcrumbs to server component   |
| `87g`   | Build Performance: Convert groups to server components    | Fixed groups admin page missing useEffect   |
| `a2t`   | Directory shows no residents - Drizzle query issue        | Added isActive filter to /api/users         |
| `wpr`   | Epic: Migrate to FSD                                      | Already follows FSD structure               |
| `apf`   | Fix multitenant architecture gaps                         | Already implemented with withTenant()       |
| `n95`   | Fix Better Auth admin plugin conflict                     | No conflict — uses additionalFields pattern |
| `wu1.4` | Remove Prisma dependency after migration                  | Won't fix — intentional per ADR-003         |

#### Verified (Code Review)

| ID    | Title                                                       | Verification                                   |
| ----- | ----------------------------------------------------------- | ---------------------------------------------- |
| `95n` | Verify EventsWidget empty state shows Create Event link     | EventsWidget.tsx:118-124                       |
| `0ul` | Verify Events tab appears in admin dashboard                | admin-config.ts:35-39                          |
| `bj9` | Create event via /admin/events/new — verify form            | EventForm.tsx: Zod validation, toast, redirect |
| `uuz` | Navigate to /admin/events — verify event list               | EventList.tsx: 5 columns rendered              |
| `019` | Verify non-admin users cannot see scheduled/expired content | /api/content/route.ts:129-137                  |
| `eam` | Verify AssistSession scope enforcement                      | auth-guard.ts:66-108                           |
| `j0p` | Verify invitation database records during onboarding        | InviteStep.tsx: formData.invites               |
| `6cf` | Verify onboarding wizard navigation and data persistence    | OnboardingWizard.tsx: 5 steps, progress bar    |
| `479` | Verify end-to-end signup flow                               | signup → tenant created → onboarding → /admin  |

#### Duplicates Closed

| ID    | Title                                                   | Duplicate Of |
| ----- | ------------------------------------------------------- | ------------ |
| `og0` | Navigate to /admin/events — verify event list           | `uuz`        |
| `8as` | Verify EventsWidget empty state shows Create Event link | `95n`        |

#### Logging Consolidation

| ID    | Title                                          | Status       |
| ----- | ---------------------------------------------- | ------------ |
| `8ov` | Migrate all console.error to Pino logger       | ✅ Completed |
| `8mj` | Migrate remaining 88 console statements        | ✅ Completed |
| `x7e` | Migrate remaining console.error to pino logger | ✅ Completed |

---

## Recommended Next Actions

1. **`5z3g`** — Define USER role + role lifecycle for sign-ups, adoptions, and providers (Better Auth hardcodes `role='user'`, PG enum lacks it → 422s)
2. **`5m7l`** — Confirm Schedule F Table 2 revenue share percentages with anchor tenant (dWallet M5b launch-readiness — see "dWallet" section above)
3. **`cs5`** — MyHomeSpace property linking bug (user has property but shows "No property linked")
4. **`ka6`** — Design decision: widget placement across Focus Spaces (UX call needed)
5. **`6d8`** — Migrate React imports to Preact (performance)
6. **`l23`** — Epic: i18n for all pages ✅ (delivered Phase 45-04/45-05; superseded by `7qkl`)
7. **`ltn`** — Add request validation plugin (security)
8. **`byj`** — AddWidgetModal search/filter enhancement
9. **`bgb`** — Epic: Interests Visualization (in-progress)
10. **`7td`** — Enable One Tap passkey login (security)

### Architecture Roadmap (from `docs/cleaner_react_architecture.md` audit, 2026-06-02)

9. **`qig`** — Build shared HTTP client (Chapter 1) — unblocks Chapters 2, 3
10. **`fpc`** — Expand tRPC coverage from 2 routers to all entities (Chapter 8)
11. **`9xr`** — Extract pure domain helpers (Chapter 7) — `getEffectiveRole`, `generateTicketNumber`, permission functions
12. **`5u2`** — De-duplicate maintenance transform logic between `src/app/api/maintenance/route.ts` and `src/entities/maintenance/api/route.ts` (Chapter 3)
13. **`1ei`** — Migrate widget `useEffect`+`fetch` to `useQuery`/`useMutation` (Chapters 6, 8) — start with `DashboardStats`, `EventsWidget`, `AdminStatsWidget`

Full audit and recommended order in `docs/cleaner_react_architecture.md` (Codebase Audit section).
