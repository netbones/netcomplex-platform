# Ubiquitous Language — NetComplex / Soralia Village

> **Last updated:** 2026-06-01
> **Purpose:** Canonical definitions for all domain terms. When in doubt, this document is the authority.

---

## Core Platform Terms

### Tenant

A single community account on the NetComplex platform. Every data record belongs to exactly one Tenant. Identified by `slug` (unique, URL-safe) and `domain`. Maps to a SaaS tenant with its own database isolation via `tenantId`.

- **Code:** `Tenant` (Prisma model, `prisma/schema.prisma`)
- **User-facing term:** "Community"
- **Not to be confused with:** Village (brand name for the anchor tenant), Organization (not used in this domain)

### Platform

The NetComplex system as a whole, including the platform admin layer that manages all tenants, modules, and tier definitions.

- **Code:** `isPlatformAdmin` flag on User
- **Route prefix:** `/platform/*`

### Tier / TierLevel

A subscription level that determines which modules a tenant can access.

- **Canonical values:** `foundation`, `depth`, `core`
- **Legacy values (still handled by `getTierLevel()`):** `sprout` → foundation, `grove` → depth, `forest` → core
- **Business/market names (PRD):** Starter, Standard, Premium, Anchor — **mapping to technical tiers is undocumented; 4 business tiers vs 3 technical tiers is an open gap**
- **Code:** `TierLevel` type in `src/shared/lib/constants/tiers.ts`

---

## Identity & Access Terms

### User

An authentication identity with an email, name, role, and optional image. A User belongs to a Tenant and can hold one or more Seats.

- **Code:** `User` (Prisma model)
- **Not to be confused with:** Profile (a person-record within a Household), Seat (an access right), Resident (a directory display concept)

### Profile

