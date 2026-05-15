# Project Roadmap

## Project: NetComplex Multi-Tenant Platform

Transform Soralia Village from single-tenant to white-label SaaS platform.

---

## Phase: 00-multi-tenant-foundation

**Goal:** Establish core multi-tenant infrastructure — tenant resolution, enforcement helpers, seed data

**Status:** Complete

**Requirements:** MULTI-01, MULTI-02, MULTI-03

**Plans:**

- [x] 00-01-PLAN.md — Phase 0 Foundation (7 tasks) ✅

---

## Phase: 01-enforcement

**Goal:** Apply tenant enforcement to API routes, wire dynamic theming, integrate FeatureGate, consolidate locales

**Status:** Complete

**Requirements:** MULTI-04

**Plans:**

- [x] 01-01-PLAN.md — Phase 1 Enforcement (4 tasks) ✅

---

## Phase: 05-widget-registry-alignment

**Goal:** Align widget registry with NetComplex architecture — convert from plain object to WidgetRegistry class

**Status:** Complete

**Requirements:** WIDGET-01, WIDGET-02, WIDGET-03, WIDGET-04

**Plans:**

- [x] 05-01-PLAN.md — Widget Registry Alignment (3 tasks) ✅

---

## Phase: 06-maintenance-requests

**Goal:** Implement maintenance request system — submit requests with category, priority, description, photo upload, status tracking

**Status:** Complete

**Requirements:** MAINT-01, MAINT-02, MAINT-03

**Plans:**

- [x] 06-01-PLAN.md — Complete maintenance ✅

---

## Phase: 07-facility-booking

**Goal:** Implement facility booking as NetComplex module — feature flag gated, tenant-configurable

**Status:** Complete

**Requirements:** BOOKING-01, BOOKING-02, BOOKING-03

**Plans:**

- [x] 07-01-PLAN.md — Facility Booking Module ✅

---

## Phase: 08-module-architecture

**Goal:** Establish module architecture — platform_modules + tenant_modules tables, tier on tenants, enforcement helpers, FeatureGate update. Foundation for all future module work.

**Status:** Complete

**Requirements:** MOD-01, MOD-02, MOD-03, MOD-04

**Plans:**

- [x] 08-01-PLAN.md — Module Architecture Foundation ✅

---

## Phase: 09-real-time-chat

**Goal:** Wire Supabase Realtime for chat — real-time message delivery, typing indicators, online presence

**Status:** Complete

**Requirements:** CHAT-01, CHAT-02

**Plans:**

- [x] 09-01-PLAN.md — Real-time wiring for conversations ✅

---

## Phase: 10-email-notifications

**Goal:** Wire MailerSend for transactional emails — signup welcome, password reset, user-enabled notifications

**Status:** Complete

**Requirements:** EMAIL-01, EMAIL-02

**Plans:**

- [x] 10-01-PLAN.md — MailerSend email integration ✅

---

## Phase: 11-announcements

**Goal:** Implement announcements board — announcement model, API, board UI with priority levels

**Status:** Not Started

**Plans:**

- [ ] 11-01-PLAN.md — Announcement model + API

---

## Phase: 18-toast-unification

**Goal:** Unify on Sonner as the single toast notification system, remove Zustand Toast

**Status:** Planned

**Plans:**

- [ ] 18-01-PLAN.md — Remove Zustand Toast, migrate admin/users to Sonner, add ADR-018

---

## Phase: 19-schema-corrections

**Goal:** Critical schema fixes and Platform Admin API wiring — Setting uniqueness, Tenant ownerId, user isPlatformAdmin, Header role bug, tenant CRUD routes

**Status:** Complete

**Requirements:** SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, SCHEMA-05

**Plans:**

- [x] 19-01-PLAN.md — Schema: Setting uniqueness, Tenant ownerId, user isPlatformAdmin ✅
- [x] 19-02-PLAN.md — Fix Header role case-sensitivity bug ✅
- [x] 19-03-PLAN.md — Wire Platform Admin tenant CRUD + isPlatformAdmin guard ✅

---

## Phase: 20-self-service-inception

**Goal:** Self-service tenant signup + onboarding wizard — atomic user+tenant creation, 5-step guided setup, assisted provisioning

**Status:** Planned

**Requirements:** INCEPT-01, INCEPT-02, INCEPT-03, INCEPT-04, INCEPT-05

**Plans:**

- [ ] 20-01-PLAN.md — Fix signup API: ownerId, Better Auth password, onboarding redirect
- [ ] 20-02-PLAN.md — Build 5-step onboarding wizard (branding, modules, pages, invites, launch)
- [ ] 20-03-PLAN.md — AssistSession model + API for time-limited staff access (Path B)

---

## Future Phases (To Be Planned)

### Phase: Second Tenant

- Onboard second tenant
- Enable RLS
- Test isolation

---

## Module Architecture (Phase 08 Design)

### Tier Model

| Tier           | Modules                                                                |
| -------------- | ---------------------------------------------------------------------- |
| **Standard**   | Dashboard, Directory, Groups, Maintenance, Community Services, Content |
| **Premium**    | Bookings, Premium Seats, Property Listings                             |
| **Enterprise** | Agent Marketplace, White Label                                         |

_Marketing picks display labels. Internal tier names: standard | premium | enterprise_

### Two-Table Schema

```
platform_modules          → What NetComplex offers
├── key (text unique)     → 'bookings', 'maintenance', etc.
├── minTier              → Enforces tier-gating
├── label               → Display name
└── defaultEnabled      → Boolean

tenant_modules           → What each tenant has
├── tenantId             → FK → tenants
├── moduleKey            → FK → platform_modules.key
├── enabled             → Boolean
├── config (jsonb)       → Per-module overrides
└── enabledAt           → Audit trail
```

### Enforcement Gates

1. **Middleware**: Coarse-grained route protection (redirect if tier insufficient)
2. **FeatureGate**: Reads resolved module list from tables (tier check implicit)
3. **API Layer**: `assertModuleEnabled()` helper — server-side enforcement
