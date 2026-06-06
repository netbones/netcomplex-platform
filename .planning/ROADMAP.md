# Project Roadmap

## Project: NetComplex Multi-Tenant Platform

Transform Soralia Village from single-tenant to white-label SaaS platform.

---

## Milestone Map

Phases are grouped into milestones (M0–M6+). See `.planning/MILESTONES.md` for full structure, gap analysis, and cadence ritual.

| Milestone                         | Goal                                                                      | Phases                                 | Status           |
| --------------------------------- | ------------------------------------------------------------------------- | -------------------------------------- | ---------------- |
| **M0 Foundation**                 | Multi-tenant substrate + base modules                                     | 00, 01, 02, 03, 05, 06, 07, 08, 11     | ✅ Shipped       |
| **M1 Core Comm & Auth**           | Real-time chat, email, schema hardening, onboarding                       | 09, 10, 18, 19, 20                     | ✅ Shipped       |
| **M2 Dashboard & Navigation**     | Focus Spaces, single-source nav, widget system                            | 22, 24, 25, 26, 27, 28, 29, 30, 31     | ✅ Shipped       |
| **M3 Trust, Safety & Engagement** | Admin command surface, suspension, surveys, ticketing                     | 21, 23, 32, 33, 34, 36, 37, 38, 39, 40 | ✅ Shipped       |
| **M4 Production-Ready**           | API governance, gate consolidation, i18n hydration                        | 35, 41, 42                             | ✅ Complete      |
| **M4.5 Stabilization**            | 7-day soak, perf baseline, rollback test, locale check                    | 43 (blockers), then (no new phases)    | 🚧 Blocked on 43 |
| **M5 Anchor Tenant Launch**       | Audit closure, Community Merits, OTP, MyHomeSpace, **dWallet** (headline) | 44 (M5a), 45 (M5b), 47 (dWallet)       | 📋 Planning      |
| **M5+ Post-Launch**               | Future features, second tenant                                            | 46 (bucket-c) + deferred               | Deferred         |

**Phase numbering note:** IDs are stable (not renumbered on re-order). Duplicates exist: `03` (Localization vs Second Tenant), `11` (Announcements vs Prisma→Drizzle). The duplicate pair has a "Planning Complete (deferred)" status on the second one, except `11-prisma-to-drizzle` which was verified complete (2026-06-03) and moved to M0. Out-of-order numeric IDs (01 after 04; 35 after 39; 99 last) reflect creation sequence, not logical order. See MILESTONES.md Gap ε.

---

## M0 — Foundation

_Multi-tenant substrate + base modules. Nothing user-facing. Verifiable: `pnpm tsc --noEmit` passes, `pnpm test` green, RLS policies in place._

---

## Phase 00: Multi Tenant Foundation

**Goal:** Establish core multi-tenant infrastructure — tenant resolution, enforcement helpers, seed data

**Status:** Complete

**Requirements:** MULTI-01, MULTI-02, MULTI-03

**Plans:**

- [x] 00-01-PLAN.md — Phase 0 Foundation (7 tasks) ✅

---

## Phase 01: Enforcement

**Goal:** Apply tenant enforcement to API routes, wire dynamic theming, integrate FeatureGate, consolidate locales

**Status:** Complete

**Requirements:** MULTI-04

**Plans:**

- [x] 01-01-PLAN.md — Phase 1 Enforcement (4 tasks) ✅

---

## Phase 02: Admin Ui

**Goal:** Admin UI for tenant management — tenant list, branding edit page, per-tenant feature toggle overrides, backfill migration script

**Status:** Complete

**Requirements:** MULTI-05, MULTI-06

**Plans:**

- [x] 02-01-PLAN.md — Tenant branding + feature toggle UI + backfill script ✅

---

## Phase 03: Localization

**Goal:** Platform-level i18n — `/[lng]/platform/` route group, language switcher, 4 locale files (en, af, xh, zu), translated platform landing sections

**Status:** Complete

**Requirements:** (none specified at planning time)

**Plans:**

- [x] 03-01-PLAN.md — Platform i18n routing + locale files + LanguageSwitcher + platform landing translations ✅

---

## Phase 05: Widget Registry Alignment

**Goal:** Align widget registry with NetComplex architecture — convert from plain object to WidgetRegistry class

**Status:** Complete

**Requirements:** WIDGET-01, WIDGET-02, WIDGET-03, WIDGET-04

**Plans:**

- [x] 05-01-PLAN.md — Widget Registry Alignment (3 tasks) ✅

---

## Phase 06: Maintenance Requests

**Goal:** Implement maintenance request system — submit requests with category, priority, description, photo upload, status tracking

**Status:** Complete

**Requirements:** MAINT-01, MAINT-02, MAINT-03

**Plans:**

- [x] 06-01-PLAN.md — Complete maintenance ✅

---

## Phase 07: Facility Booking

**Goal:** Implement facility booking as NetComplex module — feature flag gated, tenant-configurable

**Status:** Complete

**Requirements:** BOOKING-01, BOOKING-02, BOOKING-03

**Plans:**

- [x] 07-01-PLAN.md — Facility Booking Module ✅

---

## Phase 08: Module Architecture

**Goal:** Establish module architecture — platform_modules + tenant_modules tables, tier on tenants, enforcement helpers, FeatureGate update. Foundation for all future module work.

**Status:** Complete

**Requirements:** MOD-01, MOD-02, MOD-03, MOD-04

**Plans:**

- [x] 08-01-PLAN.md — Module Architecture Foundation ✅

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

---

## Phase 11: Announcements

**Goal:** Implement governed announcements layer — role-gated priority taxonomy, audience targeting with fanout, document attachment, admin CRUD UI, stream widget + /news embed (no new nav items)

**Status:** Complete

**Requirements:** ANN-01, ANN-02, ANN-03, R1, R2, R3, R6, R7, R8

**Plans:** 2 plans

- [x] 11-01-PLAN.md — Schema migration + priority taxonomy + API with targeting/fanout/priority enforcement ✅
- [x] 11-02-PLAN.md — Admin form (role-gated priority + targeting + resource link) + stream widget + /news embed ✅

> **Historical note (2026-06-03):** The phase number `11` was originally shared with a second "Phase 11: Prisma To Drizzle" entry listed in M6+ as a deferred planning-only phase. That phase was verified complete on 2026-06-03 (179 files using `drizzle-orm`, 0 files using `@prisma/client`, `src/shared/api/prisma.ts` removed) and removed from M6+. The original `11-01-PLAN.md` (now historical) proposed a big-bang migration; the actual delivery was incremental across many subsequent phases. The duplicate phase number `11` is therefore not a bug — it's the historical artifact of the deferred planning phase.

---

## M1 — Core Communication & Auth

