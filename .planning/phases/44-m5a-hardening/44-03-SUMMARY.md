---
phase: 44-m5a-hardening
plan: 44-03
type: execute
status: complete
title: 'Audit closure wave A — barrel fix, HTTP client, domain helpers, property shape audit'
created: 2026-06-08
updated: 2026-06-08
---

# Plan 44-03 SUMMARY

## BD Issues Closed

| Issue  | Priority | Status    | Closure Note                                                                                                                   |
| ------ | -------- | --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `r13u` | P2       | ✅ CLOSED | Added 3 missing re-exports to `@entities/tenant` barrel (`./api/tenant`, `./api/permissions`, `./model/types`)                 |
| `qig`  | P2       | ✅ CLOSED | `src/shared/api/http-client.ts` created with 4 typed methods + auth injection + envelope unwrap; 7 consumer files migrated     |
| `9xr`  | P3       | ✅ CLOSED | `getEffectiveRole()` extracted as pure function; `formatTicketNumber()` extracted; proper maintenance permissions module built |
| `2z4`  | P2       | ✅ CLOSED | All 5 Property shapes + 2 widget-local listing types audited, documented with JSDoc tags; no consolidation needed per C1       |

## Artifacts Created (5 new files)

| File                                                                 | Lines | Description                                                                                                 |
| -------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------- |
| `src/shared/api/http-client.ts`                                      | 94    | Typed HTTP client: `apiGet`/`apiPost`/`apiPatch`/`apiDelete` + `ApiClientError`                             |
| `src/shared/api/__tests__/http-client.test.ts`                       | 99    | Unit tests for envelope unwrapping, error handling, method correctness (9 tests)                            |
| `src/entities/tenant/model/roles.ts`                                 | 18    | Pure `getEffectiveRole()` function                                                                          |
| `src/entities/tenant/model/__tests__/roles.test.ts`                  | 33    | Unit tests for all 4 role priorities + edge cases (5 tests)                                                 |
| `src/entities/maintenance/permissions/__tests__/permissions.test.ts` | 55    | Unit tests for `canViewAllRequests`/`canAssignRequests`/`canResolveRequests`/`canDeleteRequests` (10 tests) |

## Files Modified (17 files)

| File                                                  | Change                                                                         | Task |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ | ---- |
| `src/entities/tenant/index.ts`                        | +3 lines (added 3 missing barrel re-exports)                                   | r13u |
| `src/entities/tenant/model/useIdentity.ts`            | -6 lines (replaced inline role logic with `getEffectiveRole()`)                | 9xr  |
| `src/entities/maintenance/services/index.ts`          | +15/-1 lines (added `formatTicketNumber()`, refactored `generateTicketNumber`) | 9xr  |
| `src/entities/maintenance/permissions/index.ts`       | Rewrote (one-line re-export → 4 proper permission functions)                   | 9xr  |
| `src/features/chat/model/useConversationList.ts`      | Migrated to `apiGet`                                                           | qig  |
| `src/features/chat/model/useMessageSend.ts`           | Migrated to `apiPost`                                                          | qig  |
| `src/features/chat/ui/CreateConversationModal.tsx`    | Migrated to `apiPost`                                                          | qig  |
| `src/features/directory/model/useResidentFilter.ts`   | Migrated to `apiGet`, simplified 3-branch response handling                    | qig  |
| `src/features/directory/ui/DirectoryChatModal.tsx`    | Migrated 3 fetch sites to `apiGet`/`apiPost`                                   | qig  |
| `src/features/directory/ui/DirectoryGrid.tsx`         | Migrated to `apiGet`                                                           | qig  |
| `src/shared/lib/hooks/usePageFlags.ts`                | Migrated to `apiGet`, simplified unwrapping                                    | qig  |
| `src/entities/directory/model/types.ts`               | Added `@property-consolidation-plan` JSDoc                                     | 2z4  |
| `src/entities/user/model/types.ts`                    | Added `@property-consolidation-plan` JSDoc                                     | 2z4  |
| `src/entities/tenant/model/types.ts`                  | Added `@property-consolidation-plan` JSDoc                                     | 2z4  |
| `src/shared/api/dto/property.ts`                      | Added `@property-consolidation-plan` JSDoc (×2)                                | 2z4  |
| `src/widgets/dashboard/ui/AgentWidget.tsx`            | Added `@property-consolidation-plan` JSDoc                                     | 2z4  |
| `src/widgets/dashboard/ui/PremiumPortfolioWidget.tsx` | Added `@property-consolidation-plan` JSDoc                                     | 2z4  |

## Test Results

| Test Suite                                           | Tests | Status  |
| ---------------------------------------------------- | ----- | ------- |
| `http-client.test.ts`                                | 9     | ✅ PASS |
| `roles.test.ts`                                      | 5     | ✅ PASS |
| `permissions.test.ts` (maintenance)                  | 10    | ✅ PASS |
| `permissions.test.ts` (existing, `@entities/tenant`) | 15    | ✅ PASS |

All 39 tests pass. Zero regressions.

## Pre-Existing Typecheck Errors

Pre-existing typecheck errors (40+) are unchanged by this plan. This plan resolves 1 of the known TS2305 errors (`tenantConfig` now importable from `@entities/tenant` barrel). All other pre-existing errors documented in 44-02-SUMMARY.md remain.

## Property Audit Findings

All 5 Property shapes + 2 widget-local listing types audited. Per C1 resolution: no field renames, no consolidation changes. All shapes serve distinct purposes and are consistent with Prisma field names. Full findings table in PLAN.md Task 5.

## Follow-up

- Remaining 229 raw `fetch()` call sites tracked for future migration (qig established the pattern)
- Plan 44-04 (Audit closure wave B) is the next plan — `fpc` tRPC expansion + `1eh` gating migration Phase 2/3
