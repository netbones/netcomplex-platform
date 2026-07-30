# BD Issue Tracker

> **⚠️ GSD-ESCALATED (2026-07-08):** `soralia-village-bawf` — _Onboarding refactor:
> defer tenant provisioning until post-verification_ (ADVISORY-031 / Option C, P1).
> This is **GSD territory** (schema migration to make `users.tenantId` nullable + auth
> config + multiple FSD slices) — it is a **post-completion gap in the completed Phase 123
> (Setup Center)** and should be handled via a GSD phase, not a BD quick-fix. Related:
> `soralia-village-zbvq` (401 hotfix, committed), `soralia-village-0jh1` (Setup Center).
> Docs: `docs/advisories/ADVISORY-031.md` (supersedes ADVISORY-030), `ONBOARDING_REFACTOR.md`.

> **Last updated:** 2026-07-23 (Session 19 — Auth gating audit + Setting type column)
> **Total remaining:** 44 issues
> **Note:** BD is for quick fixes and small tasks. **Any BD issue touching 5+ files across multiple FSD slices, or requiring new directories/types, is GSD territory — escalate it.**

## Summary by Priority

| Priority | Open  | Focus                                                      |
| -------- | ----- | ---------------------------------------------------------- |
| **P0**   | **1** | **ADVISORY-037 caching remediation — pre-M6 multi-tenant** |
| **P1**   | **3** | **Onboarding refactor, Request-Scope Engine, caching**     |
| P2       | 9     | Platform hardening, ticketing, Provider Platform, caching  |
| P3       | 30    | API debt, Provider Platform gaps, RLS, analytics, caching  |
| P4       | 5     | G4 tenant-neutral, OpenAPI, barrel, settings export        |

## Summary by Status

| Status        | Count |
| ------------- | ----- |
| ○ Open        | 42    |
| ◐ In Progress | 3     |

---

## P1 — Critical (2 issues)

| ID     | Type | Title                                                                            | Status |
| ------ | ---- | -------------------------------------------------------------------------------- | ------ |
| `bawf` | task | Onboarding refactor: defer tenant provisioning until post-verification (GSD)     | ○      |
| `63pl` | task | ADR-027: Request-Scope Engine — advisor review + feature-branch Phase 0/1A/1B/1C | ○      |

---

---

## ADVISORY-037 — Caching Remediation (Reality Audit 2026-07-30)

Source: `docs/advisories/ADVISORY-037.md` §Reality Audit — Codebase State.

| ID     | Priority | Type | Title                                                                                             | Tier                |
| ------ | -------- | ---- | ------------------------------------------------------------------------------------------------- | ------------------- |
| `u36r` | P0       | task | Caching remediation — React cache(), tenant-scoped unstable_cache keys, wallet balance no-cache   | P0 pre-multi-tenant |
| `y9v0` | P1       | task | Caching remediation — chat realtime wiring, tag-based invalidation, content mutation invalidation | P1 correctness      |
| `cqs3` | P2       | task | Caching remediation — differentiated staleTime, dead code removal, comment realtime channel       | P2 performance      |
| `4f6w` | P3       | task | Caching remediation — use cache directive, Redis, observability (M6+)                             | P3 future           |

Audit evidence in the advisory. Cross-cutting with `z76s` (platform hardening) and `57d` (RLS) when those GSD phases run.

---

## P2 — High Priority (8 issues)

| ID     | Type    | Title                                                                                  | Status |
| ------ | ------- | -------------------------------------------------------------------------------------- | ------ |
| `8lus` | task    | Apply outbox migration + build dispatcher worker                                       | ○      |
| `d982` | task    | CMS post-M5 phase candidates: versioning, audit logging, image transforms              | ○      |
| `z76s` | task    | Platform architecture hardening: RLS activation, rate limiting, outbox, API            | ○      |
| `vo6v` | task    | Ticketing system gap closure: SLA tracking, escalation, notifications                  | ○      |
| `yvgz` | task    | Phase 122 Workspace Bug Report & Gap Analysis                                          | ○      |
| `sm23` | task    | Agent Gateway: Phase 111 ADDENDUM gaps                                                 | ○      |
| `hh1t` | feature | Provider Platform: Paystack/PayPal gateway integration — remote subscription lifecycle | ○      |
| `5m7l` | task    | Confirm Schedule F Table 2 revenue share % with anchor tenant (dWallet addendum)       | ○      |

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