_Real-time chat, transactional email, schema hardening, self-service onboarding. Verifiable: a new resident can sign up, verify email, join a tenant, and send a chat message that arrives in <2s._

---

## Phase 09: Real Time Chat

**Goal:** Wire Supabase Realtime for chat — real-time message delivery, typing indicators, online presence

**Status:** Complete

**Requirements:** CHAT-01, CHAT-02

**Plans:**

- [x] 09-01-PLAN.md — Real-time wiring for conversations ✅

---

## Phase 10: Email Notifications

**Goal:** Wire MailerSend for transactional emails — signup welcome, password reset, user-enabled notifications

**Status:** Complete

**Requirements:** EMAIL-01, EMAIL-02

**Plans:**

- [x] 10-01-PLAN.md — MailerSend email integration ✅

---

## Phase 19: Schema Corrections

**Goal:** Critical schema fixes and Platform Admin API wiring — Setting uniqueness, Tenant ownerId, user isPlatformAdmin, Header role bug, tenant CRUD routes

**Status:** Complete

**Requirements:** SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, SCHEMA-05

**Plans:**

- [x] 19-01-PLAN.md — Schema: Setting uniqueness, Tenant ownerId, user isPlatformAdmin ✅
- [x] 19-02-PLAN.md — Fix Header role case-sensitivity bug ✅
- [x] 19-03-PLAN.md — Wire Platform Admin tenant CRUD + isPlatformAdmin guard ✅

---

## Phase 20: Self Service Inception

**Goal:** Self-service tenant signup + onboarding wizard — atomic user+tenant creation, 5-step guided setup, assisted provisioning

**Status:** Complete (4/4 plans)

**Requirements:** INCEPT-01, INCEPT-02, INCEPT-03, INCEPT-04, INCEPT-05

**Plans:**

- [x] 20-01-PLAN.md — Fix signup API: ownerId, Better Auth password, onboarding redirect ✅
- [x] 20-02-PLAN.md — Build 5-step onboarding wizard (branding, modules, pages, invites, launch) ✅
- [x] 20-03-PLAN.md — AssistSession model + API for time-limited staff access (Path B) ✅
- [x] 20-04-PLAN.md — Gap closure: InviteStep sends invitations, auth-guard enforces AssistSession scope ✅

---

## Phase 18: Toast Unification

**Goal:** Unify on Sonner as the single toast notification system, remove Zustand Toast

**Status:** Complete

**Plans:**

- [x] 18-01-PLAN.md — Remove Zustand Toast, migrate admin/users to Sonner, add ADR-018 ✅

---

## M2 — Dashboard & Navigation

_Focus Spaces architecture, single-source navigation, widget system, tenant config. Verifiable: a resident on /dashboard sees a 3-zone Home with widgets; tab legacy code is gone._

---

## Phase 22: Page Flag Expansion

**Goal:** Expand page visibility flags for Groups, Services, Resources, Maintenance, Surveys, and Competitions.

**Status:** Complete (3/3 plans)

**Requirements:** FLAG-EXP-01, FLAG-EXP-02, FLAG-EXP-03, FLAG-EXP-04, FLAG-EXP-05

**Plans:**

- [x] 22-01-PLAN.md — Foundation: Enums, Flag Logic, API, and Hook ✅
- [x] 22-02-PLAN.md — Configuration UI: Admin Widget and Locales ✅
- [x] 22-03-PLAN.md — Navigation: Header, Footer, and Mobile Menu ✅

---

## Phase 24: Dashboard Enhancement

**Goal:** Add surveys tab with results visualisation, group moderation queue widget, fix widget state persistence

**Status:** Complete (3/3 plans)

**Requirements:** DASH-01, DASH-02, DASH-03, DASH-04

**Plans:**

- [x] 24-01-PLAN.md — Surveys tab, SurveysWidget, survey results API + visualisation page ✅
- [x] 24-02-PLAN.md — Group membership request API, GroupModerationWidget ✅
- [x] 24-03-PLAN.md — Widget state persistence fix, reset-to-defaults ✅

---

## Phase 25: Gap Closure

**Goal:** Close remaining gaps from GAPS.md — platform admin auth guards, MobileMenu role fix, onboarding transaction, widget deduplication, test coverage

**Status:** Complete (3/3 plans)

**Requirements:** SCHEMA-04, INCEPT-01, GAP-03, GAP-04, GAP-09, GAP-12, GAP-14

**Plans:**

- [x] 25-01-PLAN.md — Platform admin auth guards + MobileMenu role fix ✅
- [x] 25-02-PLAN.md — Onboarding transaction + widget deduplication ✅
- [x] 25-03-PLAN.md — Test suites for resources, competitions, platform-admin ✅

---

## Phase 26: Navigation Alignment

**Goal:** Align all navigation surfaces with NAVIGATION_GOVERNANCE.md — single source of truth, More dropdown, 4-section burger, Conservation/Campaign mutual exclusion, role-aware admin isolation

**Status:** Complete (3/3 plans)

**Requirements:** NAV-01, NAV-02, NAV-03, NAV-04, NAV-05, NAV-06, NAV-07, NAV-08, NAV-09

**Plans:**

- [x] 26-01-PLAN.md — Navigation config foundation: types, items, filtering functions, headerEngagementFocus setting ✅
- [x] 26-02-PLAN.md — Wire components: Header (More dropdown + avatar), MobileMenu (4-section burger), Footer (2-tier), SideDrawer (flag-gated) ✅
- [x] 26-03-PLAN.md — Admin UI (engagement focus selector), dead code cleanup, navigation-config test suite ✅

---

## Phase 27: Tenant Config And Gaps

**Goal:** Make booking facilities and maintenance categories tenant-configurable via onboarding + settings API; close remaining GAPS.md items (GAP-05, GAP-10, GAP-13, GAP-15, GAP-16)

**Status:** Complete

**Requirements:** CFG-01, CFG-02, CFG-03, GAP-05, GAP-10, GAP-13, GAP-15, GAP-16

**Plans:** 2 plans

- [x] 27-01-PLAN.md — Tenant-configurable facilities/categories: preset catalogs, settings API, onboarding steps, booking form reads tenant config ✅
- [x] 27-02-PLAN.md — Gap closures: resource migration (GAP-05), EventsWidget duplication (GAP-15), duplicate DB client (GAP-16), assist scope enforcement (GAP-10), widget DB sync (GAP-13) ✅

---

## Phase 28: Proxy Consolidation

**Goal:** Consolidate split proxy.ts + middleware.ts into single src/middleware.ts aligned with Next.js 15.5 (current Vercel deployment); correct architecture docs

**Status:** Complete

**Requirements:** PROXY-01, PROXY-02

**Plans:** 1 plan

- [x] 28-01-PLAN.md — Merge proxy logic into src/middleware.ts, delete root proxy.ts, correct DOMAINS-PROXY.md ✅

---

