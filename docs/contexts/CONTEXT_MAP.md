---
title: Context Map — NetComplex / Soralia Village
status: current
reviewed: 2026-07-28
tags: [context-map, bounded-context]
audience: developer
---

# Context Map — NetComplex / Soralia Village

> **Last updated:** 2026-06-01
> **Purpose:** Define bounded contexts, their relationships, and cross-context contracts.

---

## Bounded Contexts

### 1. Tenant (Core)

**Directory:** `src/entities/tenant/`

The central multi-tenancy context. Owns tenant identity, tier hierarchy, role-based permissions, and feature gating infrastructure.

| Aspect             | Detail                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| **Key Models**     | `Tenant`, `TenantTier`, `TierLevel`, `StandardSeat`, `SoloSeat`, `PremiumSeat`                        |
| **Key Services**   | `tenantQueries` (25+ table filter functions), `withTenant()`, `hasPermission()`                       |
| **Permissions**    | `ROLE_PERMISSIONS` map for 6 roles (RESIDENT, GROUP_ADMIN, COMMITTEE, BOARD, PROPERTY_MANAGER, ADMIN) |
| **Feature Gating** | `FeatureRegistry` (30+ fine-grained toggles), `TierGuard`, `isModuleEnabled()`                        |
| **API Surface**    | No direct REST routes — infrastructure consumed by all other contexts                                 |
| **Prisma Models**  | `Tenant`, `PlatformModule`, `TenantModule`, `StandardSeat`, `SoloSeat`, `PremiumSeat`                 |

**Relationships:**

- **Upstream of** every other context (provides tenant resolution, permissions, feature gates)
- **Shared Kernel** with User (Seat model spans both)
- **Conformist** of Prisma schema (schema is source of truth)

---

### 2. User / Identity

**Directory:** `src/entities/user/`, `src/server/routers/identity.ts`

Manages authentication identities, user profiles, invitations, and seat assignments. The `identity` tRPC router handles 12 procedures for user CRUD within a tenant.

| Aspect            | Detail                                                                       |
| ----------------- | ---------------------------------------------------------------------------- |
| **Key Models**    | `AdminUser`, `Invitation`, `SeatInfo`, `AdminUserProfile`, `AdminSuspension` |
| **Key Services**  | `src/server/routers/identity.ts` (tRPC: 12 procedures)                       |
| **Permissions**   | Delegates to `@entities/tenant/api/permissions.ts`                           |
| **API Surface**   | tRPC identity router, REST: `/api/users/*`, `/api/auth/*`                    |
| **Prisma Models** | `User`, `Invitation`                                                         |

**Relationships:**

- **Depends on** Tenant (permissions, role resolution)
- **Shared Kernel** with Tenant (Seat types defined in tenant, referenced in user)
- **Depends on** Directory (Property info for user display)

**Note:** `src/entities/identity/` is deprecated. Logic moved to `src/server/routers/identity.ts`.

---

### 3. Directory

**Directory:** `src/entities/directory/`

The community directory context. Merges User + Seat + Profile data for resident display, property lookup, and household membership.

| Aspect            | Detail                                                                              |
| ----------------- | ----------------------------------------------------------------------------------- |
| **Key Models**    | `Resident`, `Property`, `Landlord`, `ViewMode`, `FilterType`, `ResidentFilterState` |
| **Key Services**  | `useResidentFilter` (features-level hook)                                           |
| **API Surface**   | REST: `/api/directory/*`, `/api/residents/*`                                        |
| **Prisma Models** | `Property`, `Household`, `Profile` (shared with Tenant context)                     |

**Relationships:**

- **Depends on** Tenant (property/seat data, permissions)
- **Depends on** User (user identity for resident cards)
- **Conformist** of Prisma Property/Household models

**Boundary Issue:** Defines its own `Property` type with different field names (`street`/`unit`) than the tenant entity (`streetAddress`/`unitNumber`). See UBIQUITOUS_LANGUAGE.md for resolution.

---

### 4. Maintenance

**Directory:** `src/entities/maintenance/`

Manages maintenance requests with 7-status lifecycle, ticket numbering, team assignment, and service provider tracking.

