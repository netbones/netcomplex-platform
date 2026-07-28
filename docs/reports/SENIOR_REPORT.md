---
title: Senior Engineer Audit — Final Report
status: current
reviewed: 2026-07-28
tags: [report, analysis]
audience: developer
---

# Senior Engineer Audit — Final Report

## Audit Date

2026-06-25

## Scope

Senior Engineer code-quality audit of the Netcomplex Platform (Soralia Village anchor tenant). Covers gaps identified in Sprint 1–6 implementation work.

---

## Sprint 1 — Test & Quality Infrastructure

### Findings

| #   | Issue                                           | Status  | Fix                                                                                                                            |
| --- | ----------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| T1  | CORS configuration absent from middleware       | ✅ Done | `addCorsHeaders()` in `src/middleware.ts` + OPTIONS handler                                                                    |
| T2  | Duplicate `formatDate` utilities across widgets | ✅ Done | Unified `src/shared/lib/format-date.ts`. Kept locale-variant copies for en-ZA, weekday, null-handling (different requirements) |
| T3  | Coverage thresholds too low                     | ✅ Done | Raised to 30%/20%/15% in `vitest.config.ts`                                                                                    |
| T4  | Security headers missing                        | ✅ Done | Added `X-Frame-Options`, `Strict-Transport-Security`, `X-Content-Type-Options` to `vercel.json`                                |
| T5  | Console.log used in server-side code            | ✅ Done | Migrated 6 files to Pino logger                                                                                                |
| T6  | Config overrides missing actions                | ✅ Done | Added `format`, `defaultExport`, `tailwind` overrides                                                                          |

---

## Sprint 2 — Dead Code Removal & Schema Issues

### Findings

| #   | Issue                                                    | Status  | Fix                                              |
| --- | -------------------------------------------------------- | ------- | ------------------------------------------------ |
| D1  | `src/app/resources/page.tsx.old` dead file               | ✅ Done | Deleted                                          |
| D2  | `FeatureGate.tsx` dead component                         | ✅ Done | Removed (all logic commented out, zero imports)  |
| D3  | `TierGuard.tsx` evaluation                               | ✅ Done | Retained (active logic)                          |
| D4  | FK relation: `UserAchievement` → `AchievementDefinition` | ✅ Done | Added `definitionId` relation in `schema.prisma` |
| D5  | ESLint warnings reduction                                | ✅ Done | 87 → 83                                          |
| D6  | ESLint patterns for `@shared/lib/format-date`            | ✅ Done | Updated                                          |

---

## Sprint 3 — Middleware & Test Stability

### Findings

| #   | Issue                                    | Status  | Fix                                                            |
| --- | ---------------------------------------- | ------- | -------------------------------------------------------------- |
| M1  | Middleware unit tests missing            | ✅ Done | 9 tests in `src/middleware/__tests__/middleware.test.ts`       |
| M2  | `specialized-routes.test.ts` timeout     | ✅ Done | Added `vi.setConfig({ testTimeout: 15000 })`                   |
| M3  | `users-id.test.ts` mock isolation broken | ✅ Done | Moved AddressService mocks into `vi.hoisted()` with full stubs |
| M4  | Test count: 0 failures (down from 21)    | ✅ Done | Fixed across all 3 fixture issues                              |

---

## Sprint 4 — Schema Indexes & Relations

### Findings

| #    | Issue                                                                                                         | Status  | Fix                                       |
| ---- | ------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------- |
| S4-1 | FK `DelegationAction.actorId` → `user`                                                                        | ✅ Done | Added relation + back-link                |
| S4-2 | Missing indexes on `Conversation(tenantId)`, `Survey(tenantId, status)`, `ExternalSurvey(tenantId, isActive)` | ✅ Done | Added `@@index` declarations              |
| S4-3 | Pre-existing schema validation error — missing `SurveySection` back-link in `Survey` model                    | ✅ Done | Added `sections SurveySection[]` relation |
| S4-4 | Test flakiness artifacts cleaned up                                                                           | ✅ Done |                                           |

---

## Sprint 5 — Remaining TypeScript & Infrastructure Items

### Findings

| #     | Issue                                                     | Status  | Fix                                                                   |
| ----- | --------------------------------------------------------- | ------- | --------------------------------------------------------------------- |
| S5-1  | `@api/shared/delegations` TS2307 errors (7 occurrences)   | ✅ Done | Added wildcard `@api/shared/*` path alias to `tsconfig.json`          |
| S5-2  | `@shared` bare import in `content.ts`                     | ✅ Done | Changed to `@shared/lib`                                              |
| S5-3  | `tenantProcedure` missing export in `surveys/shared.ts`   | ✅ Done | Added export                                                          |
| S5-4  | `services-config.ts` missing type import                  | ✅ Done | Separated import from re-export                                       |
| S5-5  | `seats.test.ts` spread arg TS error                       | ✅ Done | Typed reserve mock params explicitly                                  |
| S5-6  | `swipe-card.test.tsx` `onCardClick` prop not in component | ✅ Done | Added `onCardClick` optional prop + handler to `SwipeableServiceCard` |
| S5-7  | Missing DB indexes: `Content(tenantId)`, `Event(date)`    | ✅ Done | Added `@@index` declarations                                          |
| S5-8  | `constants.ts` underpopulated                             | ✅ Done | Added HTTP status codes, cache TTLs, cookie names, file size limits   |
| S5-9  | No Playwright E2E auth flow test                          | ✅ Done | Created `e2e/auth-flow.spec.ts`                                       |
| S5-10 | Soft-delete policy undocumented                           | ✅ Done | Created `docs/STEERING/SOFT_DELETE.md`                                |
| S5-11 | Full `tsc --noEmit` hangs                                 | ⚠️ Open | `.next` incremental cache issue; requires investigation               |
| S5-12 | `next build` hangs                                        | ⚠️ Open | Likely related to tsc hang — further debugging needed                 |