## Phase 29: Dashboard Defaults

**Goal:** Register missing maintenance + admin widgets, implement role-seeded default dashboard layouts per tab, integrate defaults into loading path, add reset-to-default action

**Status:** Complete

**Requirements:** DASH-DEFAULT-00, DASH-DEFAULT-01, DASH-DEFAULT-02, DASH-DEFAULT-03

**Plans:** 2 plans

- [x] 29-01-PLAN.md — Register missing widgets, update dashboard-config.ts, discover layout shape, write default layouts per role/tab
- [x] 29-02-PLAN.md — Wire defaults into DashboardPage loading path, reconcile DEFAULT_TABS fallback, add reset-to-default with DB persist

---

## Phase 30: Dashboard Phase B

**Goal:** Replace tab-based dashboard with Focus Space architecture — 5 spaces (Home, Services, Community, Messages, Admin), HomeLayer landing screen, widget-to-space migration, admin sub-launcher, My Home consolidation, mobile bottom bar, feature-flag controlled rollout

**Status:** Complete

**Requirements:** FOCUS-01, FOCUS-02, FOCUS-03, FOCUS-04, FOCUS-05, FOCUS-06, FOCUS-07, FOCUS-08, FOCUS-09, FOCUS-10, FOCUS-11, FOCUS-12, FOCUS-13, FOCUS-14

**Plans:** 5 plans

- [x] 30-01-PLAN.md — Space definitions, routing scaffold, SpaceLauncher sidebar (Wave 1) ✅
- [x] 30-02-PLAN.md — HomeLayer three-zone component, feature flag wiring, default layout remapping (Wave 2) ✅
- [x] 30-03-PLAN.md — Widget-to-space migration, SpaceLayout component, AddWidgetModal space filtering (Wave 2) ✅
- [x] 30-04-PLAN.md — Admin sub-launcher, My Home space, Announcements in Messages (Wave 3) ✅
- [x] 30-05-PLAN.md — Mobile bottom bar, responsive layout, feature flag cleanup, human verification (Wave 4) ✅

---

## Phase 31: Dashboard Tab Removal

**Goal:** Remove all tab-mode dashboard code after Phase 30 Focus Space architecture is proven — delete old DashboardPage/DashboardTabs, strip tab-keyed defaults, remove feature flag. /admin route is NOT in scope (consolidated in Phase 37).

**Status:** Complete

**Requirements:** TAB-REM-01, TAB-REM-02, TAB-REM-03, TAB-REM-04, TAB-REM-05, TAB-REM-06

**Plans:** 3 plans

- [x] 31-01-PLAN.md — Data migration: bump persist v4→v5, final migrateToSpaceLayouts, store cleanup + tabId→spaceId rename (Wave 1) ✅
- [x] 31-02-PLAN.md — Delete tab files: DashboardPage, DashboardTabs, tab-migration-map, admin-config; remove feature flag (Wave 2) ✅
- [x] 31-03-PLAN.md — Strip tab-keyed defaults from default-layouts; rename getSpaceDefaultLayout→getDefaultLayout; rename tabId→spaceId in WidgetCard/DraggableWidget/SpaceLayout (Wave 2) ✅

---

## M3 — Trust, Safety & Engagement

_Admin command surface, user suspension, surveys, competitions, maintenance ticketing, space layers. Verifiable: a board member can suspend a user with reason+duration, file a maintenance ticket, run a survey, and manage competitions from `/admin`._

---

## Phase 21: Content Events

**Goal:** Content scheduling UI, Events CRUD admin pages, Events dashboard tab

**Status:** Complete (3/3 plans)

**Requirements:** CONTENT-01, CONTENT-02, EVENTS-01, EVENTS-02, EVENTS-03

**Plans:**

- [x] 21-01-PLAN.md — Content scheduling: date pickers, API date filtering ✅
- [x] 21-02-PLAN.md — Events CRUD: admin pages, EventForm, EventList, API routes ✅
- [x] 21-03-PLAN.md — Events dashboard tab and upcoming events widget ✅

---

## Phase 23: Competitions Resources

**Goal:** Competitions model + admin CRUD + dynamic public page, Resources standalone model with file uploads/visibility/migration

**Status:** Complete (4/4 plans)

**Requirements:** COMP-01, COMP-02, RES-01, RES-02, RES-03, RES-04, RES-05

**Plans:**

- [x] 23-01-PLAN.md — Competition model, API, admin CRUD, dynamic public page ✅
- [x] 23-02-PLAN.md — Resource model, API with visibility, admin CRUD with file upload ✅
- [x] 23-03-PLAN.md — Public resources page rewrite, Content migration, enum cleanup ✅
- [x] 23-04-PLAN.md — Gap closure: Competition status UI, public auth fix, resource edit auth forwarding ✅

---

## Phase 32: Users List Refactor

**Goal:** Break the 1,431-line UsersListSection.tsx into maintainable sub-components each under 500 lines — extract types to entity layer, pure helpers to lib/, data fetch to custom hook, 5 modal dialogs to separate components using shared ModalOverlay, table into row/edit-row/table components, slim orchestrator under 300 lines

**Status:** Complete

**Requirements:** REFACTOR-01, REFACTOR-02, REFACTOR-03

**Plans:** 1 plan

- [x] 32-01-PLAN.md — Extract types/helpers/hook/ModalOverlay, then extract modals + table components + slim orchestrator (Wave 1) ✅

---

## Phase 33: User Suspension

**Goal:** Implement a proper admin suspension mechanism — admin can issue timed suspensions (2 days, 1 week, 30 days, permanent) with type (violation, disruption, behavior, property, non-payment, other), reason, and description. Suspended users are deactivated and blocked at the API level. Users can be unsuspended early. Suspension history is tracked in the existing platformSuspension table.

**Status:** Complete (verified 14/14 must-haves, 2026-05-28)

**Requirements:** SUSP-01, SUSP-02, SUSP-03

**Plans:** 2 plans

- [x] 33-01-PLAN.md — Backend: suspension API routes (suspend/unsuspend/history) + auth guard + suspension-status endpoint (Wave 1) ✅
- [x] 33-02-PLAN.md — Frontend: types, rewrite SuspendUserModal with full form, update UserRow/UsersListSection, i18n translations (Wave 2) ✅

---

## Phase 34: Admin Layer

**Goal:** Replace the admin space widget-grid+sub-launcher hybrid with a purpose-built AdminLayer command panel that mirrors the HomeLayer architecture — command bar → domains grid → lazy activity stream → collapsible widget area, driven by urgency + activity APIs

**Status:** Complete

**Requirements:** ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04

**Plans:** 1 plan

- [x] 34-01-PLAN.md — AdminLayer command panel: urgency + activity APIs, AdminCommandBar, AdminActivityStream, AdminLayer component, admin space routing, widget cleanup (Wave 1) ✅

