# Ubiquitous Language — NetComplex / Soralia Village

> **Last updated:** 2026-07-07
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

- **Canonical values:** `core`, `foundation`, `pro-max`
- **Legacy values (still handled by `getTierLevel()`):** `sprout` → core, `grove` → foundation, `forest` → pro-max
- **Market-facing names:** Core, Foundation, Pro-Max — **same as canonical values; the Tier names themselves serve as marketing labels** (resolved: C4, 2026-07-07)
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

### Platform Address

A tenant-scoped address string (format: `localPart@domain`) that identifies a resident, seat, or property within the community. Examples: `john.doe@property.soralia`, `42-main-st@property.soralia`. The Address Registry (Phase 46.2) consolidates addresses from 5 source tables into a single model with lifecycle management (cooling-off, archival), alias/canonical relationships, handles, and delivery endpoints.

- **Code:** `Address`, `Handle`, `AddressEndpoint` (Prisma models, `prisma/schema.prisma:2528`)
- **Source tables (backfilled):** `StandardSeat`, `SoloSeat`, `PremiumSeat` (each have `platformAddress`), `Profile` (`profileAddress`), `Property` (`platformAddress`)
- **Not to be confused with:** Email address (a platform address is internal to the community, not an internet email)

### Address Kind

Classifies how a Platform Address is used.

- **Canonical values:** `STANDARD` (household seat), `ALIAS` (secondary address pointing to a canonical), `SOLO` (individual non-household seat), `PREMIUM` (agent/premium seat), `PROVIDER` (service provider), `SYSTEM` (platform-internal)

### Address Status

Lifecycle state of a Platform Address.

- **Canonical values:** `ACTIVE`, `RESERVED` (pending assignment), `COOLING_OFF` (unlinked, held for reuse prevention), `ARCHIVED` (historical record), `DELETED` (soft-deleted)

### Address Owner Type

The source entity type that owns a Platform Address.

- **Canonical values:** `STANDARD_SEAT`, `PROFILE`, `SOLO_SEAT`, `PREMIUM_SEAT`, `PROPERTY`, `PROVIDER`, `SYSTEM`

### Handle

A human-friendly label pointing to a Platform Address. Provides an alternative lookup mechanism (e.g., `john.doe` → `john.doe@property.soralia`).

- **Code:** `Handle` (Prisma model)
- **Status:** `ACTIVE`, `RESERVED`, `RELEASED`

### AddressEndpoint

A delivery channel configuration attached to a Platform Address. Defines how to reach the address owner for a given communication mode.

- **Code:** `AddressEndpoint` (Prisma model)
- **Endpoint types:** `INTERNAL_CHAT`, `EMAIL`, `WEBFORM`, `API`, `SMS`, `WHATSAPP`, `PUSH`
- **Config:** JSON blob per endpoint type (e.g., webhook URL for API, phone number for SMS/WhatsApp)

### Canonical Address

The authoritative Platform Address that aliases point to. An ALIAS-kind Address references a CANONICAL-kind Address via `canonicalAddressId`.

- **Code:** Self-referential `Address.canonicalAddressId` → `Address.id`
- **ForwardStrategy:** `DIRECT` (forward to alias owner directly) or `HOUSEHOLD` (forward to household members)

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

A boolean or enum flag controlling per-tenant page visibility. Backed by the `settings` table via `SETTING_DEFS` (Phase 121 SSOT consolidation) — stored as rows in the generic `Setting` table, mapped to typed flags at read time through `getPlatformPageFlags()`.

- **Code:** `PlatformPageFlags` interface in `src/shared/lib/types/platform-page-flags.ts`, `SETTING_DEFS` mapping in `src/entities/tenant/api/settings-defs.ts`, loader in `src/entities/tenant/api/flags/platform-flags.ts`
- **17 flags:** `campaign`, `conservation`, `chat`, `education`, `news`, `events`, `directory`, `groups`, `services`, `resources`, `maintenance`, `surveys`, `competitions`, `dashboard`, `bookings`, `messages`, `marketplacePaypal`
- **6 additional string/enum settings beyond page flags:** `conservationExternalUrl`, `headerLinks`, `servicesConfig`, `providerRegistrationMode`, `customPages`, `customNav`
- **Non-flag settings (Community Config):** `heroCarousel`, `statsHomes`, `statsYears`, `statsBirdSpecies`, `statsNativePlants`, `meritTierThresholds`, `meritExpiryDays`, `translationProvider`, `translationApiKey`
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
- **Status flow:** `CONFIRMED` → `COMPLETED` or `CANCELLED`
- **Not called:** "Reservation" (that term is not used anywhere in the codebase)
- **Not to be confused with:** `ServiceBooking` (marketplace service appointment — different model, different lifecycle)