The RLS migration (`4a6`) is complete. Remaining two items gated on `4a6` can now proceed.

| ID    | Priority | Type | Title                                                                     | Blocked By | Phase   |
| ----- | -------- | ---- | ------------------------------------------------------------------------- | ---------- | ------- |
| `57d` | P3       | task | RLS enforcement: wrap remaining ~100 tenant-scoped routes in runWithRLS() | —          | post-43 |
| `t78` | P3       | task | RLS expansion: extend policies to 21 non-sensitive tenant tables (M6+)    | —          | M6+     |

**Note:** `oqw` (Phase 3 runWithRLS() wrap) was closed as a subtask of Phase 43, and `4a6` is also closed.

---

## dWallet (Phase 47, M5 — reclassified 2026-07-23)

Phase 47 is an **M5 optional addendum** (not launch-blocking). dWallet requires a tenant to sign the addendum; tenants can launch on M5 core features without it.

### Related BD issues

| ID     | Title                                                                | Status | Note                                                                   |
| ------ | -------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| `7cp`  | Complete formal POPIA compliance audit for South Africa tenant       | ○      | Compliance prerequisite for dWallet launch                             |
| `jc1`  | Implement cookie management for privacy compliance                   | ○      | General privacy hygiene — not a dWallet prerequisite                   |
| `5m7l` | Confirm Schedule F Table 2 revenue share percentages with tenant     | ○      | dWallet addendum prerequisite — `DataRevenueStream` seed gated on this |
| `qyc4` | dWallet future revenue sources: Merits, Referrals, Volunteer Credits | ○      | Design exploration for post-launch dWallet revenue streams             |

**Spec:** `docs/architecture/DWALLET_SPEC.md`

---

## P3 — Medium Priority (31 issues)

### In Progress

| ID     | Type | Title                                                         | Status |
| ------ | ---- | ------------------------------------------------------------- | ------ |
| `sioz` | task | Model duplication: seat polymorphism, invoice/payment overlap | ◐      |
| `qx7`  | task | M5+ Post-launch: Booking calendar integration                 | ◐      |
| `bgb`  | epic | Interests Visualization                                       | ◐      |

### API & Platform Debt

| ID     | Title                                                                    | Status | Source                   |
| ------ | ------------------------------------------------------------------------ | ------ | ------------------------ |
| `dvex` | Remove dual-write to Tenant.featureFlags JSONB after migration confirmed | ○      | Phase 44 follow-up       |
| `qzll` | Incomplete v1 API migration — flat legacy routes still primary           | ○      | API_REVIEW.md finding #6 |
| `3m0h` | REST routes: missing rate limiting on mutation endpoints                 | ○      | API_REVIEW.md finding #5 |
| `ee5p` | REST routes: inconsistent Zod validation                                 | ○      | API_REVIEW.md finding #4 |
| `e8hs` | tRPC/REST duplication: 16+ domains have parallel REST + tRPC handlers    | ○      | API_REVIEW.md finding #2 |
| `g8c3` | Denormalized aggregate drift risk                                        | ○      | PRISMA_ANALYSIS.md #8    |
| `iswf` | Tackle settings medium-term debt: remove v1 wrappers, add rate limit     | ○      | Settings audit           |
| `uovk` | Migrate Supabase Realtime send() to httpSend() when available            | ○      | Real-time infra          |
| `c2dd` | tRPC Audit Deferred Items: rate-limit infrastructure, router splitting   | ○      | tRPC audit               |
| `7tqj` | Fix mock isolation in remaining colocated tests                          | ○      | Test debt                |
| `hoab` | Add type column to Setting table or migrate to JSONB                     | ✅     | Schema debt              |

### RLS & Security

| ID    | Title                                                                     | Status | Labels                           |
| ----- | ------------------------------------------------------------------------- | ------ | -------------------------------- |
| `57d` | RLS enforcement: wrap remaining ~100 tenant-scoped routes in runWithRLS() | ○      | architecture-debt, rls, security |
| `t78` | RLS expansion: extend policies to 21 non-sensitive tenant tables (M6+)    | ○      | m6-plus, post-launch, rls        |
| `hfy` | Implement per-tenant and per-module usage analytics                       | ○      | analytics, infrastructure        |
| `7cp` | Complete formal POPIA compliance audit for South Africa tenant            | ○      | compliance, security             |
| `jc1` | Implement cookie management for privacy compliance                        | ○      | cookies, netbones, privacy       |