---

## Phase 36: Survey Builder

**Goal:** Build a Google Forms-like survey/question builder in the admin panel — dedicated builder page, 6 question types, accordion sections, image support, drag-and-drop reordering, metadata tags

**Status:** Complete

**Requirements:** SURVEY-BUILD-01, SURVEY-BUILD-02, SURVEY-BUILD-03, SURVEY-BUILD-04, SURVEY-BUILD-05, SURVEY-BUILD-06

**Plans:**

| Wave | Plan              | Objective                                                             |
| ---- | ----------------- | --------------------------------------------------------------------- |
| 1    | [x] 36-01-PLAN.md | Schema: LINEAR_SCALE, config columns, SurveySection model + migration |
| 2    | [x] 36-02-PLAN.md | API: Question/Section CRUD + reorder + survey GET/PUT                 |
| 3    | [x] 36-03-PLAN.md | UI: Builder page, 6 question type blocks, BlockPalette, SectionBlock  |
| 4    | [x] 36-04-PLAN.md | Drag-and-drop, TipTap image embed, auto-save, responsive polish       |

---

## Phase 37: Admin Route Consolidation

**Goal:** Consolidate dual admin routes (`/admin` + `/dashboard/admin`) into a single canonical `/admin` route — remove broken redirect, install AdminLayer as the `/admin` landing page, normalize all links

**Status:** Complete (2026-05-29)

**Requirements:** None (cleanup/housekeeping)

**Plans:** 1 plan

- [x] 37-01-PLAN.md — Move AdminLayer to /admin + remove redirect + normalize all widget links + update navigation (Wave 1) ✅

---

## Phase 38: Space Layers

**Goal:** Convert /dashboard/services and /dashboard/messages from SpaceLayout widget grids into purpose-built zoned layers (urgency zone + domain grid) following the AdminLayer/HomeLayer architecture. /dashboard/community remains the only true DnD widget space.

**Status:** Complete (verified, 2026-05-30)

**Requirements:** LAYER-01, LAYER-02, LAYER-03, LAYER-04

**Plans:** 4 plans

| Wave | Plan              | Objective                                                     |
| ---- | ----------------- | ------------------------------------------------------------- |
| 1    | [x] 38-01-PLAN.md | Backend: services urgency API + messages urgency API ✅       |
| 2    | [x] 38-02-PLAN.md | ServicesLayer: command bar + 5-domain sub-launcher grid ✅    |
| 2    | [x] 38-03-PLAN.md | MessagesLayer: command bar + 3-domain sub-launcher grid ✅    |
| 3    | [x] 38-04-PLAN.md | Routing switch + domain constants in spaces.ts + i18n keys ✅ |

---

## Phase 39: Competition Entries

**Goal:** Complete the competition system with user entry management, three winner selection mechanics (raffle, photo contest, score-based), public cards-based listing/detail pages with winners gallery, and winner notifications via the existing Notification system.

**Status:** Complete (2026-05-31)

**Requirements:** COMP-ENTRY-01, COMP-ENTRY-02, COMP-ENTRY-03, COMP-ENTRY-04, COMP-ENTRY-05, COMP-ENTRY-06

**Plans:**

| Wave | Plan              | Objective                                                                       |
| ---- | ----------------- | ------------------------------------------------------------------------------- |
| 1    | [x] 39-01-PLAN.md | Database: CompetitionType + EntryStatus enums, CompetitionEntry model, DTOs     |
| 2    | [x] 39-02-PLAN.md | API: tRPC competition router — join, submit, participants, winners, draw        |
| 3    | [x] 39-03-PLAN.md | Public UI: cards grid listing at /competition, detail page at /competition/[id] |
| 3    | [x] 39-04-PLAN.md | Admin UI: expandable rows, per-type actions, competition type selector          |

---

## Phase 40: Maintenance Ticketing

**Goal:** Transform maintenance requests into a proper ticketing system — admin-configurable categories, in-house maintenance teams and third-party service providers with assignment/reassignment, 7-status workflow, ticket numbering, progress timeline, user tracking with activity zone integration, and seed data.

**Status:** Complete (4/4 plans, 2026-05-31 → 2026-06-01)

**Requirements:** MAINT-TICKET-01, MAINT-TICKET-02, MAINT-TICKET-03, MAINT-TICKET-04, MAINT-TICKET-05, MAINT-TICKET-06, MAINT-TICKET-07, MAINT-TICKET-08, MAINT-TICKET-09, MAINT-TICKET-10, MAINT-TICKET-11, MAINT-TICKET-12

**Plans:**

| Wave | Plan              | Objective                                                                                                                         |
| ---- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1    | [x] 40-01-PLAN.md | Schema: 7-status enum, MaintenanceTeam/ServiceProvider/MaintenanceCategory models, migrate orphan tables to Prisma ✅             |
| 2    | [x] 40-02-PLAN.md | API: CRUD for teams/providers/categories, assignment endpoint, ticket number generation, fix activity zone/notes/priority bugs ✅ |
| 2    | [x] 40-03-PLAN.md | Admin UI: inline category management, assignment panel, handoff flow, progress timeline, workflow status controls ✅              |
| 2    | [x] 40-04-PLAN.md | User tracking: enhanced /maintenance page, HomeLayer activity zone integration, 7 seed requests ✅                                |

---

## M4 — Production-Ready

_API governance, feature gate consolidation, i18n hydration fix. Verifiable: OpenAPI spec generated and committed; `canAccess()` is the canonical gate; no console hydration errors on tenant routes. Status: 3/3 done (M4 complete)._

---

## Phase 35: Api Alignment

**Goal:** Audit current API infrastructure against adopted governance standards (API.md, tRPC.md, API_ARCHITECTURE.md) and implement phased remediation across response envelopes, tRPC adoption, route structure, DTO layer, observability, rate limiting, module ownership, and compliance sweep

**Status:** Complete (10/10 plans complete)

**Requirements:** API-AUDIT-01, API-AUDIT-02, API-RESP-01, API-TRPC-01, API-TRPC-02, API-ROUTE-01, API-DTO-01, API-OBS-01, API-OBS-02, API-RATE-01, API-MOD-01, API-TEST-01, API-CI-01, API-SWEEP-01

**Plans:** 10 plans

| Wave | Plans                                                                       |
| ---- | --------------------------------------------------------------------------- |
| 1    | A-01 (Response envelope + error codes)                                      |
| 2    | B-01 (trpc-openapi), B-02 (Identity tRPC migration)                         |
| 2    | C-01 (Canonical route structure), C-02 (DTO layer)                          |
| 3    | D-01 (Observability + audit logging), D-02 (Rate limiting + feature gating) |
| 3    | E-01 (Module ownership rollout)                                             |
| 4    | F-01 (API tests + CI validation), F-02 (Compliance sweep)                   |