### ServiceBooking

A marketplace service appointment between a resident and a provider for a specific date and time. Introduced in Phase 50 to separate the marketplace transaction lifecycle from facility reservations.

- **Code:** `ServiceBooking` (Prisma model, separate from `Booking`)
- **Status flow:** `PENDING_CONFIRMATION` → `CONFIRMED` → `COMPLETED` or `CANCELLED`
- **Key fields:** `listingId` (→ CommunityServiceListing), `providerId` (→ ServiceProvider), `userId`, `date`, `startTime`, `endTime`, `price`, `paymentStatus`
- **Not to be confused with:** `Booking` (facility reservation — shared amenity, no provider, no payment)

### CommunityServiceListing

A service offered by a provider in the marketplace. The core listing entity that residents browse, inquire about, and book.

- **Code:** `CommunityServiceListing` (Prisma model)
- **Key fields:** `providerId`, `title` (jsonb, i18n), `description` (jsonb), `category`, `priceType` (FIXED/HOURLY/QUOTE/FREE), `price`, `availability` (jsonb — weekly schedule), `verified`, `rating`, `reviewCount`
- **Status:** `DRAFT` → `ACTIVE` (published) → `SOLD` / `RENTED` / `WITHDRAWN`

### CommunityServiceInquiry

A pre-booking inquiry from a resident to a provider about a specific listing. Supports the quote → approve → pay flow for HOURLY/QUOTE services.

- **Code:** `CommunityServiceInquiry` (Prisma model)
- **Key fields:** `listingId`, `inquirerId`, `preferredDate`, `preferredTime`, `description`, `status` (PENDING → RESPONDED → CLOSED), `providerResponse`

### ServiceProvider

A user who offers services through the marketplace. Links a User account to a provider profile with verification status, reputation scoring, and subscription tier (for platform fees).

- **Code:** `ServiceProvider` (Prisma model)
- **Key fields:** `userId`, `companyName`, `contactName`, `phone`, `trade`, `isActive`
- **Status:** `PENDING` → `PROBATION` → `VERIFIED`; can be `SUSPENDED`
- **Not to be confused with:** `User` (auth identity — a User may or may not be a ServiceProvider), `Provider` as an internal module concept

### SignatureProvider

An enumeration of signing attestation methods for proxy votes and other legally-significant documents. Each value represents a category of signature technology, not a specific API or vendor.

- **Code:** `SignatureProvider` (Prisma enum)
- **Canonical values (post-Phase 126):** `INTERNAL`, `DOCUSIGN`, `ADOBE_SIGN`, `PGP`, `GOV_EID`
- **Removed (Phase 126):** `LIGHTNING`, `NOSTR`, `PASSKEY` — these are now represented via the `Credential` model (see Identity terms)
- **Not to be confused with:** `CredentialType` (platform login credentials, not signing attestations)

### GOV_EID

A `SignatureProvider` value representing government-issued digital identity used as a signing attestation. Generic cross-jurisdiction — not locked to a specific country or API. Specific adapters are registered per-deployment.

- **Scope resolution (BD-2v8t, 2026-07-25):** Kept generic rather than jurisdiction-specific (e.g., `ZA_HOME_AFFAIRS`) to support multi-tenant deployments across countries. Renaming to a country-specific value would create parallel enum values when a second tenant needs their own government eID.
- **Anchor tenant context (Soralia Village):** Would target South African Smart ID + Home Affairs eChannel verification.
- **Not to be confused with:** OIDC (a protocol layer; GOV_EID attestation may or may not use OIDC underneath).

### Provider (User-Facing Term)

A resident who also offers services through the marketplace. Has a dual identity: a User with a ServiceProvider profile. Displayed in the directory context with provider-specific badges and verification indicators.

