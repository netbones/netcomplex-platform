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

**Goal:** Implement governed announcements layer — role-gated priority taxonomy, audience targeting with fanout, document attachment, admin CRUD UI, stream widget + /news embed (no new nav items)

**Status:** Complete

**Requirements:** ANN-01, ANN-02, ANN-03, R1, R2, R3, R6, R7, R8

**Plans:** 2 plans

- [ ] 11-01-PLAN.md — Schema migration + priority taxonomy + API with targeting/fanout/priority enforcement
- [ ] 11-02-PLAN.md — Admin form (role-gated priority + targeting + resource link) + stream widget + /news embed

---

## Phase: 18-toast-unification

**Goal:** Unify on Sonner as the single toast notification system, remove Zustand Toast

**Status:** Complete

**Plans:**

- [x] 18-01-PLAN.md — Remove Zustand Toast, migrate admin/users to Sonner, add ADR-018 ✅

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

**Status:** Complete (4/4 plans)

**Requirements:** INCEPT-01, INCEPT-02, INCEPT-03, INCEPT-04, INCEPT-05

**Plans:**

- [x] 20-01-PLAN.md — Fix signup API: ownerId, Better Auth password, onboarding redirect ✅
- [x] 20-02-PLAN.md — Build 5-step onboarding wizard (branding, modules, pages, invites, launch) ✅
- [x] 20-03-PLAN.md — AssistSession model + API for time-limited staff access (Path B) ✅
- [x] 20-04-PLAN.md — Gap closure: InviteStep sends invitations, auth-guard enforces AssistSession scope ✅

---

## Phase: 21-content-events

**Goal:** Content scheduling UI, Events CRUD admin pages, Events dashboard tab

**Status:** Complete (3/3 plans)

**Requirements:** CONTENT-01, CONTENT-02, EVENTS-01, EVENTS-02, EVENTS-03

**Plans:**

- [x] 21-01-PLAN.md — Content scheduling: date pickers, API date filtering ✅
- [x] 21-02-PLAN.md — Events CRUD: admin pages, EventForm, EventList, API routes ✅
- [x] 21-03-PLAN.md — Events dashboard tab and upcoming events widget ✅

---

## Phase: 22-page-flag-expansion

**Goal:** Expand page visibility flags for Groups, Services, Resources, Maintenance, Surveys, and Competitions.

**Status:** Complete (3/3 plans)

**Requirements:** FLAG-EXP-01, FLAG-EXP-02, FLAG-EXP-03, FLAG-EXP-04, FLAG-EXP-05

**Plans:**

- [x] 22-01-PLAN.md — Foundation: Enums, Flag Logic, API, and Hook ✅
- [x] 22-02-PLAN.md — Configuration UI: Admin Widget and Locales ✅
- [x] 22-03-PLAN.md — Navigation: Header, Footer, and Mobile Menu ✅

---

## Phase: 23-competitions-resources

**Goal:** Competitions model + admin CRUD + dynamic public page, Resources standalone model with file uploads/visibility/migration

**Status:** Complete (4/4 plans)

**Requirements:** COMP-01, COMP-02, RES-01, RES-02, RES-03, RES-04, RES-05

**Plans:**

- [x] 23-01-PLAN.md — Competition model, API, admin CRUD, dynamic public page ✅
- [x] 23-02-PLAN.md — Resource model, API with visibility, admin CRUD with file upload ✅
- [x] 23-03-PLAN.md — Public resources page rewrite, Content migration, enum cleanup ✅
- [x] 23-04-PLAN.md — Gap closure: Competition status UI, public auth fix, resource edit auth forwarding ✅

---

## Phase: 24-dashboard-enhancement

**Goal:** Add surveys tab with results visualisation, group moderation queue widget, fix widget state persistence

**Status:** Complete (3/3 plans)

**Requirements:** DASH-01, DASH-02, DASH-03, DASH-04

**Plans:**

- [x] 24-01-PLAN.md — Surveys tab, SurveysWidget, survey results API + visualisation page ✅
- [x] 24-02-PLAN.md — Group membership request API, GroupModerationWidget ✅
- [x] 24-03-PLAN.md — Widget state persistence fix, reset-to-defaults ✅

---

## Phase: 25-gap-closure

**Goal:** Close remaining gaps from GAPS.md — platform admin auth guards, MobileMenu role fix, onboarding transaction, widget deduplication, test coverage

**Status:** Complete (3/3 plans)

**Requirements:** SCHEMA-04, INCEPT-01, GAP-03, GAP-04, GAP-09, GAP-12, GAP-14

**Plans:**

- [x] 25-01-PLAN.md — Platform admin auth guards + MobileMenu role fix ✅
- [x] 25-02-PLAN.md — Onboarding transaction + widget deduplication ✅
- [x] 25-03-PLAN.md — Test suites for resources, competitions, platform-admin ✅

---

## Phase: 26-navigation-alignment

**Goal:** Align all navigation surfaces with NAVIGATION_GOVERNANCE.md — single source of truth, More dropdown, 4-section burger, Conservation/Campaign mutual exclusion, role-aware admin isolation

**Status:** Complete (3/3 plans)

**Requirements:** NAV-01, NAV-02, NAV-03, NAV-04, NAV-05, NAV-06, NAV-07, NAV-08, NAV-09

**Plans:**

- [x] 26-01-PLAN.md — Navigation config foundation: types, items, filtering functions, headerEngagementFocus setting ✅
- [x] 26-02-PLAN.md — Wire components: Header (More dropdown + avatar), MobileMenu (4-section burger), Footer (2-tier), SideDrawer (flag-gated) ✅
- [x] 26-03-PLAN.md — Admin UI (engagement focus selector), dead code cleanup, navigation-config test suite ✅

---

## Phase: 27-tenant-config-and-gaps

**Goal:** Make booking facilities and maintenance categories tenant-configurable via onboarding + settings API; close remaining GAPS.md items (GAP-05, GAP-10, GAP-13, GAP-15, GAP-16)

**Status:** Not Started

**Requirements:** CFG-01, CFG-02, CFG-03, GAP-05, GAP-10, GAP-13, GAP-15, GAP-16

**Plans:** 2 plans

- [ ] 27-01-PLAN.md — Tenant-configurable facilities/categories: preset catalogs, settings API, onboarding steps, booking form reads tenant config
- [ ] 27-02-PLAN.md — Gap closures: resource migration (GAP-05), EventsWidget duplication (GAP-15), duplicate DB client (GAP-16), assist scope enforcement (GAP-10), widget DB sync (GAP-13)

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