Plans:

- [x] 35-AUDIT.md — Full audit (20 gaps G1-G20) ✅
- [x] 35-A01-PLAN.md — Response envelope standards + error code framework (Wave 1) ✅
- [x] 35-B01-PLAN.md — trpc-openapi integration + OpenAPI generator (Wave 2) ✅
- [x] 35-B02-PLAN.md — Identity REST routes → tRPC migration (Wave 2) ✅
- [x] 35-C01-PLAN.md — Canonical route structure (Wave 2) ✅
- [x] 35-C02-PLAN.md — DTO layer (Wave 2) ✅
- [x] 35-D01-PLAN.md — Observability + audit logging (Wave 3) ✅
- [x] 35-D02-PLAN.md — Rate limiting + feature gating (Wave 3) ✅
- [x] 35-E01-PLAN.md — Module ownership model rollout (Wave 3) ✅
- [x] 35-F01-PLAN.md — API test suites + OpenAPI CI validation (Wave 4) ✅
- [x] 35-F02-PLAN.md — Compliance sweep: schema ownership, role checks, error codes (Wave 4) ✅

---

## Phase 41: Feature Gate Consolidation

**Goal:** Consolidate the three overlapping feature gating systems (TierGuard/FeatureRegistry, Module Gate, PlatformPageFlags) into a single `canAccess()` entry point with explicit 5-layer precedence. Adds server `canAccess()`, client `canAccessClient()` (skips tier/module — server is source of truth) + `useGateContext()` + `GateGuard` component, CI test for mapping completeness, `revalidateGate()` cache invalidation helper, and removal of all 8 legacy tier string occurrences. **Phase 1 is purely additive — no existing callsites change.**

**Status:** Planning Complete — 3 plans in 1 wave (narrow scope, post-advisory audit)

**Requirements:** GATE-01, GATE-02, GATE-03, GATE-04, GATE-05, GATE-06, GATE-07, GATE-08, GATE-09, GATE-10, GATE-11

| Requirement | Plan  | Description                                                |
| ----------- | ----- | ---------------------------------------------------------- |
| GATE-01     | 41-01 | `canAccess()` server function with 5-layer precedence      |
| GATE-02     | 41-01 | `FeatureKey` canonical type (14 keys)                      |
| GATE-03     | 41-01 | 3 mapping tables (FEATURE_TO_MODULE/FLAG/REGISTRY)         |
| GATE-04     | 41-02 | `canAccessClient()` client function (skips tier/module)    |
| GATE-05     | 41-02 | `useGateContext()` hook (reads real session)               |
| GATE-06     | 41-02 | `GateGuard` component (children/fallback/render)           |
| GATE-07     | 41-03 | CI test for mapping completeness (drift detection)         |
| GATE-08     | 41-03 | `revalidateGate(tenantId)` cache invalidation helper       |
| GATE-09     | 41-01 | Remove 7 legacy tier string occurrences (5 files)          |
| GATE-10     | 41-01 | `resolveGateContext()` reads role from real session (Q2=A) |
| GATE-11     | 41-01 | `getTierLevel()` soft-fallback to `foundation` (Q3=B)      |

**Scope decisions:**

