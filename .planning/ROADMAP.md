# Project Roadmap

## Project: NetComplex Multi-Tenant Platform

Transform Soralia Village from single-tenant to white-label SaaS platform.

---

## Milestone Map

Phases are grouped into milestones (M0–M6+). See `.planning/MILESTONES.md` for full structure, gap analysis, and cadence ritual.

| Milestone                         | Goal                                                   | Phases                                 | Status      |
| --------------------------------- | ------------------------------------------------------ | -------------------------------------- | ----------- |
| **M0 Foundation**                 | Multi-tenant substrate + base modules                  | 00, 01, 02, 03, 05, 06, 07, 08, 11     | ✅ Shipped  |
| **M1 Core Comm & Auth**           | Real-time chat, email, schema hardening, onboarding    | 09, 10, 19, 20                         | ✅ Shipped  |
| **M2 Dashboard & Navigation**     | Focus Spaces, single-source nav, widget system         | 18, 22, 24, 25, 26, 27, 28, 29, 30, 31 | ✅ Shipped  |
| **M3 Trust, Safety & Engagement** | Admin command surface, suspension, surveys, ticketing  | 21, 23, 32, 33, 34, 36, 37, 38, 39, 40 | ✅ Shipped  |
| **M4 Production-Ready**           | API governance, gate consolidation, i18n hydration     | 35, 41, 42                             | 🟡 1/3 done |
| **M5 Anchor Tenant Launch**       | Audit closure, Community Merits, OTP, MyHomeSpace      | (new, sources from BD backlog)         | 📋 Planning |
| **M6+ Post-Launch**               | Second tenant, multi-instance, plugins, event sourcing | 99 (housekeeping) + future             | Deferred    |

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

_API governance, feature gate consolidation, i18n hydration fix. Verifiable: OpenAPI spec generated and committed; `canAccess()` is the canonical gate; no console hydration errors on tenant routes. Status: 1/3 done._

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

**Status:** Planning Complete — 3 plans in 2 waves

**Requirements:** I18N-01, I18N-02, I18N-03, I18N-04, I18N-05, I18N-06, I18N-07, I18N-08

**Plans:**

| Wave | Plan              | Objective                                                                          | Tasks |
| ---- | ----------------- | ---------------------------------------------------------------------------------- | ----- |
| 1    | [ ] 42-01-PLAN.md | I18nextProvider in tenant layout + useSafeTranslation hook + usePageLoading update | 3     |
| 2    | [ ] 42-02-PLAN.md | Migrate high-risk pages: messages domain + admin domain                            | 2     |
| 2    | [ ] 42-03-PLAN.md | Migrate medium-risk shared UI (5 components) + services page (remove local tx())   | 3     |

**Out of scope (bd issue):** 37 widget files batch migration (lower risk, rendered inside guarded pages via usePageLoading)

---

## M5 — Anchor Tenant Launch (Planning)

_Close the 5 architecture-audit issues, ship Community Merits, OTP password reset, MyHomeSpace bug, and the 37-widget i18n batch. Ready for Soralia Village (180 homes) production traffic. Source backlog: BD issues `qig`, `fpc`, `9xr`, `5u2`, `1ei`, `2at`, `l23`, `0f7`, `cs5`, `0tb`. Verifiable: all 5 audit issues closed with tests, audit document `docs/cleaner_react_architecture.md` marked "all chapters resolved", Soralia admin can invite 180 homes via batch import, M5 launch checklist (TBD) green._

**No phase entries yet.** Phase numbers will be assigned (43+) when planning begins. See `.planning/MILESTONES.md` Section 2 (M5) for the source backlog.

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
