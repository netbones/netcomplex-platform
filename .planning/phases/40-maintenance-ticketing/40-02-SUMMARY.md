---
phase: 40-maintenance-ticketing
plan: 02
subsystem: maintenance-api
tags: [api, crud, teams, providers, categories, assignment, ticketing, activity, bugfix]
dependency_graph:
  requires: [40-01]
  provides:
    [
      teams-api,
      providers-api,
      categories-api,
      assign-api,
      ticket-number-gen,
      activity-7-status,
      notes-fix,
    ]
  affects: [maintenance-routes, admin-activity, maintenance-stats, dto]
tech_stack:
  added: [drizzle-orm joins, inArray for multi-priority, sql CASE 7-status]
  patterns:
    [
      soft-delete for teams/providers/categories,
      comma-separated priority filter,
      ticket number generation,
    ]
key_files:
  created:
    - src/app/api/maintenance/teams/route.ts
    - src/app/api/maintenance/teams/[id]/route.ts
    - src/app/api/maintenance/providers/route.ts
    - src/app/api/maintenance/providers/[id]/route.ts
    - src/app/api/maintenance/categories/route.ts
    - src/app/api/maintenance/categories/[id]/route.ts
    - src/app/api/maintenance/[id]/assign/route.ts
  modified:
    - src/entities/maintenance/services/index.ts
    - src/entities/maintenance/api/route.ts
    - src/shared/api/dto/maintenance.ts
    - src/app/api/maintenance/route.ts
    - src/app/api/maintenance/[id]/route.ts
    - src/app/api/maintenance/[id]/notes/route.ts
    - src/app/api/admin/activity/route.ts
    - src/app/api/admin/maintenance-stats/route.ts
    - src/entities/maintenance/model/constants.ts
decisions:
  - Ticket number format SRV-{YYYY}-{NNNN} — count-based sequential within year per tenant
  - Comma-separated priority values parsed with inArray() instead of duplicate query params
  - Soft-delete for teams/providers/categories when active assignments exist; hard delete otherwise
  - Category value field immutable after creation to prevent breaking FK references
  - Resident notes bug fixed by filtering isInternal=false instead of 403 on any internal note
metrics:
  duration: ~25min
  completed: 2026-06-01
---

# Phase 40 Plan 02: API + Services Summary

Ticket number generation, CRUD for teams/providers/categories, assignment with history tracking, 7-status activity feed, resident notes bug fix.

## Completed Tasks

| Task | Name                                           | Commit  | Files                                                                |
| ---- | ---------------------------------------------- | ------- | -------------------------------------------------------------------- |
| 1    | Create team, provider, category API routes     | c5a0f89 | 7 new route files                                                    |
| 2    | Update existing maintenance API routes         | 34e4e7c | services, dto, route.ts, [id]/route.ts, notes/route.ts, api/route.ts |
| 3    | Fix admin activity zone, stats, remaining bugs | 1e1a51d | activity/route.ts, maintenance-stats/route.ts, constants.ts          |

## Key Changes

### Task 1: New CRUD Routes

- **GET/POST /api/maintenance/teams** — list/create in-house maintenance teams
- **PATCH/DELETE /api/maintenance/teams/[id]** — update/archive team (soft-delete when active assignments)
- **GET/POST /api/maintenance/providers** — list/create service providers
- **PATCH/DELETE /api/maintenance/providers/[id]** — update/archive provider
- **GET/POST /api/maintenance/categories** — list/create tenant categories (unique value per tenant)
- **PATCH/DELETE /api/maintenance/categories/[id]** — update/archive category (value immutable)
- **POST /api/maintenance/[id]/assign** — assign/reassign with history tracking, auto-transition SUBMITTED→ASSIGNED

### Task 2: Existing Routes Updated

- **services/index.ts**: `generateTicketNumber()` (SRV-{YYYY}-{NNNN}), `buildMaintenanceConditions()` with comma-separated priority via `inArray()`, `listMaintenanceRequests()` joins teams/providers, `createMaintenanceRequest()` with ticket number + preferredDate/Time
- **dto/maintenance.ts**: Added ticketNumber, preferredDate/Time, assignedTeamId/ProviderId to DTO
- **route.ts** (GET/POST): POST uses `createMaintenanceRequest` service, GET returns team/provider info, ticket number, search includes ticketNumber
- **[id]/route.ts**: PATCH supports all 7 statuses, tracks assignedTeamId/assignedProviderId changes with resolved team/provider names in history entries, sets completedAt on COMPLETED
- **[id]/notes/route.ts**: Fixed resident 403 bug — now filters `isInternal=false` for residents instead of returning 403 if any internal note exists

### Task 3: Activity + Stats

- **admin/activity/route.ts**: CASE statement updated from 4→7 statuses (added ASSIGNED, SCHEDULED, PENDING_PARTS), metadata includes ticketNumber
- **maintenance-stats/route.ts**: byStatus GROUP BY automatically covers all 7 statuses, comment added for clarity
- **constants.ts**: Added fallback comment — prefer reading from MaintenanceCategory table

## Deviations from Plan

None — plan executed exactly as written.

## Verification Checklist

- [x] Can create/list/update/archive teams via API
- [x] Can create/list/update/archive providers via API
- [x] Can create/list/update/archive categories via API
- [x] Ticket creation generates ticketNumber with tenant format
- [x] preferredDate/preferredTime are stored and returned
- [x] Assignment creates history entries
- [x] Admin activity feed shows maintenance events with all 7 statuses
- [x] Resident can view non-internal notes (no 403)
- [x] MaintenanceRequestsWidget correctly fetches EMERGENCY + HIGH priority (via comma-separated param)
- [x] TypeScript compiles cleanly (no errors in modified files)