- **Code:** No single model — derived from `User` + `ServiceProvider` + `CommunityServiceListing` join
- **Discovery:** `/directory` services tab lists verified providers; each directory card links to a service profile
- **Navigation:** Provider login flow adds a `providers` space to SpaceChrome/MobileSpaceBar (gated by `flags.providers` + provider record existence, per Phase 110 access control Layer 1)
- **Admin view:** Provider moderation, due diligence, and credit-based verification (Phase 46)

### Marketplace

The overall concept encompassing service discovery, inquiry, booking, payment, and notification. Lives under the Services space as a sub-domain alongside maintenance and bookings.

- **Code:** `marketplace` module key, `services` PlatformPageFlag, `SERVICES_DOMAINS.marketplace`
- **Not a separate Space** — marketplace is a sub-domain within the Services space
- **User-facing term:** "Services" (not "Marketplace") — residents "browse services," not "browse the marketplace"

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

### C1: Property Shape Inconsistency (High Priority) — _Deferred to post-Phase 41_

Four (now five) different TypeScript shapes exist for the same concept. **All current shapes use `street`/`unit` field names (matching Prisma schema).** The actual inconsistency is in field set and shape boundaries, not in field names. The previously proposed resolution (renaming to `streetAddress`/`unitNumber`) was retracted because it would have _created_ the inconsistency it was trying to fix.

| Shape                         | Source                                                   | Scope                | Notable Fields                                                                              |
| ----------------------------- | -------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| `PropertyDTO`                 | `src/shared/api/dto/property.ts`                         | **Canonical (API)**  | `id`, `street`, `unit`, `platformAddress`, `homeImage?`, `ownerId?`, dates as ISO `string`  |
| `PropertySummaryDTO`          | `src/shared/api/dto/property.ts`                         | **Canonical (lite)** | `id`, `street`, `unit`, `platformAddress`, `homeImage?`                                     |
| `Property` (tenant entity)    | `src/entities/tenant/model/types.ts`                     | Local domain model   | Adds `tenantId`, `activeHousehold?`, `households?`; dates as `Date` (not API-safe for tRPC) |
| `Property` (directory entity) | `src/entities/directory/model/types.ts`                  | Local view type      | Only `street`, `unit`, `homeImage?`; no `id` (display-only)                                 |
| `PropertyInfo`                | `src/entities/user/model/types.ts`                       | Local view type      | `id`, `street`, `unit`, `platformAddress?` (admin lite)                                     |
| `PropertyListing` (agent)     | `src/widgets/dashboard/ui/AgentWidget.tsx:25`            | Widget-local view    | Agent dashboard property listing shape; not in original register                            |
| `PropertyListing` (premium)   | `src/widgets/dashboard/ui/PremiumPortfolioWidget.tsx:41` | Widget-local view    | Premium portfolio property listing shape; not in original register                          |

**Audit (2026-06-01):** Verified all 5 shapes use `street`/`unit` consistently. Prisma `model Property` (the source of truth) uses `street` and `unit` (`prisma/schema.prisma:Property`).

**Actual scope of inconsistency:**

1. `tenant.Property` ↔ `PropertyDTO`: `tenant.Property` includes `tenantId` and `households` relations (not API-safe); the DTO is the correct shape for external consumption. Identity tRPC router (`src/entities/identity/api/router.ts:20`) already uses `toPropertyDTO()`.
2. `directory.Property` ↔ `PropertySummaryDTO`: Both are 3–4 fields, both local-scope. Directory's shape is a display-only view (no `id`); could unify with `PropertySummaryDTO` or leave as local view type.
3. `user.PropertyInfo` ↔ `PropertySummaryDTO`: Both are 4 fields. Could unify or leave as local view type.

**Resolution plan (added to Phase 44):**

- `PropertyDTO` and `PropertySummaryDTO` remain canonical API shapes.
- `tenant.Property` stays as the internal domain model (load-bearing for relations and tenant scoping).
- Consolidate `directory.Property` and `user.PropertyInfo` → `PropertySummaryDTO` _only_ if a shared lite type is needed; otherwise leave as local view types.
- Audit and align the 2 widget-local `PropertyListing` types (`AgentWidget.tsx:25`, `PremiumPortfolioWidget.tsx:41`) — either consolidate with `PropertySummaryDTO` or document as widget-specific view types.
- **No field renames.** Current `street`/`unit` already match Prisma.

