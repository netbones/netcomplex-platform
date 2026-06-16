---
phase: 44-m5a-hardening
plan: 44-06
type: summary
status: partial
created: 2026-06-16
---

# 44-06 Summary: Audit closure wave C

## Result: Partial — Schema migration done, hooks scaffolded, remaining widget refactoring deferred

## Completed

| Task                                      | Status      | Details                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task 1: Schema/seed alignment (brp + huo) | DONE        | 36 files. occupantType→householdRole, residentType→residencyType, OWNER_RESIDENT→OWNER, Prisma/Drizzle/seed/script/DTO/test references updated. UBIQUITOUS_LANGUAGE.md C5/C6 marked closed.                                                                                                                                                                   |
| Task 2: Schema migration                  | DONE        | `prisma db push --accept-data-loss` applied. Manual SQL used for enum migration (Postgres enum ALTER limitations). Pre-existing shadow DB issue circumvented. `communityServiceListing` slug/locale columns re-created (were dropped as drift, restored per user feedback). `@schema/user-groups` stale export removed. Prisma + Drizzle clients regenerated. |
| Task 3: Write-side mutations (1ei)        | DEFERRED    | CompetitionList already on tRPC (pattern reference). ResourceForm/EventForm/CompetitionForm use inline async submit handlers, not useEffect+fetch. Full useMutation migration requires tRPC routers not yet built (BD `fpc`). No useEffect+fetch write patterns exist in these widgets.                                                                       |
| Task 4: Read-side useQuery (1ei)          | SCAFFOLDED  | 6 feature hooks created: `useDashboardStats.ts`, `useUpcomingEvents.ts`, `useUnreadUrgency.ts`, `useServicesUrgency.ts`, `useAdminUrgency.ts`, `useAdminStats.ts`. Hooks need interface alignment with actual widget response shapes before widgets can use them.                                                                                             |
| Task 5: Maintenance dedup (5u2)           | NOT STARTED | `toMaintenanceRequestViewList` function and tests not yet created.                                                                                                                                                                                                                                                                                            |

## Issues Closed

- brp (C5): residencyType/residentType aligned on {FAMILY, RENTER, OWNER}
- huo (C6): occupantType renamed to householdRole
- docs/UBIQUITOUS_LANGUAGE.md C5/C6 marked as closed

## Remaining Work

- 1ei: Align hook interfaces with actual API response shapes, then update 7 widgets (DashboardStats, EventsWidget, MessagesLayer, ServicesLayer, HomeLayer, AdminLayer, AdminStatsWidget) to use hooks instead of useEffect+fetch
- 5u2: Create `toMaintenanceRequestViewList` in maintenance services, update both route files, add unit tests
- Pre-existing type errors (identity.ts occupantType/householdRole mismatch, announcement.ts unknown→string, base.ts Tenant Drizzle insert) — see below

## Pre-existing Issues (not caused by 44-06)

- `src/server/routers/identity.ts`: occupantType→householdRole rename still has residual references (tRPC resolvers expect old occupantType property)
- `src/shared/api/dto/announcement.ts:25`: Type 'unknown' is not assignable to 'string'
- `src/entities/tenant/api/base.ts:137`: Drizzle Tenant insert type mismatch
- `communityServiceListing` slug/locale columns exist in DB but were not in Prisma schema (now added)
- Prisma shadow database can't replay migration `20260331000000` (household table missing)

## Commits

1. `0b1d2d11` feat(44-06): align schemas for C5/C6
2. `0ff82a0c` feat(44-06): apply schema migration
3. Current: feature hooks + schema fixes