### Provider Platform Gaps

| ID     | Title                                                               | Status |
| ------ | ------------------------------------------------------------------- | ------ |
| `vlfd` | Remote recurring subscription identifiers                           | ○      |
| `he4l` | Dedicated due-diligence workflow table                              | ○      |
| `b51v` | Centralize nav-level provider access gating                         | ○      |
| `zuju` | Harden provider identity bridge                                     | ○      |
| `h3wr` | Listing view/impression telemetry model                             | ○      |
| `27ft` | Migrate admin components from @/components/admin/ to FSD layers     | ○      |
| `a5a5` | Dedicated immutable provider audit/moderation history table         | ○      |
| `rkns` | Add active gateway health probes (replace config+outcome inference) | ○      |
| `woqt` | Backward-compatible refund handling for legacy PayPal transactions  | ○      |

### Features

| ID     | Type    | Title                                                                  | Status |
| ------ | ------- | ---------------------------------------------------------------------- | ------ |
| `m5ug` | feature | Chat E2EE: architecture hardening for secure messaging (Phase 48 prep) | ○      |
| `qyc4` | task    | dWallet future revenue sources: Merits, Referrals, Volunteer Credits   | ○      |

---

## P4 — Backlog (5 issues)

| ID     | Type    | Title                                                                  | Status |
| ------ | ------- | ---------------------------------------------------------------------- | ------ |
| `t764` | task    | G4: Test data — update Soralia Village refs in tests to tenant-neutral | ○      |
| `vs6p` | task    | G4: Static content pages — replace Soralia-branded text                | ○      |
| `c3zg` | task    | Only ~10% of tRPC procedures OpenAPI-exported (24 of 235+)             | ○      |
| `vukt` | task    | Barrel file: src/shared/api/server/index.ts at 234 lines               | ○      |
| `5rqt` | feature | Build settings export/import admin UI                                  | ○      |

---

## Closed Recently

### Session 18 — BD.md Reconciliation (14+ closed)

