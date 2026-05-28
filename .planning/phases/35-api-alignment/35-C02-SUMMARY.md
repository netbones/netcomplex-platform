---
phase: 35-api-alignment
plan: C02
type: execute
wave: 2
subsystem: api
tags: [dto, api-governance, data-transfer-object, api-alignment]
requires: [35-A01]
provides: [dto-mapping-layer]
affects:
  [
    src/app/api/users/route.ts,
    src/app/api/maintenance/route.ts,
    src/app/api/bookings/route.ts,
    src/entities/identity/api/router.ts,
  ]
tech-stack:
  added: []
  patterns:
    - 'Per-domain DTO functions mapping DB rows to API-safe shapes'
    - 'DTOs strip internal fields (tenantId, security, privacy)'
    - 'Route handlers call dto functions instead of manual mapping'
key-files:
  created:
    - src/shared/api/dto/index.ts
    - src/shared/api/dto/user.ts
    - src/shared/api/dto/property.ts
    - src/shared/api/dto/household.ts
    - src/shared/api/dto/maintenance.ts
    - src/shared/api/dto/booking.ts
    - src/shared/api/dto/event.ts
    - src/shared/api/dto/content.ts
    - src/shared/api/dto/group.ts
    - src/shared/api/dto/announcement.ts
    - src/shared/api/dto/resource.ts
    - src/shared/api/dto/conversation.ts
    - src/shared/api/dto/message.ts
    - src/shared/api/dto/notification.ts
    - src/shared/api/dto/invitation.ts
  modified:
    - src/app/api/users/route.ts
    - src/app/api/maintenance/route.ts
    - src/app/api/bookings/route.ts
    - src/entities/identity/api/router.ts
decisions:
  - 'DTOs return ISO strings for dates (not Date objects) for portable API contracts'
  - 'Identity router userSchema changed from z.date() to z.string() for createdAt/updatedAt to match DTO output'
  - 'tRPC router uses DTOs for sub-objects where shapes are compatible; primary row spreads kept as raw for Zod schema compliance'
metrics:
  duration: 8m 52s
  completed: 2026-05-28
  tasks: 2
  files_created: 15
  files_modified: 4
---

# Phase 35 Plan C02: DTO Mapping Layer

**One-liner:** Created 14 per-domain DTO files with mapper functions that strip internal fields and convert DB rows to API-safe shapes, then updated users, maintenance, bookings, and identity routes to use them.

## Objective

Create a DTO (Data Transfer Object) layer to decouple API responses from raw database entities, as required by API_ARCHITECTURE.md §13 and API.md §15 which strictly forbid exposing raw ORM entities.

## Tasks Executed

### Task 1: Create the shared DTO directory and core DTOs ✅

Created `src/shared/api/dto/` directory with 14 domain DTO files plus barrel index:

| File            | Types                                         | Mapper Functions                                                           | Stripped Fields                                                                                             |
| --------------- | --------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| user.ts         | UserDTO, UserSummaryDTO                       | toUserDTO, toUserDTOs, toUserSummaryDTO                                    | tenantId, emailVerified, twoFactorEnabled, isActive, showEmail, showPhone, dashboardLayout, isPlatformAdmin |
| property.ts     | PropertyDTO, PropertySummaryDTO               | toPropertyDTO, toPropertyDTOs, toPropertySummaryDTO                        | tenantId                                                                                                    |
| household.ts    | HouseholdDTO, HouseholdProfileDTO, ProfileDTO | toHouseholdDTO, toProfileDTO                                               | tenantId                                                                                                    |
| maintenance.ts  | MaintenanceRequestDTO, MaintenanceSummaryDTO  | toMaintenanceRequestDTO, toMaintenanceRequestDTOs, toMaintenanceSummaryDTO | tenantId                                                                                                    |
| booking.ts      | BookingDTO                                    | toBookingDTO, toBookingDTOs                                                | tenantId                                                                                                    |
| event.ts        | EventDTO, PublicEventDTO                      | toEventDTO, toEventDTOs, toPublicEventDTO                                  | tenantId                                                                                                    |
| content.ts      | ContentDTO, PublicContentDTO                  | toContentDTO, toPublicContentDTO                                           | tenantId                                                                                                    |
| group.ts        | GroupDTO, GroupDetailDTO                      | toGroupDTO, toGroupDTOs                                                    | tenantId                                                                                                    |
| announcement.ts | AnnouncementDTO                               | toAnnouncementDTO, toAnnouncementDTOs                                      | tenantId                                                                                                    |
| resource.ts     | ResourceDTO                                   | toResourceDTO, toResourceDTOs                                              | tenantId                                                                                                    |
| conversation.ts | ConversationDTO                               | toConversationDTO, toConversationDTOs                                      | tenantId                                                                                                    |
| message.ts      | MessageDTO                                    | toMessageDTO, toMessageDTOs                                                | tenantId                                                                                                    |
| notification.ts | NotificationDTO                               | toNotificationDTO, toNotificationDTOs                                      | tenantId                                                                                                    |
| invitation.ts   | InvitationDTO                                 | toInvitationDTO, toInvitationDTOs                                          | tenantId, token                                                                                             |