**Status (2026-06-04):** **Open — Now actionable.** Phase 41 is complete; code work is no longer deferred. Resolution work added to Phase 44 (M5a Audit Closure) as BD issue `2z4` (P2). Audit also found 2 additional local `PropertyListing` types in `src/widgets/dashboard/ui/AgentWidget.tsx:25` and `src/widgets/dashboard/ui/PremiumPortfolioWidget.tsx:41` — these should be either aligned with `PropertySummaryDTO` or documented as local view types.

### C2: Three Overlapping Gating Systems (Medium Priority)

`ModuleKey` (tier-gated access), `FeatureRegistry` (fine-grained UI toggles), and `PlatformPageFlags` (DB-stored per-tenant flags) all control visibility of the same features (e.g., `maintenance` appears in all three).

**Resolution plan:** `docs/GATE_PLAN.md` — 5-layer precedence model with `canAccess()` single entry point, 3-phase migration (foundation → incremental → cleanup), CI-enforced mapping completeness test.

**Status (2026-06-04):** **Phase 1 complete; Phase 2 + 3 added to Phase 44 (M5a Audit Closure).** `canAccess()`, `canAccessClient()`, `useGateContext()`, and `GateGuard` shipped in Phase 41. **2026-06-04 audit found 4 production callsites still using `usePageFlags` directly** (must migrate to `useGateContext()` in Phase 2):

- `src/widgets/dashboard/ui/MobileSpaceBar.tsx:7, 32`
- `src/shared/ui/Header.tsx:9, 241`
- `src/shared/ui/SideDrawer.tsx:9, 29`
- `src/shared/ui/Footer.tsx:7, 16`

Phase 2 (call-site migration) and Phase 3 (restrict legacy exports to `@internal` with CI guard) work added to Phase 44 as BD issue `1eh` (P2). C2 fully resolved when Phase 3 ships.

### C3: Tab → Space Migration Incomplete (Medium Priority) — _Closed 2026-06-04_

`widget-store.ts` still uses `tabId` as map keys; `admin-config.ts` still has `DashboardTab[]` type.

**Resolution:** Phase 31 (planned, not yet executed) will remove all Tab references and migrate to `spaceId`.

**Status (2026-06-04):** **CLOSED.** Phase 31 work was executed (commits `c905558`, `e1e2d69`, and earlier 31-01..31-03). 2026-06-04 audit: zero hits for `tabId` or `DashboardTab` in `src/` or `tests/`. Migration is complete.

### C4: Tier Naming Mismatch (Medium Priority) — _Closed 2026-07-07_

Technical tiers (`foundation`/`depth`/`core`) don't map to business tiers in PRD (`Anchor`/`Premium`/`Standard`/`Starter`). 3 technical tiers vs 4 business tiers.

**Resolution needed:** Add a mapping table in `tiers.ts` or create a business-tier abstraction layer.

**Resolution:** PRD aligned to codebase. Tier names (`core`/`foundation`/`pro-max`) serve as both technical identifiers and market-facing labels. Soralia Village remains an "anchor tenant" — a tenant designation (Pro-Max tier reference deployment), not a separate tier.

**Status (2026-07-07):** **Closed.** PRD updated (collapsed to 3 tiers, Prisma excerpt fixed, module grid collapsed). Tier Level values reorganized for logical meaning: `core` (standard), `foundation` (premium), `depth` (enterprise). No code changes needed beyond the tier rename.

### C5: residencyType vs residentType (Low Priority) — _Closed 2026-06-16_

- Profile's `residencyType`: `FAMILY`, `RENTER`, `OWNER` (was `OWNER_RESIDENT`)
- Invitation's `residentType` renamed to `residencyType`: `FAMILY`, `RENTER`, `OWNER`

**Resolution:** Renamed Invitation's `residentType` → `residencyType` using the shared `ResidencyType` enum. Dropped `OWNER_RESIDENT` (mapped to `OWNER`). Prisma schema updated, Drizzle enums aligned, all 14+ references across TypeScript types, DTOs, Zod schemas, API routes, seed scripts, and test fixtures updated. Migration pending (Task 2).