| Aspect            | Detail                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Key Models**    | `MaintenanceRequest`, `MaintenanceStatus` (7 states), `MaintenancePriority`, `MaintenanceTeam`, `ServiceProvider`, `MaintenanceCategory`, `TicketAssignment` |
| **Key Services**  | Full DB query layer (CRUD, assignment, history)                                                                                                              |
| **Permissions**   | `canViewAllRequests`, `canManageRequests` (delegates to tenant permissions)                                                                                  |
| **API Surface**   | REST: `/api/maintenance/*`, `/api/maintenance-requests/*`                                                                                                    |
| **DTOs**          | `@shared/api/dto/maintenance.ts`                                                                                                                             |
| **Prisma Models** | `MaintenanceRequest`, `MaintenanceCategory`                                                                                                                  |

**Relationships:**

- **Depends on** Tenant (permissions, tenant isolation)
- **Depends on** User (createdBy, assignedTo references)
- **Depends on** Directory (Property reference for request location)
- **Upstream of** Widget (maintenance widget reads from this context)

---

### 5. Booking

**Directory:** `src/entities/booking/`

Facility booking with time-slot management, status lifecycle (PENDING → CONFIRMED → COMPLETED/CANCELLED), and tenant-configurable facilities.

| Aspect            | Detail                                                                      |
| ----------------- | --------------------------------------------------------------------------- |
| **Key Models**    | `Booking`, `BookingStatus`, `Facility`, `TenantFacility`, `BookingFormData` |
| **Key Services**  | `getTenantFacilities`, `validateFacility`, CRUD operations                  |
| **Permissions**   | `canViewAllBookings` (delegates to tenant)                                  |
| **API Surface**   | REST: `/api/bookings/*`, `/api/facilities/*`                                |
| **DTOs**          | `@shared/api/dto/booking.ts`                                                |
| **Prisma Models** | `Booking`, `Facility`                                                       |

**Relationships:**

- **Depends on** Tenant (permissions, tenant isolation, feature gate)
- **Depends on** User (booking userId reference)
- **Upstream of** Widget (booking widget reads from this context)

---

### 6. Chat

**Directory:** `src/entities/chat/`

Real-time messaging with Supabase Realtime. Conversations (direct + group), typing indicators, online presence.

| Aspect            | Detail                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------- |
| **Key Models**    | `Conversation`, `Message`, `ConversationType`, `MessageType`, `ChatState`, `DirectChatState` |
| **Key Services**  | Features-level hooks: `useRealtimeMessages`, `useTypingIndicator`, `usePresence`             |
| **API Surface**   | REST: `/api/messages/*`, `/api/conversations/*`                                              |
| **DTOs**          | `@shared/api/dto/conversation.ts`, `@shared/api/dto/message.ts`                              |
| **Prisma Models** | `Conversation`, `Message`                                                                    |

**Relationships:**

- **Depends on** Tenant (tenant isolation)
- **Depends on** User (participant references)
- **Event-driven** via Supabase Realtime (separate from REST lifecycle)

---

### 7. Content

**Directory:** `src/entities/content/`

Content management for articles, resources, and pages. Supports scheduling, visibility scoping, and Tiptap rich editing.

| Aspect            | Detail                                                   |
| ----------------- | -------------------------------------------------------- |
| **Key Models**    | `ContentItem` (no barrel export — types scattered)       |
| **Key Services**  | `buildContentConditions`, `listContent`, `createContent` |
| **Permissions**   | `canManageContent`, `canManageOwnContent`                |
| **API Surface**   | REST: `/api/content/*`                                   |
| **DTOs**          | `@shared/api/dto/content.ts` (not in shared barrel)      |
| **Prisma Models** | `Content`, `ContentCategory`                             |

**Relationships:**

- **Depends on** Tenant (permissions, tenant isolation)
- **Depends on** User (author reference)
- **Overlaps with** Service (service entity defines its own `ContentItem`)

**Boundary Issue:** No `index.ts` barrel export. Content DTO exists but isn't in the shared DTO barrel. Service entity defines a competing `ContentItem` interface.

---

### 8. Events

**Directory:** `src/entities/events/`

Community event management with CRUD, date filtering, and admin scheduling.

| Aspect            | Detail                                             |
| ----------------- | -------------------------------------------------- |
| **Key Models**    | Types in `constants.ts`/`schema.ts`                |
| **Key Services**  | `listEvents`, `validateEventFields`, `createEvent` |
| **Permissions**   | `canManageEvents`                                  |
| **API Surface**   | REST: `/api/events/*`                              |
| **DTOs**          | `@shared/api/dto/event.ts`                         |
| **Prisma Models** | `Event`                                            |