**Commit:** `377fb5a`

### Task 2: Update identity router and 3 key REST routes to use DTOs ✅

**Users route** (`src/app/api/users/route.ts`):

- Changed from partial select (10 fields) to full row select
- Applied `toUserDTO()` to transform user data before attaching relations
- DTO strips `phone`, `interests`, `isActive`, `isPublic`, `avatar` (selectively) from user listing

**Maintenance route** (`src/app/api/maintenance/route.ts`):

- Replaced 17-line manual mapping with `...toMaintenanceRequestDTO(mr)` spread
- User sub-object (name, email, address) kept as separate attachment

**Bookings route** (`src/app/api/bookings/route.ts`):

- Replaced 11-line manual mapping with `...toBookingDTO(b)` spread
- User sub-object (id, name) kept as separate attachment

**Identity tRPC router** (`src/entities/identity/api/router.ts`):

- Imports `toUserDTO`, `toPropertyDTO`, `toProfileDTO`, `toHouseholdDTO`
- `getProfile` procedure uses `toUserDTO()` for user sub-object
- `userSchema` updated: `createdAt`/`updatedAt` changed from `z.date()` to `z.string()` for DTO compatibility

**Commit:** `90ea334`

## Verification

- `npx tsc --noEmit` — no errors in DTO files or modified routes
- 15 DTO files created (14 domain + 1 barrel index)
- Each DTO file exports at least 1 type interface and 2 mapper functions
- All 4 targeted routes now use DTO functions
- Pre-existing errors (prisma/seed.ts) unchanged

## Deviations from Plan

### Rule 2 — Missing parameter naming fix

**1. [Rule 2 - Bug] Fixed param name shadowing imported table identifiers**

- **Found during:** Task 1 compilation
- **Issue:** Array mapper functions like `toUserDTOs(users: ...)` shadowed imported `{ users }` from `@api/db`, causing TS2502 circular reference error
- **Fix:** Renamed all array mapper parameters (e.g., `users` → `userRows`, `bookings` → `bookingRows`, etc.)
- **Files modified:** 11 DTO files
- **Commit:** Included in `377fb5a` (part of Task 1)

### Rule 3 — tRPC router Zod schema compatibility

**2. [Rule 3 - Blocking issue] tRPC userSchema incompatible with DTO date format**

- **Found during:** Task 2 identity router compilation
- **Issue:** `toUserDTO()` returns `createdAt`/`updatedAt` as ISO strings, but tRPC `userSchema` used `z.date()` — TypeScript rejected the DTO return
- **Fix:** Changed `z.date()` → `z.string()` in identity router's `userSchema`
- **Files modified:** `src/entities/identity/api/router.ts`
- **Commit:** `90ea334`

## Decisions Made

- **ISO string dates in DTOs:** All dates converted to ISO strings (`toISOString()`) rather than passed as Date objects. This aligns with API governance principles (portable contracts, JSON-serializable by default).
- **Identity router selective DTO usage:** tRPC procedures with strict Zod output schemas use DTOs for sub-objects (user, property) where types are compatible. Primary row spreads kept raw to satisfy Zod's `z.date()` and required field expectations. Future phases may widen DTO adoption as Zod schemas evolve.
- **Invitation token stripped:** `InvitationDTO` does not expose the invitation `token` field (security-sensitive).

## Success Criteria

- [x] `src/shared/api/dto/` directory with 14 domain DTO files
- [x] Each DTO file exports types and mapper functions
- [x] Identity router, users, maintenance, bookings routes use DTOs
- [x] All compile without errors

## Self-Check: PASSED

- All 15 DTO files exist and verified
- Both commits exist (`377fb5a`, `90ea334`)
- TypeScript compilation passes for all modified files