- **Q1=A: Phase 1 is foundation only** — additive, no callsite migration. 9 gate-related symbols run in parallel temporarily; Phase 2/3 migrates to consolidate.
- **Q2=A: Real session integration** — `resolveGateContext()` and `useGateContext()` read role from `getSessionAndRole()` / `useSession()` (no hardcoded `'RESIDENT'`).
- **Q3=B: `getTierLevel()` soft-fallback** — unknown inputs return `'foundation'` (back-compat with non-legacy unknowns; advisory's "throw on unknown" deferred).
- **Q4=A: GATE-09/10/11 added** to address requirement ID gap (8 → 11 requirements).
- **Advisory at .planning/ADVISORY.md is STALE** — verified 2026-06-01. References `getTenantTier`/`getModuleDefinition`/`getTenantModule` helpers that don't exist; `unstable_cache`+`revalidateTag` pattern not used; `/api/flags` doesn't return `tier`; pseudocode has dead-code bug. Only "no legacy tier strings" signal is authoritative.
- **Client skips Tier and Module layers** — server is source of truth; client `useGateContext()` provides `{ role, flags, tier? }` (tier optional; `tier?: TierLevel` in `ClientGateContext`).
- **Remove all 7 legacy tier string occurrences** — `tiers.ts:261-275` (3 cases), `tenants.ts:17` (Drizzle default), `prisma/schema.prisma:72` (Prisma default), `TenantFeaturePage.tsx:111-113` (3 `<option>` lines), `base.ts:6` (comment).
- **Slug file `src/shared/api/slug.ts:67` `'forest'` is a nature-word list** — NOT a tier reference; do not touch.

**Trajectory:** Phase 1 ships a foundation, not consolidation. Phase 2 migrates callsites opportunistically. Phase 3 restricts legacy exports and marks `UBIQUITOUS_LANGUAGE.md` C2 as Resolved. See "Trajectory" and "Phase 2/3 Deferrals" sections in `41-CONTEXT.md` for what each phase owns.

**Plans:**

| Wave | Plan              | Objective                                                                                                                                  |
| ---- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | [ ] 41-01-PLAN.md | Server `canAccess()` + 3 mapping tables (FEATURE_TO_MODULE/FLAG/REGISTRY) + GATE_REASON_TO_ERROR + 8 legacy tier string removals           |
| 1    | [ ] 41-02-PLAN.md | Client `canAccessClient()` (skips tier/module) + `useGateContext()` hook + `GateGuard` component (3 render patterns)                       |
| 1    | [ ] 41-03-PLAN.md | CI test for mapping completeness (Vitest) + `revalidateGate(tenantId)` using `revalidatePath()` (matches existing revalidation.ts pattern) |

**References:** `docs/GATE_DISCUSSION.md`, `docs/GATE_ADDENDUM.md`, `docs/GATE_PLAN.md`

**Out of scope (Phase 2-3 migration):** Migrating existing callsites from `isModuleEnabled`/`TierGuard`/`usePageFlags` → `canAccess()` (Phase 2 opportunistic); removing legacy public exports (Phase 3 cleanup); unifying the two tier systems (separate workstream, tracked by UBIQUITOUS_LANGUAGE.md C4).

---

## Phase 42: I18n Hydration Fix

**Goal:** Execute systemic i18n hydration fix across tenant routes — add I18nextProvider to tenant layout, create shared `useSafeTranslation` hook with `tx(key, fallback)`, migrate high-risk pages (messages, admin domains) and medium-risk shared UI (Bookshelf, TagCloud, LocaleSelector, CreateListingForm, UnifiedResidentCard), consolidate services domain page's local tx() helper into shared hook.

**Status:** Complete — 3/3 plans shipped (M4 Production-Ready now 3/3 done)

**Requirements:** I18N-01, I18N-02, I18N-03, I18N-04, I18N-05, I18N-06, I18N-07, I18N-08 (all 8 complete)

**Plans:**

| Wave | Plan              | Objective                                                                          | Tasks |
| ---- | ----------------- | ---------------------------------------------------------------------------------- | ----- |
| 1    | [x] 42-01-PLAN.md | I18nextProvider in tenant layout + useSafeTranslation hook + usePageLoading update | 3     |
| 2    | [x] 42-02-PLAN.md | Migrate high-risk pages: messages domain + admin domain                            | 2     |
| 2    | [x] 42-03-PLAN.md | Migrate medium-risk shared UI (5 components) + services page (remove local tx())   | 3     |

**Out of scope (bd issue):** 37 widget files batch migration (lower risk, rendered inside guarded pages via usePageLoading)

---

## M4.5 — Stabilization (Blocked on Triage)

_Buffer between M4 (code-complete) and M5 (production-traffic). No new phases. Pure verification, soak, and sign-off. See `.planning/MILESTONES.md` Section 2 (M4.5) for full criteria._

**Status (2026-06-06):** **Phase 43 (M4.5 Blockers) 4/5 SHIPPED.** Soak activation is CONDITIONAL — pending BD mls9+n0rh (tc4 end-to-end seed) and human-verify of validation-better-auth@1.3.4 (43-05 ltn).

**Activates when:** M4 is complete (Phases 35, 41, 42 all ✅) AND Phase 43 fully ships (4/5 done; 43-05 deferred for human-verify). Phase 43 is the precondition for M4.5.

**Verifiable (all must pass to declare M4.5 done):**

- **7-day production soak** with zero P0/P1 incidents (P2/P3 acceptable, tracked).
- **OpenAPI spec published** to a staging URL or package; at least one external test client (or internal smoke test) consumes it successfully.
- **Performance baseline captured:** p50/p95/p99 latency for chat send, dashboard load, maintenance ticket create. Documented in `.planning/perf-baseline-M4.5.md`.
- **All 4 locales (en, af, xh, zu) render** without console errors on every tenant route.
- **`canAccess()` migration timeline documented** — if Phase 41's legacy export removal isn't done, write a dated plan; if done, write the migration log.
- **Rollback procedure tested** — verified that we can revert to M3 in <5 minutes (DB migration, env flags, traffic shift).

**Duration:** ~1 week. The 7-day soak is the longest single item; the others can run in parallel during the soak.

**Failure mode:** If any verifiable criterion fails, M4.5 is "blocked on \<criterion\>". M5 does not start until M4.5 is green. No exceptions.

**What's NOT in M4.5:** New features, new phases, code changes beyond what M4 requires.

---

## Phase 43: M4.5 Blockers

**Goal:** Resolve the 5 BD issues that would surface as P0/P1 incidents during the 7-day soak. Each must be closed (or have a documented deferral) before soak begins.

**Status:** 4/5 plans shipped — COMPLETE with 1 deferral (43-05)

**BD sources (5):** `cs5` (MyHomeSpace), `tc4` (prisma/seed), `e0w` (80-route audit), `oqw` (RLS), `ltn` (request validation)

**Why this phase exists:** M4.5 stabilization requires 7 days of zero P0/P1 incidents. Without resolving these 5 issues, the soak would surface them as production incidents. Better to fix in a focused phase than during the soak itself.

**Acceptance:** All 5 BD issues closed with a fix commit; `pnpm db:seed` works; MyHomeSpace correctly links user to property; all audited routes have withTenant() OR documented RLS escape; `runWithRLS()` wraps sensitive routes; request validation plugin wired to /api/auth/\*.

**Plans:** 4/5 plans executed (43-05 deferred — requires human verification of validation-better-auth@1.3.4 package)

**VERIFICATION.md verdict:** 4/5 PASS, 1 DEFERRED. M4.5 soak CONDITIONAL pending BD mls9+n0rh (tc4) and 43-05 ltn.

Plans:

- [x] 43-01-PLAN.md — Wave 1 — tc4: Prisma seed shim (replaced prisma/seed.ts with 18-line side-effect shim; rebased to import new multi-tenant orchestrator for side effects). Soak AC blocked on BD mls9 + n0rh.
- [x] 43-02-PLAN.md — Wave 1 — cs5: MyHomeSpace standardSeats fallback (added to /api/users/[id]/route.ts:180-199; verified all 3 user states on live Soralia tenant)
- [x] 43-03-PLAN.md — Wave 2 — e0w: 157-route tenant-isolation audit (script at scripts/audit-tenant-isolation.ts, 109 lines; report at docs/SECURITY_AUDIT_M4.5.md; PASS 136, FAIL 0, WHITELISTED 8, N/A 13)
- [x] 43-04-PLAN.md — Wave 3 — oqw: 5 admin routes wrapped in runWithRLS() (activity, board-members, maintenance-stats, urgency, settings/page-flags; tx-aware sibling helpers at platform-flags.ts:167, 246)
- [ ] 43-05-PLAN.md — Wave 3 — ltn: Install + wire validation-better-auth (4 Zod schemas for critical auth endpoints) — **DEFERRED** pending `autonomous: false` checkpoint:human-verify on validation-better-auth@1.3.4

**Out of scope:** M5a/M5b work (different phases). 7cp + jc1 (now part of M5b dWallet, phase 47).

---

## M5 — Anchor Tenant Launch (Planning)

_Close the architecture-audit issues, ship the launch-blocking features: Community Merits, OTP password reset, MyHomeSpace bug, 37-widget i18n batch, **and dWallet (the headline data-rights + revenue-share selling point)**. Ready for Soralia Village (180 homes) production traffic. Decomposed into M5a (audit closure) and M5b (anchor tenant features)._

**Source backlog:** BD issues from `docs/cleaner_react_architecture.md` audit (5 issues) + Soralia launch features (5 issues). See Phase 44 and 45 for breakdown.

**Activates when:** M4.5 is green.

---

## Phase 44: M5a Audit Closure

**Goal:** Close the 5 architecture-audit gaps identified in `docs/cleaner_react_architecture.md` AND resolve 4 of the 7 open conflict register entries from `docs/UBIQUITOUS_LANGUAGE.md` (C1, C2, C5, C6) so the codebase is ready for Soralia Village's 180-home production launch.

**Status:** Planning (expanded 2026-06-04 to include conflict closure work)

**BD sources (5 audit + 4 conflicts = 9 total):**

**Audit closure (5):** `fpc` (tRPC coverage), `qig` (shared HTTP client), `1ei` (useQuery migration), `9xr` (pure helpers), `5u2` (maintenance dedup)

**Conflict register closure (4):** `2z4` (C1 Property shape), `1eh` (C2 gating migration Phase 2+3), `brp` (C5 residencyType alignment), `huo` (C6 occupantType → householdRole)

**Conflicts deferred:**

- **C3 (Tab→Space):** RESOLVED (2026-06-04 audit; 0 hits for `tabId`/`DashboardTab`). Phase 31 closed it.
- **C4 (Tier Naming):** DEFERRED to Phase 47 (dWallet). 3 vs 4 tier mismatch only matters when dWallet ships tier-gated features.

**Acceptance:** All 9 BD issues closed with a fix commit; `docs/cleaner_react_architecture.md` Chapters 6-9 marked as "Closed"; `docs/UBIQUITOUS_LANGUAGE.md` C1, C2, C5, C6 marked as "Closed"; zero `useEffect+fetch` patterns in `src/widgets/`; `src/shared/api/http-client.ts` is the single import point for fetch in widgets; all maintenance API routes use a single transform function; 5 Property shapes consolidated per C1 resolution plan; 4+ `usePageFlags` callsites migrated to `useGateContext()`; legacy exports restricted to `@internal`; `Profile.occupantType` renamed to `householdRole`; `Profile.residencyType` and `Invitation.residentType` aligned on a single enum.

**Plans:** TBD. Run `/gsd-plan-phase 44-m5a-audit-closure` when ready to plan execution. Suggested plan structure:

- **Plan A (foundation):** `qig` + `9xr` + `2z4`
- **Plan B (gating migration):** `fpc` + `1eh` (usePageFlags → useGateContext + restrict legacy exports)
- **Plan C (cleanup):** `1ei` + `5u2` + `brp` + `huo`

**Out of scope:** M4.5 fixes (phase 43), M5b launch features (phase 45, 47), M5+ post-launch (phase 46), C3 (already resolved). C4 (Tier Naming) re-elevated — see phase 47.

---

## Phase 45: M5b Anchor Tenant Launch

**Goal:** Ship the 5 launch-blocking features for Soralia Village's 180-home rollout. Each is a feature, not a fix — the system functions without it, but the anchor tenant experience is incomplete.

**Status:** Planning

**BD sources (5):** `2at` (Community Merits), `l23` (i18n epic), `0f7` (Tiptap i18n), `0tb` (OTP reset), `cs5` (MyHomeSpace — also M4.5 blocker)

**Acceptance:** All 5 BD issues closed with a feature commit; Community Merits live in production 1+ week; all widget/page content available in 4 locales; Tiptap editors can save/load in any locale; OTP password reset works end-to-end; MyHomeSpace correctly links user to property.

**Dependencies:** l23 blocks 0f7 (Tiptap localization needs i18n router extension to tenant routes — same blocker as deferred Phase 04). cs5 ideally resolved in phase 43 to avoid duplicating fix work.

**Plans:** TBD. Run `/gsd-plan-phase 45-m5b-anchor-tenant` when ready to plan execution.

---

## M5+ — Post-Launch Features (Deferred)

_Features explicitly deferred to post-M5b. These are real product ideas but not prerequisites for the Soralia anchor tenant launch. Includes 10 issues from the BD backlog triage. See Phase 46 for breakdown. **dWallet is NOT here — it was elevated into M5b on 2026-06-06 as the headline anchor-tenant selling point (see phase 47).**_

---

## Phase 46: Bucket C Future Features

**Goal:** Defer and document 10 post-launch features (originally mislabeled as "Phase 4/5") so they remain visible in the backlog but don't block M4.5 → M5b.

**Status:** Planning (deferral + documentation)

**BD sources (10):** 8 features (notifications, payments, booking calendar, provider analytics, provider dashboard, third-party registration, mobile optimization, billing) + 2 orphan FSD migration state-change events

**Acceptance:** All 10 BD issues re-titled (done in triage); all tagged with `m5-plus,post-launch,phase-46`; issues remain open; future: scope each into a sub-phase.

**Plans:** None. This is a deferral + documentation phase.

**Out of scope:** M4.5/M5a/M5b work (different phases). dWallet is in M5b (phase 47), not here.

---

## Phase 47: dWallet Planning & Build

**Goal:** Implement the dWallet module — per-resident data rights, granular consent, and revenue-share rewards — as defined in `docs/architecture/DWALLET_SPEC.md` (Schedule G of the Soralia Village v10 SaaS agreement). **The headline anchor-tenant selling point:** "You own your data, you grant consent per use, you earn revenue share." Without dWallet, the Soralia pitch collapses to a generic community portal.

**Status:** Planning (elevated from M6+ to M5b on 2026-06-06 — see `.planning/phases/47-dwallet-planning-build/47-CONTEXT.md` for the full sub-phase breakdown)

**BD sources (3):**

- `7cp` — Complete formal POPIA compliance audit for South Africa tenant (dWallet elevates this from "should do" to launch-readiness)
- `jc1` — Implement cookie management for privacy compliance (re-scoped — no longer a NetBones integration blocker; dWallet is the privacy module)
- Schedule F Table 2 revenue share percentages — to be created (placeholder values 30/40/20/35% in spec, must be confirmed before production seeding)

**Sub-phases (per spec's Implementation Order):**

| Sub | Objective                                                                                                  | Plan target |
| --- | ---------------------------------------------------------------------------------------------------------- | ----------- |
| A   | Schema & migration — 6 new Prisma models + 4 enums + `PlatformModule` seed + `DataRevenueStream` seed      | TBD         |
| B   | API layer — 10 resident + 7 admin routes, Zod, Drizzle transactions, Vitest coverage                       | TBD         |
| C   | Entity FSD structure — `src/entities/dwallet/` (schema, types, hooks, helpers)                             | TBD         |
| D   | Widgets — `dwallet-summary` (resident) + `admin-dwallet` (admin), registered in `widgets.ts`               | TBD         |
| E   | Feature gate integration — `dWallet` PlatformModule + 6 FeatureRegistry keys + `canAccess()` on all routes | TBD         |
| F   | Full page + navigation — `/dashboard/wallet`, header dropdown, mobile burger, admin sidebar                | TBD         |

**Hard constraints (per spec, non-negotiable):** immutable `WalletTransaction`; append-only `DataConsent`; `balanceAfter = balanceBefore + amount` invariant; atomic batch ops via Drizzle `.transaction()`; no admin PII access (aggregate counts only); Pino audit on every consent change; `tenantId` on every model.

**Acceptance:** 6 sub-phase PLAN.md files created and executed; 6 new Prisma models migrated; all 17 API routes auth-guarded with `canAccess('page.dWallet')`; both widgets registered and visually verified (admin widget never shows individual balances); full `/dashboard/wallet` page exists; UBIQUITOUS_LANGUAGE.md updated with 7 new terms; integration-verification grep commands pass (no `prisma.` in routes, `tenantId` on every query, `apiSuccess`/`apiError` envelope in every route); POPIA audit complete (7cp); M5 launch checklist can flip to green once Schedule F Table 2 is confirmed.

**Plans:** TBD. Run `/gsd-plan-phase 47-dwallet-planning-build` when ready. Suggested wave structure: Wave 1 = A + C (parallel), Wave 2 = B + E (parallel), Wave 3 = D, Wave 4 = F.

**Out of scope (deferred to phase 2):** actual EFT / PayFast disbursement integration; Community Benefit Fund as separate ledger model (counter in `Tenant.featureFlags` for now); push notifications on reward receipt; multi-currency (ZAR only).

**Out of scope (other phases):** M4.5 fixes (phase 43), M5a audit closure (phase 44), M5b other launch features (phase 45), M5+ post-launch (phase 46).

---

## Phase 48: Admin Chrome Parity

**Goal:** Extend SpaceLauncher (desktop sidebar) and MobileSpaceBar (bottom bar) — currently only mounted under `/dashboard/*` via `(tenant)/dashboard/layout.tsx` — to all admin routes under `/admin/*`, so ADMIN users retain space-level navigation when traversing admin sub-pages (requests, surveys, events, content, households, groups, categories, resources, competitions, announcements, users, external-surveys). Research the cleanest mount approach (shared layout component, route group restructure, or middleware-driven chrome) before planning.

**Status:** Complete (verified 2026-06-05; visual gate passed on 15 routes)

**Requirements:** ADMIN-CHROME-01 (SpaceLauncher visible on all `/admin/*` routes for ADMIN users), ADMIN-CHROME-02 (MobileSpaceBar visible on mobile breakpoint for `/admin/*`), ADMIN-CHROME-03 (active-space derivation works from `/admin/*` pathnames — admin space stays highlighted), ADMIN-CHROME-04 (no duplicate chrome when nested admin pages already render layer components like AdminLayer), ADMIN-CHROME-05 (no breakage of existing `/dashboard/*` chrome) — **all 5 complete**

**Plans:** 3 plans in 2 waves, all shipped.

| Wave | Plan          | Objective                                                                                                                                                                                                                                                                  |
| ---- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | 48-01-PLAN.md | Foundation: add `href` to `SpaceDefinition` + centralize `getActiveSpaceId` (with /admin prefix branch) + create shared `SpaceChrome` client component + update `SpaceLauncher` and `MobileSpaceBar` to consume `space.href`                                               |
| 2    | 48-02-PLAN.md | Refactor `(tenant)/dashboard/layout.tsx` to consume `SpaceChrome` (67 → ≤12 lines) — validates Wave 1 foundation is behavior-equivalent                                                                                                                                    |
| 2    | 48-03-PLAN.md | Create `(tenant)/admin/layout.tsx` consuming `SpaceChrome` + blocking-human visual verification on /admin, /admin/users, /admin/requests, /admin/surveys/[id]/edit (collapsed-sidebar collision check), /admin/surveys/[id]/preview + final `pnpm typecheck && pnpm build` |

**Approach:** Approach 1 from 48-RESEARCH.md (shared layout component) — extract `SpaceChrome` client component, create `admin/layout.tsx`, refactor `dashboard/layout.tsx` to consume the same component. Zero file moves, zero URL changes, zero impact on any of the 27 existing admin sub-pages.

**Dependency:** Wave 2 (48-02 + 48-03) depends on Wave 1 (48-01). Within Wave 2, 48-02 and 48-03 touch different files and can run in parallel.

**Depends on:** Phase 30 (Focus Spaces — SpaceLauncher), Phase 34 (AdminLayer), Phase 37 (Admin Route Consolidation — moved AdminLayer to `/admin`).

**Out of scope:** Restructuring AdminLayer internals; changing the space model in `widgets/dashboard/model/spaces.ts`; platform admin routes (`(platform)/admin/platform/*` — separate route group, different chrome contract).

---

## M6+ — Post-Launch / Deferred

_Items explicitly deferred to post-launch. These have PLAN.md but no SUMMARY.md and depend on real-world preconditions (production deployment, second tenant, or upstream phases). See MILESTONES.md Section 2 (M6+) for context. Note: `11-prisma-to-drizzle` was previously listed here but was verified complete (incremental delivery) on 2026-06-03 and removed — see M0 historical note._

---

## Phase 03: Second Tenant

**Goal:** Validate the multi-tenant onboarding + adoption system with a real second tenant — exercise tenant resolution, RLS, and isolation under live production conditions

**Status:** Planning Complete (deferred — post-deployment validation test)

**Blocker (2026-06-03):** Requires production deployment + a willing second tenant to onboard. Cannot run against a synthetic tenant — the test is specifically about validating the onboarding flow under real adoption conditions. Tracked under M6+ for post-launch execution.

**Requirements:** TENANT-VALIDATE-01, TENANT-VALIDATE-02, TENANT-VALIDATE-03

**Plans:**

- [ ] 03-01-PLAN.md — Second tenant onboarding + RLS + isolation test (deferred to M6+ post-deployment)

---

## Phase 04: Content I18n

**Goal:** Localize content authored via TipTap editor — store translations per locale, render in user's active language

**Status:** Planning Complete (deferred — blocked on i18n router extension)

**Blocker (2026-06-03):** The i18n router currently exists at `src/app/[lng]/` for **platform routes only** (3 files: layout, platform/layout, platform/home/page). Tenant routes (the bulk of the app — `(dashboard)`, `(tenant)`, services, maintenance, messages, etc.) do NOT route through the dynamic locale segment; they rely on client-side i18next. Phase 04 (TipTap content localization per locale) requires the i18n router to be extended to tenant routes first. This is upstream work — likely a new phase (43+) that introduces `/[lng]/(tenant)/...` routing, after which Phase 04 can execute. Related work is tracked in BD epic `l23` and task `0f7`.

**Requirements:** CONTENT-I18N-01, CONTENT-I18N-02, CONTENT-I18N-03

**Plans:**

- [ ] 04-01-PLAN.md — Content i18n with TipTap editor (deferred — see BD issue `l23`; needs `/[lng]/` router extended to tenant routes first)

---

## Housekeeping Phases

_Out-of-band maintenance phases that don't fit the milestone structure. Moved out of M6+ on 2026-06-03 (Section 7 Gap C3)._

---

## Phase 99: Build Fix

**Goal:** Fix build errors caused by the multi-tenant refactor — broken import paths in 6 API routes, centralize imports via `@/lib/db`, inline Drizzle table definitions for non-generated tables

**Status:** Complete (housekeeping; out-of-band maintenance phase)

**Requirements:** BUILD-01

**Plans:**

- [x] 99-01-PLAN.md — Import path fixes for 6 API routes (bookings, maintenance/[id|notify|notes|history], admin/board-members) ✅