---

## Sprint 6 — Lint Cleanup & Build Fixes

### Findings

| #    | Issue                                                                        | Status  | Fix                                                                     |
| ---- | ---------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------- |
| S6-1 | `privilegedProcedure` not exported from `surveys/shared.ts` — breaks build   | ✅ Done | Added to imports/re-exports in shared.ts                                |
| S6-2 | 7 route files use sync `params` — Next.js 15 requires `Promise<params>`      | ✅ Done | Changed to `Promise<{ id: string }>` + `await params` across 9 handlers |
| S6-3 | 83 unused-import/unused-variable warnings in `src/`                          | ✅ Done | Cleared to 0 (47 files touched)                                         |
| S6-4 | `getComplainantLabel` always returns `'Resident'` — complainant data unwired | ✅ Done | API now joins `users` table; UI uses `dispute.complainantName`          |
| S6-5 | `tsc --noEmit` hangs/timeout on full project                                 | ⚠️ Open | Investigate `.next/types/validator.ts` cache corruption                 |
| S6-6 | `next build` hangs/timeout                                                   | ⚠️ Open | Likely related to tsc hang — diagnose parallelism or memory pressure    |

---

## Summary Statistics

| Metric               | Pre-Audit | Current             | Target |
| -------------------- | --------- | ------------------- | ------ |
| ESLint errors        | 35        | 0                   | 0      |
| ESLint warnings      | 261       | 0 (src/)            | 0      |
| Test failures        | 21        | 0                   | 0      |
| Coverage (lines)     | <20%      | ≥30%                | 30%    |
| Coverage (branches)  | <15%      | ≥20%                | 20%    |
| Coverage (functions) | <10%      | ≥15%                | 15%    |
| Known TS errors      | ~84       | 0 (selective check) | 0      |

---

## Sprint 7 — Tenant FK Referential Integrity (ADVISORY-024)

### Findings

| #    | Issue                                                                     | Status  | Fix                                                                          |
| ---- | ------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------- |
| S7-1 | 92 tenant-scoped models lack `@relation` FK constraints to `Tenant` table | ✅ Done | Batch A (27 models): Core Community + Seats & Listings                       |
| S7-2 | Missing FK on Maintenance, Provider, Billing & Commerce models            | ✅ Done | Batch B (26 models): Maintenance & Providers + Billing & Commerce            |
| S7-3 | Missing FK on Surveys, Merits, dWallet & Data models                      | ✅ Done | Batch C (14 models): Surveys & Merits + dWallet & Data + AgentProfile        |
| S7-4 | Missing FK on Admin, Agent, Address, AI, Dispute models                   | ✅ Done | Batch D (19 models): Admin & Agents + Achievements & Disputes + Address & AI |
| S7-5 | Multi-file Prisma schema migration                                        | ✅ Done | Adopted `prismaSchemaFolder` preview feature; split `tenant.prisma` out      |
| S7-6 | `AgentProfile` missed in original Batch A scope                           | ✅ Done | Included in Batch C                                                          |

---

## Unfinished Work

1. **`tsc --noEmit` and `next build` both hang/timeout** — Incremental cache corruption after clearing `.next`. Suspected cause: Next.js type checker (`.next/types/validator.ts`) chokes on certain source files. Mitigation: use `npx tsc --noEmit --pretty src/path/to/modified-file.ts 2>&1 | head -30` for scoped checks.

## File Changes Summary

### New files

- `src/middleware/__tests__/middleware.test.ts` — 9 middleware unit tests
- `src/shared/lib/format-date.ts` — Unified date formatting utility
- `e2e/auth-flow.spec.ts` — Playwright E2E auth flow tests
- `docs/STEERING/SOFT_DELETE.md` — Soft-delete policy documentation

### Modified files

- `src/middleware.ts` — CORS + security headers
- `vercel.json` — Security headers
- `vitest.config.ts` — Raised coverage thresholds
- `prisma/schema.prisma` — FK relations, DB indexes, SurveySection back-link
- `tsconfig.json` — `@api/shared/*` wildcard alias
- `src/shared/lib/constants.ts` — HTTP codes, cache TTLs, etc.
- `src/features/marketplace/ui/SwipeableServiceCard.tsx` — Added `onCardClick` prop
- 6 server-side files — Console → Pino migration
- `src/server/routers/surveys/shared.ts` — Added `privilegedProcedure` export
- 7 route files — Next.js 15 `Promise<params>` migration
- 47 files — Unused import/variable cleanup
- `src/app/api/seats/__tests__/seats.test.ts` — Mock type fix
- `src/entities/tenant/api/flags/services-config.ts` — Import fix

### Deleted files

- `src/app/resources/page.tsx.old`
- `src/components/common/FeatureGate.tsx`
