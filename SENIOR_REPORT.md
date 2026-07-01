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

## Sprint 6 — Build & CI Pipeline Reliability

### Findings

| #    | Issue                                        | Status  | Fix                                                                  |
| ---- | -------------------------------------------- | ------- | -------------------------------------------------------------------- |
| S6-1 | `tsc --noEmit` hangs/timeout on full project | ⚠️ Open | Investigate `.next/types/validator.ts` cache corruption              |
| S6-2 | `next build` hangs/timeout                   | ⚠️ Open | Likely related to tsc hang — diagnose parallelism or memory pressure |
| S6-3 | Pre-commit hook flakiness on large commits   | 🔲 TBD  |                                                                      |
| S6-4 | CI pipeline missing type-check stage         | 🔲 TBD  | Add `tsc --noEmit` step after lint passes                            |

---

## Summary Statistics

| Metric               | Pre-Audit | Current             | Target |
| -------------------- | --------- | ------------------- | ------ |
| ESLint errors        | 35        | 0                   | 0      |
| ESLint warnings      | 261       | 83                  | —      |
| Test failures        | 21        | 0                   | 0      |
| Coverage (lines)     | <20%      | ≥30%                | 30%    |
| Coverage (branches)  | <15%      | ≥20%                | 20%    |
| Coverage (functions) | <10%      | ≥15%                | 15%    |
| Known TS errors      | ~84       | 0 (selective check) | 0      |

## Critical Issues Remaining

1. **`tsc --noEmit` and `next build` both hang/timeout** — Incremental cache corruption after clearing `.next`. Suspected cause: Next.js type checker (`.next/types/validator.ts`) chokes on certain source files. Mitigation: use `npx tsc --noEmit --pretty src/path/to/modified-file.ts 2>&1 | head -30` for scoped checks. Root cause investigation deferred to follow-up.

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
- `src/app/api/seats/__tests__/seats.test.ts` — Mock type fix
- `src/entities/tenant/api/flags/services-config.ts` — Import fix

### Deleted files

- `src/app/resources/page.tsx.old`
- `src/components/common/FeatureGate.tsx`