**Status (2026-06-16):** **Closed — Resolved in Phase 44 Plan 06 (commit: TBD).** BD issue `brp` ready to close.

### C6: OccupancyType vs occupantType (Low Priority) — _Closed 2026-06-16_

`OccupancyType` is property-level (`OWNER_OCCUPIED`/`RENTAL`/`VACANT`); `householdRole` (was `occupantType`) is person-level (`OCCUPANT`/`MINOR`/`FAMILY`). Renaming resolves the confusion.

**Resolution:** Renamed `occupantType` → `householdRole` across Prisma (`HouseholdRole` enum), Drizzle (`householdRoleEnum`), and all TypeScript/seed references. `OccupancyType` (property-level) left unchanged — distinct concept.

**Status (2026-06-16):** **Closed — Resolved in Phase 44 Plan 06 (commit: TBD).** BD issue `huo` ready to close.

### C7: "Ticket" as Sub-Brand of MaintenanceRequest (Informational)

The model is `MaintenanceRequest`; users see "Ticket Number" in the UI. This is intentional — the record is a "maintenance request"; its human-readable ID is a "ticket number." No action needed, but developers should be aware.

### C8: MAINTENANCE*STATUSES Constants Out of Sync (High Priority) — \_Closed 2026-06-08*

`src/shared/lib/constants.ts:62` defined `MAINTENANCE_STATUSES` with 4 values (`SUBMITTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), but Prisma `RequestStatus` enum has 7 values (also `ASSIGNED`, `SCHEDULED`, `PENDING_PARTS`).

**Resolution:** Added missing statuses `ASSIGNED`, `SCHEDULED`, `PENDING_PARTS` to `MAINTENANCE_STATUSES` in the flow order matching Prisma. Updated `src/test/constants.test.ts` to verify all 7 values.

**Status (2026-06-08):** **CLOSED.** Constants and tests updated in commit (TBD).

### C9: CONTENT*CATEGORIES Constants Out of Sync (Medium Priority) — \_Closed 2026-06-08*

`src/shared/lib/constants.ts:26` defined `CONTENT_CATEGORIES` with 4 values (`ANNOUNCEMENT`, `NEWS`, `EVENT`, `BLOG`), but Prisma `ContentCategory` enum has 7 values (also `CONSERVATION`, `SERVICES`, `CAMPAIGN`).

**Resolution:** Added missing categories `CONSERVATION`, `SERVICES`, `CAMPAIGN` to `CONTENT_CATEGORIES`. Updated `src/test/constants.test.ts` to verify all 7 values.

**Status (2026-06-08):** **CLOSED.** Constants and tests updated in commit (TBD).

---

## Term Decision Log

| Date       | Decision                                                                                                                   | Rationale                                                                                                                                                                                                                                                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-06-01 | Established "Tenant" as technical term, "Community" as user-facing term                                                    | Consistent with codebase convention; no breaking change                                                                                                                                                                                                                                                                        |
| 2026-06-01 | Established "Space" as canonical, "Tab" as deprecated                                                                      | Phase 30 completed the migration; Phase 31 will clean up                                                                                                                                                                                                                                                                       |
| 2026-06-01 | Updated C1: field names are consistent (`street`/`unit`); real inconsistency is shape boundaries                           | All 5 shapes verified to use `street`/`unit` matching Prisma; original proposed resolution (`streetAddress`/`unitNumber`) retracted — would have created the inconsistency it tried to fix                                                                                                                                     |
| 2026-06-01 | C1 code work deferred to post-Phase 41                                                                                     | Phase 41 is orthogonal; gate code does not consume any Property shape                                                                                                                                                                                                                                                          |
| 2026-06-01 | Documented triple gating system as C2                                                                                      | Overlap between Module/Feature/Flag systems is undocumented                                                                                                                                                                                                                                                                    |
| 2026-06-01 | Documented tier naming mismatch as C4                                                                                      | 3 technical tiers vs 4 business tiers is an open gap                                                                                                                                                                                                                                                                           |
| 2026-06-01 | Updated C2 status: Phase 1 infrastructure complete (Plan 41-01..03)                                                        | Foundation in flight; callsite migration is Phase 2; C2 fully Resolved in Phase 3                                                                                                                                                                                                                                              |
| 2026-06-04 | Closed C3: Tab → Space migration                                                                                           | Phase 31 work executed; 0 hits for tabId/DashboardTab in audit                                                                                                                                                                                                                                                                 |
| 2026-06-04 | Updated C1: Now actionable (Phase 41 complete) + 2 new local PropertyListing types                                         | Code work added to Phase 44 as `2z4`; no field renames — shape boundary clarification only                                                                                                                                                                                                                                     |
| 2026-06-04 | Updated C2: Phase 2 + 3 added to Phase 44                                                                                  | 4 production callsites still use `usePageFlags` (MobileSpaceBar, Header, SideDrawer, Footer); migrate to `useGateContext()`; restrict legacy exports to `@internal`                                                                                                                                                            |
| 2026-06-04 | C4 (Tier Naming) deferred to Phase 47 (dWallet)                                                                            | 3 vs 4 tier mismatch only matters when dWallet ships tier-gated features; track as open conflict until dWallet surfaces the need                                                                                                                                                                                               |
| 2026-06-16 | Closed C5: residencyType vs residentType aligned                                                                           | Renamed Invitation.residentType → residencyType, dropped OWNER_RESIDENT → OWNER; all 14+ references updated; migration pending (Phase 44-06/Task 2)                                                                                                                                                                            |
| 2026-06-16 | Closed C6: occupantType renamed to householdRole                                                                           | Renamed to householdRole across Prisma (HouseholdRole), Drizzle (householdRoleEnum), and all TypeScript/seed references; OccupancyType unchanged (distinct concept)                                                                                                                                                            |
| 2026-06-08 | Closed C8: MAINTENANCE_STATUSES synced to Prisma                                                                           | Added ASSIGNED, SCHEDULED, PENDING_PARTS; constants + tests updated                                                                                                                                                                                                                                                            |
| 2026-06-08 | Closed C9: CONTENT_CATEGORIES synced to Prisma                                                                             | Added CONSERVATION, SERVICES, CAMPAIGN; constants + tests updated                                                                                                                                                                                                                                                              |
| 2026-06-27 | Defined ServiceBooking, CommunityServiceListing, CommunityServiceInquiry, ServiceProvider, Provider, and Marketplace terms | Phase 50 marketplace introduces the transaction flow from discovery → booking → payment → notification. These terms disambiguate ServiceBooking from facility Booking, define the provider dual-identity model, and establish "Services" as the user-facing marketplace term                                                   |
| 2026-06-27 | Added `marketplacePaypal` to PlatformPageFlags (15 → 16 flags)                                                             | Phase 50 feature flag for PayPal payment gateway in marketplace checkout                                                                                                                                                                                                                                                       |
| 2026-06-30 | Consolidated PlatformPageFlags backing store to Setting SSOT (Phase 121, 5 def files → 1)                                  | Settings system now uses a single `settings-defs.ts` source of truth. `PlatformPageFlags` remains as a typed read interface mapped from Setting rows. Added 9 non-flag community-config setting keys                                                                                                                           |
| 2026-07-07 | Closed C4: Tier naming mismatch resolved — PRD aligned to 3-tier code system                                               | PRD's 4 tenant types were aspirational marketing; codebase never referenced them. dWallet (Phase 47) shipped without needing a 4-tier system. Marketing labels (Foundation/Growth/Enterprise) now map 1:1 to technical tiers. Soralia Village is an anchor tenant (Enterprise-tier reference deployment), not a separate tier. |
| 2026-06-30 | Defined Platform Address Registry terms (Phase 46.2)                                                                       | New Address, Handle, AddressEndpoint models with 6 enums (AddressKind, AddressStatus, AddressOwnerType, HandleStatus, ForwardStrategy, EndpointType). Consolidates platformAddress/profileAddress from 5 source tables into one model with lifecycle management                                                                |
| 2026-07-25 | GOV_EID scope clarified — kept generic, not jurisdiction-specific                                                          | ADVISORY-034-SUPPLEMENTAL-1 §6 Q2 resolved. GOV_EID represents government-issued digital identity as a category (not a specific API). Specific adapters registered per-deployment. Renaming to country-specific value would create parallel enum values per-jurisdiction                                                       |