A person-record within a Household. Describes an individual who may or may not have a User account (e.g., minors don't have accounts). Has `occupantType` and `residencyType` classifications.

- **Code:** `Profile` (Prisma model)
- **Key fields:** `firstName`, `lastName`, `occupantType`, `residencyType`
- **Not to be confused with:** User (auth identity), Seat (access right)

### Seat

An access right linking a User to a Property or Household. There are three seat types:

| Seat Type        | Scope                               | Link                              |
| ---------------- | ----------------------------------- | --------------------------------- |
| **StandardSeat** | Household-based resident            | `householdId`                     |
| **SoloSeat**     | Individual (non-household) resident | `propertyId`                      |
| **PremiumSeat**  | Agent/premium access                | `propertyId` + `agentAccess` JSON |

- **Code:** `StandardSeat`, `SoloSeat`, `PremiumSeat` (Prisma models)
- **Union type:** `SeatInfo` = `{ type: 'standard', seatId }` | `{ type: 'solo', seatId }`
- **Status:** `ACTIVE`, `INACTIVE`, `SUSPENDED`
- **Not to be confused with:** User (auth identity), Profile (person-record)

### Role

A tenant-scoped permission classification assigned to a User.

- **Canonical values:** `ADMIN`, `BOARD`, `PROPERTY_MANAGER`, `COMMITTEE`, `GROUP_ADMIN`, `RESIDENT`
- **Code:** `Role` enum in Prisma schema
- **Permissions:** Defined in `ROLE_PERMISSIONS` map (`src/entities/tenant/api/permissions.ts`)

### Resident

A **derived display concept** used in the Directory context. Merges User + Seat + Profile data for directory listing. Not a database model.

- **Code:** `Resident` interface in `src/entities/directory/model/types.ts`
- **Not a DB model** — a UI convenience wrapper

---

## Property & Household Terms

### Property

A physical dwelling unit (house, apartment, townhouse) within a community. A Property can contain multiple Households (e.g., owner-occupied + rental unit).

- **Code:** `Property` (Prisma model)
- **Key fields:** `streetAddress`, `unitNumber`, `propertyType`, `platformAddress`
- **⚠️ Shape inconsistency:** Four different TypeScript shapes exist (see Conflicts section)

### Household

An occupancy unit within a Property. A Property has one or more Households, each with an `occupancyType` and `status`.

- **Code:** `Household` (Prisma model)
- **Key fields:** `occupancyType`, `status`, `propertyId`
- **Consistent across codebase** — no shape conflicts

### OccupancyType

Describes how a Household occupies a Property. Property-level concept.

- **Canonical values:** `OWNER_OCCUPIED`, `RENTAL`, `VACANT`
- **Not to be confused with:** `occupantType` (person-level, within a Profile)

### occupantType

Describes a person's role within a Household. Person-level concept.

- **Canonical values:** `OCCUPANT`, `MINOR`, `FAMILY`
- **Not to be confused with:** `OccupancyType` (property-level, within a Household)

### residencyType

Describes a Profile's residency classification.

- **Canonical values:** `FAMILY`, `RENTER`, `OWNER_RESIDENT`
- **Overlap with** `residentType` on Invitation (`OWNER`, `RENTER`) — see Conflicts section

### Landlord

A property owner or manager who is not a resident. Used only in the Directory context.

- **Code:** `Landlord` interface in `src/entities/directory/model/types.ts`
- **Key fields:** `name`, `contactEmail`, `contactPhone`

---

## Module & Feature Terms

### Module / PlatformModule

An installable capability definition at the platform level. Has a `key`, `name`, `description`, and `minTier` (the minimum tier required to unlock it).

- **Code:** `PlatformModule` (Prisma model)
- **18 module keys:** `directory`, `news`, `events`, `groups`, `chat`, `resources`, `conservation`, `adminBasic`, `adminIntermediate`, `bookings`, `surveys`, `marketplace`, `externalSurveys`, `maintenance`, `property`, `agentGateway`, `analytics`, `adminAdvanced`
- **Not to be confused with:** Feature (finer-grained toggle), PlatformPageFlag (DB-stored boolean flag)

### TenantModule

A module instance installed for a specific tenant. Links a `Tenant` to a `PlatformModule` with an enable/disable status.

- **Code:** `TenantModule` (Prisma model)
- **Status:** `ENABLED`, `DISABLED`

### Feature / FeatureRegistry

A fine-grained UI toggle with a dot-notation key (e.g., `page.maintenance`, `feature.maintenance.updates`, `widget.maintenance.recent`). A Module bundles multiple Features.

- **Code:** `FeatureRegistry` in `src/entities/tenant/api/features/registry.ts`
- **30+ features** organized as `page.*`, `feature.*`, `widget.*`
- **Not to be confused with:** Module (coarser, tier-gated), PlatformPageFlag (DB-stored)

### PlatformPageFlag

A boolean or enum flag stored in the `settings` table, controlling per-tenant page visibility.

- **Code:** `PlatformPageFlags` in `src/entities/tenant/api/flags/platform-flags.ts`
- **15 flags:** `campaign`, `conservation`, `chat`, `news`, `events`, `directory`, `groups`, `services`, `resources`, `maintenance`, `surveys`, `competitions`, `dashboard`, `bookings`, `messages`
- **Overlap with** FeatureRegistry page flags and ModuleKeys — see Conflicts section

### Plugin

**Aspirational only.** Not implemented. Listed in docs as a future enhancement for third-party widget support.

---

## Dashboard Terms

### Space / Focus Space

The current architecture for organizing dashboard content. Each Space groups related widgets and provides a focused view.

- **Canonical values:** `home`, `services`, `community`, `messages`, `admin`
- **Code:** `SpaceId`, `SpaceDefinition` in `src/widgets/dashboard/model/spaces.ts`
- **Replaced:** Tab (legacy, still partially referenced)

### Tab (Legacy)

The previous 6-tab dashboard architecture. Being migrated to Spaces.

- **Legacy values:** `overview`, `maintenance`, `bookings`, `services`, `content`, `premium`
- **Migration map:** `TAB_TO_SPACE_MAP` in `src/entities/widget/model/tab-migration-map.ts`
- **⚠️ Residual references:** `widget-store.ts` still uses `tabId` keys; `admin-config.ts` still has `DashboardTab[]` type. Phase 31 will remove these.

### Widget

A self-contained dashboard component that renders data from a specific domain. Registered in the WidgetRegistry with a manifest defining its space, feature dependencies, and role visibility.

- **Code:** `WidgetRegistry` class, widget manifests in `src/entities/widget/`
- **Persisted via:** `UserWidgets` (per-user layout stored in settings JSON)

---

## Domain-Specific Terms

### MaintenanceRequest

A request for maintenance work on a property. Has a 7-status lifecycle and a human-readable ticket number.

- **Code:** `MaintenanceRequest` (Prisma model)
- **Status flow:** `SUBMITTED` → `ACKNOWLEDGED` → `IN_PROGRESS` → `AWAITING_PARTS` / `SCHEDULED` → `COMPLETED` → `CLOSED`
- **Ticket number format:** `SRV-{YYYY}-{NNNN}` (e.g., `SRV-2026-0001`)
- **UI label:** "Ticket" is used in user-facing labels (e.g., "Ticket Number") — the model is `MaintenanceRequest`, the identifier is a "ticket number"

### MaintenanceCategory

A classification of maintenance work.

- **Canonical values:** `PLUMBING`, `ELECTRICAL`, `HVAC`, `GENERAL`, `STRUCTURAL`, `PEST_CONTROL`, `OTHER`

### MaintenancePriority

Urgency classification for a maintenance request.

- **Canonical values:** `LOW`, `MEDIUM`, `HIGH`, `URGENT`

### MaintenanceTeam

Who performs the maintenance work.

- **Canonical values:** `INTERNAL`, `EXTERNAL`, `CONTRACTOR`

### Booking

A reservation of a Facility for a specific time period by a User.

- **Code:** `Booking` (Prisma model)
- **Status flow:** `PENDING` → `CONFIRMED` → `COMPLETED` or `CANCELLED`
- **Not called:** "Reservation" (that term is not used anywhere in the codebase)

### Facility

A bookable amenity within a tenant's community (e.g., pool, clubhouse, gym).

- **Code:** `Facility` (Prisma model), `TenantFacility` (entity type)
- **Tenant-configurable:** 15 preset facilities in catalog

### Conversation

A real-time messaging thread. Can be direct (2 participants) or group.

- **Code:** `Conversation` (Prisma model)
- **Types:** `DIRECT`, `GROUP`
- **Powered by:** Supabase Realtime

### ContentItem

A managed piece of content (article, page, resource) with scheduling, visibility scoping, and Tiptap rich editing.

- **⚠️ Boundary issue:** Both Content and Service entities define their own `ContentItem` interface with different shapes. Content entity is the canonical owner.

### Competition

A community competition with entries. Three types: `RAFFLE`, `PHOTO`, `SCORE`.

- **Code:** `Competition` (Prisma model), tRPC router with 9 procedures
- **Entries:** `CompetitionEntry` (Prisma model)

### Announcement

A priority-classified communication with audience targeting and fanout delivery (capped at 500 recipients).

- **Priority values:** `urgent`, `high`, `normal`, `low`
- **Code:** `Announcement` (Prisma model)

---

## Conflict Register

### C1: Property Shape Inconsistency (High Priority)

Four different TypeScript shapes exist for the same concept:

| Shape                         | Source                                  | Key Differences                                 |
| ----------------------------- | --------------------------------------- | ----------------------------------------------- |
| `Property` (tenant entity)    | `src/entities/tenant/model/types.ts`    | `streetAddress`, `unitNumber`, `id`, `tenantId` |
| `Property` (directory entity) | `src/entities/directory/model/types.ts` | `street`, `unit`, no `id`, no `tenantId`        |
| `PropertyDTO`                 | `src/shared/api/dto/property.ts`        | `address`, `unit`, `id`, `tenantId`             |
| `PropertyInfo`                | `src/entities/user/model/types.ts`      | `propertyId`, `address`, `unit`, `type`         |

**Resolution needed:** Standardize on `PropertyDTO` shape as canonical, with `streetAddress` and `unitNumber` as field names to match Prisma schema. Directory and User entities should consume the DTO.

### C2: Three Overlapping Gating Systems (Medium Priority)

`ModuleKey` (tier-gated access), `FeatureRegistry` (fine-grained UI toggles), and `PlatformPageFlags` (DB-stored per-tenant flags) all control visibility of the same features (e.g., `maintenance` appears in all three).

**Resolution plan:** `docs/GATE_PLAN.md` — 5-layer precedence model with `canAccess()` single entry point, 3-phase migration (foundation → incremental → cleanup), CI-enforced mapping completeness test.

**Status (2026-06-01):** **Open — Phase 1 infrastructure complete.** `canAccess()`, `canAccessClient()`, `useGateContext()`, and `GateGuard` exist in `.planning/phases/41-feature-gate-consolidation/41-{01,02,03}-PLAN.md` and will land in Phase 41 execution. The 3 legacy systems (`isModuleEnabled`, `TierGuard`, `usePageFlags` direct reads) remain public and continue to operate in parallel until Phase 2 migrates callsites opportunistically. C2 fully resolved when Phase 3 restricts legacy exports to `@internal`. See 41-CONTEXT.md "Trajectory" and "Phase 2/3 Deferrals" sections.

### C3: Tab → Space Migration Incomplete (Medium Priority)

`widget-store.ts` still uses `tabId` as map keys; `admin-config.ts` still has `DashboardTab[]` type.

**Resolution:** Phase 31 (planned, not yet executed) will remove all Tab references and migrate to `spaceId`.

### C4: Tier Naming Mismatch (Medium Priority)

Technical tiers (`foundation`/`depth`/`core`) don't map to business tiers in PRD (`Anchor`/`Premium`/`Standard`/`Starter`). 3 technical tiers vs 4 business tiers.

**Resolution needed:** Add a mapping table in `tiers.ts` or create a business-tier abstraction layer.

### C5: residencyType vs residentType (Low Priority)

- Profile's `residencyType`: `FAMILY`, `RENTER`, `OWNER_RESIDENT`
- Invitation's `residentType`: `OWNER`, `RENTER`

**Resolution needed:** Align on `OWNER_RESIDENT` → `OWNER` mapping, or rename Invitation's field to `residencyType` and reuse the same enum.

### C6: OccupancyType vs occupantType (Low Priority)

Both exist in the same entity. `OccupancyType` is property-level; `occupantType` is person-level. Near-identical naming causes confusion.

**Resolution needed:** Rename `occupantType` to `householdRole` or `personRole` to disambiguate.

### C7: "Ticket" as Sub-Brand of MaintenanceRequest (Informational)

The model is `MaintenanceRequest`; users see "Ticket Number" in the UI. This is intentional — the record is a "maintenance request"; its human-readable ID is a "ticket number." No action needed, but developers should be aware.

---

## Term Decision Log

| Date       | Decision                                                                | Rationale                                                                         |
| ---------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 2026-06-01 | Established "Tenant" as technical term, "Community" as user-facing term | Consistent with codebase convention; no breaking change                           |
| 2026-06-01 | Established "Space" as canonical, "Tab" as deprecated                   | Phase 30 completed the migration; Phase 31 will clean up                          |
| 2026-06-01 | Documented Property shape inconsistency as C1                           | Four incompatible shapes need unification                                         |
| 2026-06-01 | Documented triple gating system as C2                                   | Overlap between Module/Feature/Flag systems is undocumented                       |
| 2026-06-01 | Documented tier naming mismatch as C4                                   | 3 technical tiers vs 4 business tiers is an open gap                              |
| 2026-06-01 | Updated C2 status: Phase 1 infrastructure complete (Plan 41-01..03)     | Foundation in flight; callsite migration is Phase 2; C2 fully Resolved in Phase 3 |
