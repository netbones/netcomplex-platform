---
phase: 40-maintenance-ticketing
plan: 01
subsystem: database
tags: [prisma, drizzle, postgres, schema, migration]

requires:
  - phase: none
provides:
  - RequestStatus enum with 7 values (SUBMITTED, ASSIGNED, SCHEDULED, IN_PROGRESS, PENDING_PARTS, COMPLETED, CANCELLED)
  - MaintenanceTeam, ServiceProvider, MaintenanceCategory Prisma/Drizzle models
  - RequestNote and RequestHistory as Prisma-native models with proper FK relations
  - Extended MaintenanceRequest with ticketNumber, preferredDate, preferredTime, assignedTeamId, assignedProviderId
  - Generated Drizzle schemas for all new tables
affects: [40-02, 40-03, 40-04, maintenance-api, admin-activity, home-layer]

tech-stack:
  added: []
  patterns:
    - 'Prisma-native RequestNote/RequestHistory replacing ad-hoc Drizzle pgTable definitions'
    - 'prisma db push as migration method (Supabase pooler incompatibility with prisma migrate dev)'

key-files:
  created:
    - src/db/schema/maintenance-teams.ts
    - src/db/schema/service-providers.ts
    - src/db/schema/maintenance-categories.ts
    - src/db/schema/request-notes.ts
    - src/db/schema/request-histories.ts
  modified:
    - prisma/schema.prisma
    - src/db/schema/request-status-enum.ts
    - src/db/schema/maintenance-requests.ts
    - src/shared/api/db.ts
    - src/entities/maintenance/model/types.ts

key-decisions:
  - 'RequestStatus enum extended from 4 to 7 values in Prisma schema, adding ASSIGNED, SCHEDULED, PENDING_PARTS'
  - 'RequestNote and RequestHistory moved from ad-hoc Drizzle pgTable defs to Prisma-native models with proper FK relations'
  - 'Used prisma db push instead of prisma migrate dev due to Supabase shadow DB incompatibility'
  - 'MaintenanceCategory uses @@unique([tenantId, value]) for tenant-scoped slug uniqueness'
  - 'assignedTeamId and assignedProviderId FKs on MaintenanceRequest with named relations TeamAssignments/ProviderAssignments'

patterns-established:
  - 'All new tables use UUID text IDs (crypto.randomUUID()) not auto-increment'
  - 'New models follow tenantId indexing pattern for RLS compatibility'
  - 'Ad-hoc Drizzle table definitions replaced by prisma-generator-drizzle output imported via @db/schema'

requirements-completed: [MAINT-TICKET-01, MAINT-TICKET-09]

duration: 15min
completed: 2026-05-31
---

# Phase 40 Plan 01: Schema Migration Summary

**Prisma schema extended for 7-status maintenance ticketing with teams, providers, categories, and proper FK relations**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-31T16:00:00Z
- **Completed:** 2026-05-31T16:15:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Extended RequestStatus enum from 4 to 7 values (added ASSIGNED, SCHEDULED, PENDING_PARTS)
- Added 5 new Prisma models: MaintenanceTeam, ServiceProvider, MaintenanceCategory, RequestNote, RequestHistory
- Extended MaintenanceRequest with ticketNumber, preferredDate, preferredTime, assignedTeamId, assignedProviderId
- Removed ad-hoc Drizzle table definitions from db.ts, replaced with generated schema imports
- Migration applied via `prisma db push` — all Drizzle schemas auto-generated

## Task Commits

1. **Task 1: Update Prisma schema** - `e9e9979` (feat)
2. **Task 2: Generate Drizzle schemas and update imports** - `61263f4` (feat)

## Files Created/Modified

- `prisma/schema.prisma` - 7-value RequestStatus enum + 5 new models + extended MaintenanceRequest
- `src/db/schema/request-status-enum.ts` - Auto-generated with 7 values
- `src/db/schema/maintenance-teams.ts` - Auto-generated Drizzle table
- `src/db/schema/service-providers.ts` - Auto-generated Drizzle table
- `src/db/schema/maintenance-categories.ts` - Auto-generated Drizzle table
- `src/db/schema/request-notes.ts` - Auto-generated Drizzle table
- `src/db/schema/request-histories.ts` - Auto-generated Drizzle table
- `src/shared/api/db.ts` - Removed ad-hoc defs, added generated schema imports
- `src/entities/maintenance/model/types.ts` - Added MaintenanceTeam, ServiceProvider, MaintenanceCategory, TicketAssignment interfaces

## Decisions Made

- Used `prisma db push` instead of `prisma migrate dev` due to Supabase pooler connection incompatibility with shadow DB
- RequestNote/RequestHistory moved to Prisma schema for proper FK cascade deletes and type generation
- MaintenanceCategory uses `@@unique([tenantId, value])` ensuring tenant-scoped slug uniqueness
- Named relations (TeamAssignments, ProviderAssignments) avoid ambiguity with multiple MaintenanceRequest FKs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Schema ready for 40-02 API route creation (teams, providers, categories, assignment)
- All Drizzle tables available via `@api/db` imports
- TypeScript types in `src/entities/maintenance/model/types.ts` ready for API layer

---

_Phase: 40-maintenance-ticketing_
_Completed: 2026-05-31_