| ID      | Title                                                                 | Reason                              |
| ------- | --------------------------------------------------------------------- | ----------------------------------- |
| `cs5`   | MyHomeSpace property not linked                                       | Fixed — data/linking issue resolved |
| `8rve`  | Investigate tsc --noEmit hang                                         | Resolved — build config fix         |
| `2at`   | Community Merits & Standing System (Phase 45)                         | Delivered via Phase 45              |
| `k3h`   | Verify external API consumers can access OpenAPI spec                 | Verified                            |
| `qig`   | Build shared HTTP client                                              | Delivered via Phase 44              |
| `fpc`   | Expand tRPC coverage from 2 to all entities                           | Delivered via Phase 44              |
| `22a`   | Add connection pool config + retry to Drizzle                         | Delivered via Phase 44              |
| `4a6`   | RLS migration: proper Prisma migration                                | Delivered via Phase 43              |
| `5z3g`  | Define USER role + role lifecycle                                     | Closed                              |
| `ltn`   | Add request validation plugin                                         | Delivered                           |
| `7td`   | Enable One Tap passkey login                                          | Delivered                           |
| `byj`   | AddWidgetModal search/filter                                          | Delivered                           |
| `ka6`   | Widget placement across Focus Spaces                                  | Decision made                       |
| `6d8`   | Migrate React imports to Preact                                       | Delivered                           |
| `gtm`   | M5+ Post-launch: Notification system                                  | Delivered via Phase 5               |
| `cp8`   | M5+ Post-launch: Payment processing                                   | Delivered via Phase 5               |
| `kia`   | M5+ Post-launch: Provider analytics                                   | Delivered via Phase 4               |
| `9e8`   | M5+ Post-launch: Provider dashboard                                   | Delivered via Phase 4               |
| `69c`   | M5+ Post-launch: Third-party provider registration                    | Delivered via Phase 4               |
| `5u2`   | De-duplicate maintenance API transform logic                          | Delivered via Phase 44              |
| `9xr`   | Extract pure domain helpers                                           | Delivered via Phase 44              |
| `1ei`   | Migrate widget useEffect+fetch to useQuery/useMutation                | Delivered via Phase 44              |
| `b5d`   | Standardize ID strategy across all models                             | Schema audit delivered              |
| `zjm`   | Extract high-frequency JSON fields into proper columns                | Delivered                           |
| `6i9`   | Add soft deletes across all entities                                  | Delivered                           |
| `8re`   | Verify Preact compatibility with TipTap, charts                       | Verified                            |
| `0tb`   | Upgrade to OTP-based password reset                                   | Delivered via M5                    |
| `up2`   | Configure Better Auth background tasks for Vercel                     | Delivered                           |
| `4vk`   | M5+ Post-launch: Service marketplace mobile optimization              | Delivered                           |
| `4fh`   | M5+ Post-launch: Provider billing & subscription                      | Delivered via Phase 4               |
| `axh6`  | DTO schemas duplicated across src/server/dto/ and src/shared/api/dto/ | Closed                              |
| `oqw`   | Phase 3: Wrap API routes with runWithRLS()                            | Delivered via Phase 43              |
| `7qkl`  | i18n: server-side locale routing + content localization               | Delivered via Phase 45-04/45-05     |
| `tc4`   | prisma/seed.ts type errors                                            | Fixed                               |
| `0f7`   | i18n: Database content localization for Tiptap                        | Closed                              |
| `p81.1` | State change: patrol → active                                         | Closed                              |
| `rbs.1` | State change: patrol → active                                         | Closed                              |
| `0orq`  | AI Pool: estimatedCostUSD to AiUsageEvent                             | Delivered                           |
| `7a02`  | AI Pool: estimatedCostUSD aggregation to admin routes                 | Delivered                           |
| `gb5p`  | AI Pool: Make capability required on AiCompletionOptions              | Delivered                           |
| `tbtr`  | AI Pool: Fix ENTERPRISE seed overageTokens                            | Delivered                           |
| `2pxb`  | Soft-delete inconsistency policy                                      | Closed                              |
| `owuh`  | Soft-delete alignment: add deletedAt to orphan child models           | Closed                              |
| `bnxu`  | CI missing redocly lint enforcement for OpenAPI spec                  | Delivered                           |
| `q099`  | Implement dark mode support                                           | Delivered                           |
| `6o5g`  | Avatar dropdown: remove duplicate nav items, add i18n                 | Delivered                           |
| `hiu2`  | Epic: Add @deprecated Use trpc. JSDoc to remaining REST handlers      | Closed (8 subtasks)                 |
| `xlmw`  | Add i18n to dWallet dashboard page                                    | Delivered                           |
| `zb38`  | Group detail page: fix crash when members/contents is undefined       | Fixed                               |

### Session 19 — Auth Gating Audit (3 closed)

| ID     | Title                                                                | Reason                        |
| ------ | -------------------------------------------------------------------- | ----------------------------- |
| `fjtn` | GET /api/content has no authentication — critical                    | Fixed — auth added            |
| `al6p` | Module gating audit: add assertModuleEnabled to 9+ unguarded modules | Delivered                     |
| `6e1y` | Clean up dead auth imports in 14 API routes                          | Delivered                     |
| `hoab` | Add type column to Setting table or migrate to JSONB                 | Delivered — type column added |

### Earlier Sessions

Refer to git history for Session 1–12b closed items.

---

## Recommended Next Actions

1. **`bawf`** — Onboarding refactor (GSD territory — needs phase, not BD)
2. **`63pl`** — ADR-027: Request-Scope Engine advisor review (blocking architecture decision)
3. **`8lus`** — Apply outbox migration + build dispatcher worker (infrastructure)
4. **`z76s`** — Platform architecture hardening: RLS, rate limiting, outbox, API consolidation
5. **`vo6v`** — Ticketing system gap closure: SLA, escalation, notifications
6. **`bgb`** — Epic: Interests Visualization (in-progress)
7. **`hh1t`** — Provider Platform: Paystack/PayPal gateway integration
8. **`5m7l`** — Confirm Schedule F Table 2 revenue share % (dWallet addendum prerequisite)
9. **`sioz`** — Model duplication: seat polymorphism, invoice/payment overlap (in-progress)
10. **`h9o4`** — Adopt notDeleted() helper across all query files

### Architecture Roadmap (from `docs/cleaner_react_architecture.md` audit)

All architecture items from the cleaner_react_architecture.md audit (`qig`, `fpc`, `9xr`, `5u2`, `1ei`) have been closed via Phase 44. See `docs/cleaner_react_architecture.md` for the full audit.
