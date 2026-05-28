---
phase: 35-api-alignment
plan: E01
name: Canonical Module Structure Rollout
subsystem: api-layer
tags:
  - module-ownership
  - refactoring
  - entity-structure
  - service-layer
requires: [35-C01, 35-C02]
provides:
  - Canonical module structure for 4 core entities
  - Business logic extracted from route handlers into services
affects:
  - src/app/api/bookings/route.ts
  - src/app/api/maintenance/route.ts
  - src/app/api/events/route.ts
  - src/app/api/content/route.ts
  - src/entities/booking/* (new api/, dto/, services/, permissions/)
  - src/entities/maintenance/* (new api/, dto/, services/, permissions/)
  - src/entities/events/* (new api/, dto/, services/, permissions/)
  - src/entities/content/* (new api/, dto/, services/, permissions/)
tech-stack:
  added: []
  patterns:
    - Entity-owned api/ subdirectory for module-scoped API logic
    - Entity-owned services/ for HTTP-free business logic extraction
    - Entity-owned dto/ re-exporting from shared canonical DTOs
    - Entity-owned permissions/ for module-specific permission helpers
key-files:
  created:
    - src/entities/booking/services/index.ts (booking business logic: getTenantFacilities, validateFacility, listBookings, createBooking)
    - src/entities/booking/api/route.ts (entity-scoped booking API logic)
    - src/entities/booking/dto/index.ts (re-exports from @api/dto/booking)
    - src/entities/booking/permissions/index.ts (canViewAllBookings)
    - src/entities/maintenance/services/index.ts (maintenance business logic: buildMaintenanceConditions, listMaintenanceRequests, createMaintenanceRequest)
    - src/entities/maintenance/api/route.ts (entity-scoped maintenance API logic)
    - src/entities/maintenance/dto/index.ts (re-exports from @api/dto/maintenance)
    - src/entities/maintenance/permissions/index.ts (canViewAllRequests)
    - src/entities/events/services/index.ts (event business logic: listEvents, validateEventFields, createEvent)
    - src/entities/events/api/route.ts (entity-scoped event API logic)
    - src/entities/events/dto/index.ts (re-exports from @api/dto/event)
    - src/entities/events/permissions/index.ts (canManageEvents)
    - src/entities/content/services/index.ts (content business logic: buildContentConditions, listContent, resolveLocale, transformContentForLocale, createContent)
    - src/entities/content/api/route.ts (entity-scoped content API logic)
    - src/entities/content/dto/index.ts (re-exports from @api/dto/content)
    - src/entities/content/permissions/index.ts (canManageContent, canManageOwnContent)
  modified:
    - src/app/api/bookings/route.ts (delegates to bookingService)
    - src/app/api/maintenance/route.ts (delegates to maintenanceService)
    - src/app/api/events/route.ts (delegates to eventsService)
    - src/app/api/content/route.ts (delegates to contentService)
decisions:
  - Entity DTOs re-export from @shared/api/dto (shared canonical layer) — avoids duplication during transition
  - service/searchMaintenanceRequests removed from service layer — operates on DTO-transformed data, kept inline in route handler
  - Third auto-fix needed: TypeScript enum types for category and priority fields must match Drizzle schema pgEnum types
metrics:
  duration: 12m
  completed: 2026-05-28
  files_created: 16
  files_modified: 3
---

# Phase 35 Plan E01: Canonical Module Structure Rollout

**One-liner:** Extracted business logic from 4 flat route handlers into entity-owned services/, api/, dto/, permissions/ directories following the canonical module ownership model from API_ARCHITECTURE.md §11 and API.md §19. Route handlers now act as thin orchestrators delegating to services.

## Tasks

### Task 1: Establish canonical module structure for 4 core entities ✓

Created 16 files across 4 entities (booking, maintenance, events, content):

| Entity          | Files Created                                                               | Key Service Functions                                                                                            |
| --------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **booking**     | `api/route.ts`, `dto/index.ts`, `services/index.ts`, `permissions/index.ts` | `getTenantFacilities()`, `validateFacility()`, `listBookings()`, `createBooking()`                               |
| **maintenance** | `api/route.ts`, `dto/index.ts`, `services/index.ts`, `permissions/index.ts` | `buildMaintenanceConditions()`, `listMaintenanceRequests()`, `createMaintenanceRequest()`                        |
| **events**      | `api/route.ts`, `dto/index.ts`, `services/index.ts`, `permissions/index.ts` | `listEvents()`, `validateEventFields()`, `createEvent()`                                                         |
| **content**     | `api/route.ts`, `dto/index.ts`, `services/index.ts`, `permissions/index.ts` | `buildContentConditions()`, `listContent()`, `resolveLocale()`, `transformContentForLocale()`, `createContent()` |

**Commit:** `9e4170e`

### Task 2: Refactor flat route handlers to use entity services ✓

Updated 4 route handlers to delegate business logic to entity services:

| Route              | Before (inline logic)                                             | After (service delegation)                                                                             |
| ------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `/api/bookings`    | 30 lines of settings parsing, query building, facility validation | `bookingService.listBookings()`, `bookingService.validateFacility()`, `bookingService.createBooking()` |
| `/api/maintenance` | 50 lines of query conditions, admin/resident dual queries         | `maintenanceService.listMaintenanceRequests()`, `maintenanceService.createMaintenanceRequest()`        |
| `/api/events`      | 20 lines of query branching (upcoming vs all)                     | `eventsService.listEvents()`, `eventsService.createEvent()`                                            |
| `/api/content`     | 40 lines of where conditions, select fields, localization         | `contentService.listContent()`, `contentService.createContent()`                                       |

- All GET/POST export names preserved
- All response shapes unchanged
- Route handlers now thin: parse request → auth checks → call service → return response

**Commit:** `41e6485`

## Verification

- `npx tsc --noEmit` — only pre-existing prisma/seed.ts errors (unrelated)
- All 4 route handlers import from entity services (grep verified)
- Services have no `NextResponse` imports — HTTP-independent
- Canonical module structure (api/, dto/, services/, permissions/) exists for all 4 entities

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Type compatibility] Enum types must match Drizzle schema pgEnum types**

- **Found during:** Task 2 - TypeScript compilation
- **Issue:** Service function parameters used `string` for `category` and `priority` fields, but Drizzle's `.insert().values()` expects the exact pgEnum types (e.g., `'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'` for priority)
- **Fix:** Updated `entities/maintenance/services/index.ts` and `entities/content/services/index.ts` parameter types to use literal union types matching the Drizzle schema enums
- **Files modified:** `src/entities/maintenance/services/index.ts`, `src/entities/content/services/index.ts`
- **Commit:** `41e6485`

**2. [Rule 3 - Build error] Events service query chaining type mismatch**

- **Found during:** Task 2 - TypeScript compilation
- **Issue:** Reassigning `db.select().from()` query variable after `.where()` chaining produces incompatible Drizzle types
- **Fix:** Restructured `listEvents()` to complete full query chains in each branch instead of mutating a shared variable
- **Files modified:** `src/entities/events/services/index.ts`
- **Commit:** `41e6485`

**3. [Rule 3 - Missing function] searchMaintenanceRequests used raw user `address` property that doesn't exist on users table**

- **Found during:** Task 2 - TypeScript compilation
- **Issue:** Service function accessed `r.user?.address?.street` but `users` table has no `address` field (address comes from joined `properties` table)
- **Fix:** Removed `searchMaintenanceRequests()` from service layer (it operates on DTO-transformed data, not raw DB rows) — search filter kept inline in route handlers where it has access to DTO shapes
- **Files modified:** `src/entities/maintenance/services/index.ts`, `src/entities/maintenance/api/route.ts`
- **Commit:** `41e6485`

## Self-Check

```
src/entities/booking/services/index.ts — FOUND
src/entities/booking/api/route.ts — FOUND
src/entities/booking/dto/index.ts — FOUND
src/entities/booking/permissions/index.ts — FOUND
src/entities/maintenance/services/index.ts — FOUND
src/entities/maintenance/api/route.ts — FOUND
src/entities/maintenance/dto/index.ts — FOUND
src/entities/maintenance/permissions/index.ts — FOUND
src/entities/events/services/index.ts — FOUND
src/entities/events/api/route.ts — FOUND
src/entities/events/dto/index.ts — FOUND
src/entities/events/permissions/index.ts — FOUND
src/entities/content/services/index.ts — FOUND
src/entities/content/api/route.ts — FOUND
src/entities/content/dto/index.ts — FOUND
src/entities/content/permissions/index.ts — FOUND
```

## Self-Check: PASSED
