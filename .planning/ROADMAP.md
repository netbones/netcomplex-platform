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

## Phase: 02-admin-ui

**Goal:** Build tenant admin UI for branding, feature toggles, and back-populate tenant records

**Status:** Planned

**Requirements:** MULTI-05, MULTI-06

**Plans:**

- [ ] 02-01-PLAN.md — Phase 2 Admin UI (3 tasks)

---

## Phase: 03-localization

**Goal:** Add internationalization support to platform landing page with language switcher and tenant-specific translation overrides

**Status:** Planned

**Requirements:** [To be added]

**Plans:**

- [ ] 03-01-PLAN.md — Phase 3 Localization (7 tasks)

---

## Phase: 05-widget-registry-alignment

**Goal:** Align widget registry with NetComplex architecture — convert from plain object to WidgetRegistry class with full manifest support (version, author, icon, lazy loading), remove dual-source feature flag lookup

**Status:** Complete

**Requirements:** WIDGET-01, WIDGET-02, WIDGET-03, WIDGET-04

**Plans:**

- [x] 05-01-PLAN.md — Widget Registry Alignment (3 tasks) ✅

---

## Phase: 06-maintenance-requests

**Goal:** Implement maintenance request system — submit requests with category, priority, description, photo upload, status tracking, notifications on status changes, request history

**Status:** In Progress

**Requirements:** MAINT-01, MAINT-02, MAINT-03 (from PRD acceptance criteria)

**Plans:**

- [x] 06-01-PLAN.md — Complete maintenance (photo storage, email notifications, admin queue) ✅

---

## Phase: 07-facility-booking

**Goal:** Deferred — Soralia Village does not have pool, gym, community center, tennis court, or BBQ area. This module may apply to other tenants who add nearby facilities (San Marina Recreation Club, The Zone Gym) or install facilities in the future.

**Status:** Deferred

**Decision:** Not implementing. Booking model + API remain in codebase as tenant-future-proofing. Feature flag controls visibility.

---

## Phase: 07-real-time-chat

**Goal:** Wire Supabase Realtime for chat — real-time message delivery, typing indicators, online presence

**Status:** Not Started

**Plans:**

- [ ] 07-01-PLAN.md — Real-time wiring for conversations

---

## Phase: 08-announcements

**Goal:** Implement announcements board — announcement model, API, board UI with priority levels

**Status:** Not Started

**Plans:**

- [ ] 08-01-PLAN.md — Announcement model + API

---

## Future Phases (To Be Planned)

### Phase: Second Tenant

- Onboard second tenant
- Enable RLS
- Test isolation