**Relationships:**

- **Depends on** Tenant (permissions, tenant isolation)
- **Depends on** User (organizer reference)

---

### 9. Service

**Directory:** `src/entities/service/`

Service catalog with categories, hours, emergency contacts, and reviews.

| Aspect            | Detail                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------- |
| **Key Models**    | `ServiceCategory`, `AdditionalService`, `ServiceHour`, `EmergencyContact`, `ContentItem` |
| **Key Services**  | None at entity level                                                                     |
| **API Surface**   | REST: `/api/services/*`, `/api/community-services/*`                                     |
| **Prisma Models** | `AdditionalService`, `ServiceHour`, `EmergencyContact`                                   |

**Relationships:**

- **Depends on** Tenant (tenant isolation)
- **Overlaps with** Content (defines its own `ContentItem`)

**Boundary Issue:** Defines `ContentItem` interface that overlaps with the content entity's domain. Should consume content entity types instead.

---

### 10. Widget

**Directory:** `src/entities/widget/`

Dashboard state management. Widget registry, layout persistence, default configurations, and the Focus Space architecture.

| Aspect            | Detail                                                                    |
| ----------------- | ------------------------------------------------------------------------- |
| **Key Models**    | `WidgetLayouts`, `UserWidgets`, `DashboardConfig`                         |
| **Key Services**  | `widget-store.ts` (Zustand), `default-layouts.ts`, `tab-migration-map.ts` |
| **API Surface**   | REST: `/api/widgets/*`, `/api/dashboard/*`                                |
| **Prisma Models** | None (state persisted via settings JSON)                                  |

**Relationships:**

- **Depends on** Tenant (feature gate, role-based layouts)
- **Consumes** all entity contexts (widgets display data from maintenance, booking, chat, etc.)
- **In transition** — Tab → Space migration incomplete (Phase 31 pending)

---

### 11. Admin

**Directory:** `src/entities/admin/`

Purpose-built admin layer with command bar, activity stream, and domain navigation. Re-exports some Tenant types.

| Aspect            | Detail                                                                   |
| ----------------- | ------------------------------------------------------------------------ |
| **Key Models**    | `AdminTab`, `AdminWidget` (re-exports `Tenant`, `TierLevel` from tenant) |
| **Key Services**  | None at entity level                                                     |
| **API Surface**   | REST: `/api/admin/*`                                                     |
| **Prisma Models** | None                                                                     |

**Relationships:**

- **Depends on** Tenant (re-exports types, uses permissions)
- **Consumes** all entity contexts (admin layer aggregates admin actions across domains)

**Boundary Issue:** Re-exports `Tenant` and `TierLevel` from tenant entity — should import directly from tenant instead.

---

### 12. Competitions

**Directory:** `src/server/routers/competitions.ts`, `src/app/(tenant)/competition/`

Competition entries with 3 types (RAFFLE, PHOTO, SCORE). Implemented as tRPC router (9 procedures) + public/admin UI.

| Aspect            | Detail                                               |
| ----------------- | ---------------------------------------------------- |
| **Key Models**    | `Competition`, `CompetitionEntry`, `CompetitionType` |
| **Key Services**  | tRPC: 9 procedures (list, create, enter, draw, etc.) |
| **API Surface**   | tRPC competitions router                             |
| **DTOs**          | `@shared/api/dto/competition.ts`                     |
| **Prisma Models** | `Competition`, `CompetitionEntry`                    |

**Relationships:**

- **Depends on** Tenant (permissions, tenant isolation)
- **Depends on** User (participant/creator references)

**Note:** No dedicated entity directory. Logic lives in tRPC router + features + app pages.

---

## Context Map (Visual)

```
                    ┌─────────────┐
                    │   Tenant    │ ← Core (upstream of all)
                    │  (Core)     │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────────┐
              │            │                │
       ┌──────┴──────┐  ┌──┴───┐  ┌────────┴────────┐
       │    User     │  │ Dir  │  │     Widget       │
       │  /Identity  │  │ ect  │  │  (Dashboard)     │
       └──────┬──────┘  └──┬───┘  └────────┬────────┘
              │            │               │
    ┌─────────┼────────────┼───────────────┤
    │         │            │               │
 ┌──┴──┐  ┌──┴──┐  ┌──────┴──┐  ┌────────┴──┐
 │Maint│  │Book │  │  Chat   │  │   Admin    │
 │     │  │ing  │  │         │  │  (Layer)   │
 └─────┘  └─────┘  └─────────┘  └───────────┘

    ┌────────┐  ┌────────┐  ┌─────────┐  ┌────────────┐
    │Content │  │Events │  │ Service │  │Competitions│
    │   ↕    │  │       │  │    ↕    │  │  (tRPC)    │
    │overlap │  │       │  │ overlap │  │            │
    │with Svc│  │       │  │with Cont│  │            │
    └────────┘  └───────┘  └─────────┘  └────────────┘

 Cross-Cutting:
 ┌───────────────────────────────────────────────┐
 │ Auth (Better Auth)  ·  Middleware             │
 │ Feature Gate       ·  Rate Limiter            │
 │ RLS (runWithRLS)   ·  Observability (Pino)    │
 │ DTO Layer (15 modules)  ·  API Envelope       │
 └───────────────────────────────────────────────┘
```

---

## Cross-Cutting Concerns

### Authentication (Better Auth)

- **Every** protected route calls `getSessionAndRole()` from `src/shared/api/auth-utils.ts`
- `requireRole()` / `requirePlatformAdmin()` for server-side gating
- `requireNotSuspended()` / `throwIfSuspended()` for suspension enforcement
- Affects: All contexts except public pages

### Tenant Isolation

- Middleware resolves tenant from host headers → `x-tenant-id`/`x-tenant-slug`
- `withTenant()` in API routes resolves tenant from headers or `LOCAL_TENANT_SLUG` env
- `tenantQueries` provides 25+ Drizzle filter functions for tenant-scoped queries
- **20 routes still missing tenant filters** (BD issue `e0w`)
- Affects: All contexts

### Feature Gating (Triple System)

1. **TierGuard** — Tier-based access: `hasFeature()`/`canAccessPage()`/`canUseWidget()` from `FeatureRegistry`
2. **Module Gate** — Module-based: `isModuleEnabled(tenantId, moduleKey)` checks `tenant_modules` + `platform_modules`
3. **PlatformPageFlags** — DB-stored per-tenant boolean flags (15 flags)

- Affects: All contexts with user-facing pages

### RLS (Row-Level Security)

- `runWithRLS()` sets Postgres session variables for DB-level tenant isolation
- Only 6 tables have RLS policies; most routes use superuser connection
- Affects: All data-accessing contexts (defense-in-depth gap)

### API Governance

- `apiSuccess()`/`apiError()` envelope (Phase 35 standard)
- 10 canonical error codes
- 15 DTO modules in `@shared/api/dto/`
- Rate limiting (in-memory, per-route)
- Observability with Pino + request IDs
- Affects: All API routes

---

## Context Relationship Patterns

| Upstream → Downstream | Pattern               | Contract                                                   |
| --------------------- | --------------------- | ---------------------------------------------------------- |
| Tenant → All          | Shared Kernel         | `withTenant()`, `hasPermission()`, `isModuleEnabled()`     |
| Tenant ↔ User         | Shared Kernel         | Seat types, role resolution                                |
| Widget → All entities | Conformist            | Reads entity data for display; no write access             |
| Admin → All entities  | Conformist            | Aggregates admin actions across domains                    |
| Content ↔ Service     | Overlapping           | Both define `ContentItem` — needs unification              |
| Prisma → Drizzle      | Customer-Supplier     | Prisma is schema source; Drizzle is generated consumer     |
| tRPC → REST           | Anti-Corruption Layer | tRPC routers follow different conventions than REST routes |

---

## Open Boundary Issues

| Issue                                      | Contexts Affected             | Priority | Status             |
| ------------------------------------------ | ----------------------------- | -------- | ------------------ |
| Property type inconsistency (4 shapes)     | Directory, Tenant, User, DTOs | High     | Open               |
| Content ↔ Service ContentItem overlap      | Content, Service              | Medium   | Open               |
| Admin re-exports Tenant types              | Admin, Tenant                 | Low      | Open               |
| identity entity deprecated but not removed | User, Identity                | Low      | Open               |
| Content entity missing barrel export       | Content                       | Low      | Open               |
| Tab → Space migration incomplete           | Widget                        | Medium   | Planned (Phase 31) |
| 20 routes missing tenant filters           | All API contexts              | Critical | BD issue `e0w`     |
| Three overlapping gating systems           | All contexts                  | Medium   | Undocumented       |
