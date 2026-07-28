# STEERING Items

PRD.md (29 items) — Multi-Tenant Features

ALREADY IMPLEMENTED (11 items)
Item Evidence
Tenant model and CRUD prisma/schema/tenant.prisma — full Tenant model with branding, tier, modules, featureFlags, owner. createTenant tRPC procedure in src/server/routers/core/platform.ts
Middleware tenant extraction src/middleware.ts — resolves host → plane (platform/tenant/localhost) → tenant slug → x-tenant-slug header. Covers subdomain, custom domain, localhost fallback
Tenant context in API routes src/entities/tenant/api/with-tenant.ts — withTenant() returns {tenantId, tenantSlug} with session cross-check
Tenant-specific auth sessions sessions.tenantId field in Prisma; middleware forwards x-tenant-slug to auth routes
Basic tenant configuration Setting model per tenant; modules JSON field on Tenant; featureFlags JSON on Tenant
Module registry definition PlatformModule + TenantModule Prisma models; FEATURE*REGISTRY in src/entities/tenant/api/features/registry.ts (612 lines, 60+ features)
Feature flag integration DB-backed TenantFeatureFlag model; src/entities/tenant/api/flags/ with platform flags, statsig flags, services config
Tier-based gating enum Tier { STANDARD, PREMIUM, ENTERPRISE }; src/entities/tenant/api/gate/feature-gate.ts — assertModuleEnabled()
tenantId on existing tables Every significant model has tenantId with @relation("Tenant") — 100+ references across schema
API routes updated for tenant context Middleware sets x-plane/x-tenant-slug headers; /api/v1/public/*/tenant/_/platform/_/system/\_ classification in middleware
Database queries filtered by tenant All Drizzle queries include where(eq(table.tenantId, tenantId))

# STILL CURRENT (6 items)

# Item Priority Notes

1 Tenant provisioning UI P1 NewTenantForm.tsx exists in src/features/admin/ui/ but it's basic — no guided setup wizard, no tier selection UX, no initial module bundle configuration
2 Platform admin dashboard (tenant management) P1 No dedicated page for platform admins to list/manage/configure tenants. src/server/routers/core/platform.ts has the backend but no admin UI surface
3 Billing interface P2 BillingPlan, TenantSubscription, TenantInvoice, TenantPayment models exist but no real payment provider integration beyond stubs/models
4 Platform analytics P3 Basic stats exist (src/server/routers/core/platform.ts) but no comprehensive cross-tenant analytics dashboard
5 Module configuration UI P2 PlatformModule/TenantModule models exist but there's no UI for tenant admins to browse/configure available modules
6 Migrate "Soralia" hardcoding P2 DEFAULT_TENANT_SLUG = 'soralia' is still hardcoded in middleware.ts. While functional, it assumes Soralia is the default — a newly provisioned tenant on a custom domain wouldn't need this, but local dev still hardcodes it

# SUPERSEDED (3 items)

| Item | What changed |
| ---- | ------------ |

|"Feature Flags: Vercel Flags" (PRD §2) Implementation uses DB-backed feature flags (PlatformModule + TenantFeatureFlag + tenant.modules JSON) instead of Vercel feature flags
Simple Tenant model (slug, name, tier, active, config) Actual Tenant model in tenant.prisma is far richer — 15+ branding fields, owner relation, 100+ back-links across 4 batch groups
|"Multi-tenant sessions with Better Auth" Better Auth uses tenant ID from middleware headers, not natively multi-tenant sessions. The middleware x-tenant-slug header pattern is the actual approach

API.md (11 items) — Governance Enforcement Checklist

# ALREADY IMPLEMENTED (7 items)

| Item | Evidence |
| ---- | -------- |

Tenant isolation verified withTenant() in src/entities/tenant/api/with-tenant.ts with session cross-check; middleware plane resolution
Validation added Zod schemas throughout; tRPC .input() validation; z.object() on all procedures
Authorization enforced 5-step auth middleware: session → tenant → role → suspension → feature flag. 6 procedure tiers: publicProcedure, protectedProcedure, tenantProcedure, privilegedProcedure, adminProcedure, agentProcedure
Response envelope compliant toEnvelope()/ApiEnvelope<T> in src/shared/api/envelope.ts used across all tRPC procedures
Error codes standardized TRPC_TO_CANONICAL mapping in envelope.ts; 10 canonical codes defined in ERROR_CODES
DTO mapping implemented 13 DTO files in src/shared/api/dto/ derived from Drizzle tables via drizzle-zod createSelectSchema()
Feature gating verified assertModuleEnabled() in feature-gate.ts; step 5 of auth middleware chain

PARTIALLY IMPLEMENTED (3 items)

# Item Status Priority

1 OpenAPI updated ~24 of ~235 procedures have .meta({ openapi }). Not all public-facing procedures are OpenAPI annotated P2
2 Tests added Unit tests exist for envelope, DTO, address service, etc., but no comprehensive API governance test suite covering every procedure's isolation/auth/validation P2
3 Logs added Pino logger exists; request logging is not standardized across all 44 tRPC routers P3

STILL CURRENT (1 item)

# Item Priority Notes

1 CI validation passes (npx redocly lint) P2 No CI step for OpenAPI validation exists. Phase 120 verified governance compliance manually but didn't add automated CI enforcement
Architecture Items

AGENT_MODEL.md (24 items)

ALREADY IMPLEMENTED (10 items)
|Item |Evidence|
|------|-------|
Database schema AgentProfile, PropertyListing, AgentAccess models in Prisma
Premium Seat portfolio API src/server/routers/core/seats.ts + src/server/routers/marketplace/premium.ts
Agent marketplace API src/server/routers/marketplace/agents.ts — 194 lines with listAgents, listManagedProperties, getActivity
PremiumPortfolioWidget src/widgets/dashboard/ui/PremiumPortfolioWidget.tsx — portfolio + agent + listings tabs
AgentWidget src/widgets/dashboard/ui/AgentWidget.tsx
Property listings API src/server/routers/marketplace/listings.ts — full CRUD
CreateListingForm Integrated into listings tab
Listing CRUD with status management Status: Draft, Published, Featured, Sold/Rented
Portfolio cards with "List for Sale" PropertiesWidget.tsx with quick actions
Admin agents management src/server/routers/admin/agents.ts — admin-only agent listing with sensitive fields

STILL CURRENT (9 items)

# Item Priority Notes

1 Agent verification workflow P1 isVerified + verificationDate fields exist on AgentProfile but no verification process UI, no document upload, no admin review workflow
2 Commission tracking system P2 commissionRate exists on AgentProfile but no tracking of earned commissions, no payout logic, no commission split calculations
3 Agent-investor messaging integration P2 General messaging exists but no agent-specific messaging workflow (proposals, offers, document sharing within agent context)
4 Agent rating and review system P1 rating/reviewCount on AgentProfile are fields (database-level) but there's no agent-specific review CRUD — the review system is for marketplace services (CommunityServiceReview), not agents
5 Agent onboarding flow P2 No registration flow specifically for agents (sign up → create profile → upload credentials → get verified)
6 Premium Seat upgrade prompts P2 No upgrade prompts in the UI when a user hits premium-gated features
7 Agent performance analytics P3 totalListings, activeListings, salesCompleted, avgSalePrice exist in schema but no analytics dashboard
8 Commission payment processing P3 Requires payment provider integration (UCP/AP2)
9 Agent blacklist/blocking P3 No block/blacklist functionality for agents

# PLANNED (5 items, deferred)

| Item | Priority |
| ---- | -------- |

Agent specialization matching P3
Property listing analytics P3
External real estate platform integration P3
Quality gates (pre-launch verification) P2
Success metrics (conversion, engagement, deals) P3
cleaner_react_architecture.md (40 items)

# ALREADY IMPLEMENTED (significant progress since June audit)

| Area | Progress |
| ---- | -------- |

Shared API client src/shared/api/http-client.ts — centralized request() with auth headers, envelope handling, error normalization
tRPC coverage 44 routers now (vs 2 at audit time) — covers identity, households, invitations, delegations, settings, platform, content, resources, media, services, events, groups, competitions, merits, achievements, notifications, chat, proxy-vote, maintenance, bookings, surveys, disputes, providers, comments, marketplace, dwallet, agents, education, admin, and sub-routers

DTO layer 13 DTO files in src/shared/api/dto/ with drizzle-zod derived schemas
Response envelope toEnvelope() across all tRPC procedures
Domain layer src/entities/tenant/model/roles.ts, TierGuard, GateGuard components
Business logic separation Feature hooks in src/features/\*/model/useXxx.ts pattern strong
Dependency injection tRPC createContext injects db, session, userId, role, tenantId into every procedure

STILL CURRENT (7 items)

# Item Priority Notes

1 ~30 raw fetch() call sites remain P1 Found in: useAdminStats(4), useAnnouncements(4), useMaintenanceForm(3), useSetupProgress(3), EventsWidget, NotificationsWidget, AdminDisputesWidget, AdminLayer, ServicesLayer, MessagesLayer, etc. Should migrate to tRPC
2 Missing service layers P2 chat, directory, user, admin, identity, widget, service entities lack services/ folders — business logic lives in route handlers or client hooks
3 Missing DTO re-exports P2 Several entities don't re-export DTOs through their barrel (admin, identity, widget, chat, directory, user, service)
4 useApiToast.ts (317 lines) P2 Still used as a paper layer over inline mutations. tRPC's mutation success/error handling could replace this
5 Maintenance route duplication P2 src/app/api/maintenance/route.ts vs src/entities/maintenance/api/route.ts — near-duplicate transform logic
6 Domain predicates in useIdentity.ts P3 isAgent, isPropertyOwner, isSoloSeatHolder are React hooks logic that should be pure functions
7 Permissions module thin P3 src/entities/maintenance/permissions/index.ts is a 1-line re-export; no real permission module

# SUPERSEDED

Item What changed
"Build a shared HTTP client, migrate 236 call sites" The team went a different direction — massive tRPC expansion (44 routers vs 2) rather than wrapping all REST calls. http-client.ts exists but REST routes are being incrementally replaced by tRPC, making the client less critical
"Move inline useEffect + fetch to useQuery/useMutation" Largely solved by tRPC which auto-generates these hooks. Remaining fetch sites are a shrinking tail

# DASHBOARD-PHASE-B-DISCUSSION.md (4 items)

ALREADY IMPLEMENTED (Phase B is largely shipped)
Item Evidence
Focus Space architecture Full implementation in place — HomeLayer.tsx, SpaceLauncher.tsx, SpaceLayout.tsx, MobileSpaceBar.tsx, AdminSubLauncher.tsx
Per-space routing src/app/(tenant)/dashboard/[space]/page.tsx with nested routes for providers, services, community, messages, admin
Space definitions src/widgets/dashboard/model/spaces.ts — 6-space model (home, providers, services, community, messages, admin) with core/optional classification
HomeLayer (3-zone) src/widgets/dashboard/ui/HomeLayer.tsx — Urgency/Today/Activity zones
Admin sub-launcher src/widgets/dashboard/ui/AdminSubLauncher.tsx — icon grid for admin domains
My Home space src/widgets/dashboard/ui/MyHomeSpace.tsx — property/household/profile consolidation
Mobile bottom bar src/widgets/dashboard/ui/MobileSpaceBar.tsx

STILL CURRENT (4 items)

# Item Priority Notes

1 Complete mobile overflow pattern P1 Current spaces.ts defines 6 spaces (home, providers, services, community, messages, admin) — exceeds the 5-slot mobile limit. MobileSpaceBar exists but the overflow/"More" pattern needs verification/testing
2 Module gating enforcement for space visibility P1 spaces.ts comments note "optional spaces auto-hide when all flags disabled" — needs verification that SpaceLauncher respects this at runtime
3 Announcement absorption into Community/Messages space P2 Phase 11 built standalone announcements admin — doc asks whether Phase B should absorb it. Currently still standalone (/dashboard/communication/announcements)
4 B6 Mobile complete P2 Bottom nav bar, collapsed state, testing all spaces on mobile viewport — needs verification of completeness

DECISIONS MADE (supersedes the open questions)
Doc Question Decision (per spaces.ts comments)
Q1: Mobile slot Services NOT merged into Community. 6 spaces with overflow ("More")
Q2: Module gating Hybrid: core spaces always visible, optional spaces auto-hide when all their feature flags disabled
Q5: Transition Feature flag approach (Phase B alongside tabs)

MOBILE_MONOREPO.md (8 items) — App Store Readiness

# IMPLEMENTED (Prerequisite progress)

| Item | Status |
| ---- | ------ |

tRPC coverage for mobile 44 routers — far exceeds the "M0 gate" minimum of 7 Wave 1-2 domains. Mobile prerequisite is effectively met
Tenant isolation for mobile Built into middleware and with-tenant.ts — mobile would consume same API

# STILL CURRENT (0 items within the mobile app itself — because no mobile app exists)

The entire mobile app is NOT STARTED:

- No apps/ directory
- No apps/expo/ directory
- No turbo.json or pnpm-workspace.yaml with apps structure
- No monorepo scaffold (M0)
  All 8 pre-submission items are pending (blocked on mobile app existence)
  Item Priority
  Privacy policy URL P3 (blocked)
  Terms of service P3 (blocked)
  App icon 1024x1024 P3 (blocked)
  Screenshots (6.7" + tablet) P3 (blocked)
  Data collection disclosure P3 (blocked)
  Encryption compliance P3 (blocked)
  Age rating questionnaire P3 (blocked)
  Beta testing group P3 (blocked)

# SUPERSEDED

| Item                                                                        | Status                                                                                                                                                      |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Monorepo M0 must not start until tRPC covers mobile primary feature paths" | tRPC now covers 44 routers — the M0 gate has been met. The main blocker is not waiting for tRPC but rather organizational priority of the mobile initiative |

# Summary — Recommended Priority Order (P0-P3)

# P0 (Critical — blocking other work)

| Item | Group | Why P0 |
| ---- | ----- | ------ |

Complete agent verification workflow AGENT_MODEL Schema supports it (isVerified, verificationDate) but no UI. Blocks agent marketplace launch
Agent rating/review system AGENT_MODEL Review system exists for services but not agents. Blocks trust signals

# P1 (High — needed for anchor tenant launch)

| Item | Group | Why P1 |
| ---- | ----- | ------ |

Tenant provisioning UI PRD Required for onboarding any non-Soralia tenant
Platform admin tenant management PRD No admin surface exists for managing multiple tenants
Migrate ~30 remaining fetch() call sites to tRPC cleaner_react_architecture Eliminates technical debt, enables React Query caching for these features
Complete mobile space overflow pattern DASHBOARD-PHASE-B 6 spaces exceed mobile 5-slot limit — overflow needs hardening
Module gating enforcement in SpaceLauncher DASHBOARD-PHASE-B Must verify optional spaces actually auto-hide when all flags disabled

# P2 (Medium — should be done before production)

| Item | Group | Why P2 |
| ---- | ----- | ------ |

Agent onboarding flow AGENT_MODEL Needed for new agent registration
Commission tracking system AGENT_MODEL Database has commissionRate but no tracking/payout
Agent-investor messaging AGENT_MODEL General messaging exists but not agent-contextualized
Maintenance route deduplication cleaner_react_architecture Two parallel implementations of same logic
Missing service layers for 7 entities cleaner_react_architecture chat, directory, user, admin, identity, widget, service
Soralia hardcoded slug in middleware PRD DEFAULT_TENANT_SLUG = 'soralia' in middleware.ts
Billing integration (real payments) PRD Models exist but no provider integration
Announcement absorption into spaces DASHBOARD-PHASE-B Standalone vs integrated in Focus Space model
OpenAPI CI validation API.md npx redocly lint not in CI pipeline
API governance test suite API.md No comprehensive per-procedure governance tests

# P3 (Low — nice to have post-launch)

| Item | Group |
| ---- | ----- |

Agent analytics AGENT_MODEL
Commission payment processing AGENT_MODEL
Property listing analytics AGENT_MODEL
External platform integrations AGENT_MODEL
Agent blacklist/blocking AGENT_MODEL
Domain predicates in useIdentity.ts cleaner_react_architecture
Permissions module expansion cleaner_react_architecture
Platform analytics dashboard PRD
All 8 mobile app store items MOBILE_MONOREPO (blocked on app existence)

SECOND REPORT:

Analysis of PENDING.md Features — Implementation Status
Source: /home/ubuntupunk/Projects/soralia-village/docs/features/MAINTENANCE_TICKETING_SPEC.md (26 items)

# ALREADY IMPLEMENTED ✅ (20 items)

# Spec Item Implementation Evidence

1 Admin can view all requests in paginated list src/app/(tenant)/admin/requests/page.tsx fetches from GET /api/maintenance
2 Admin can filter by status, priority, category RequestFilters.tsx has status, priority, category filter UI; API supports ?status=&priority=&category=
3 Admin can search by resident name, address, description RequestFilters.tsx has search input; GET /api/maintenance supports ?search= param
4 Admin can click request to open detail view RequestCards.tsx has onSelect → renders RequestDetail drawer
5 Admin can change status via dropdown with history recording RequestDetail.tsx has workflow transitions; PATCH /api/maintenance/[id] records to requestHistories
6 Admin can assign request to board member RequestDetail.tsx has "Assigned To" dropdown; POST /api/maintenance/[id]/assign route exists
7 Admin can add internal notes (not visible to resident) RequestDetail.tsx has "Internal Notes" section; POST /api/maintenance/[id]/notes with isInternal: true
8 Admin can view full history of changes RequestDetail.tsx shows "History" section; GET /api/maintenance/[id]/history route exists
9 Admin can schedule repair date RequestDetail.tsx has "Scheduled Date" date picker; PATCH /api/maintenance/[id] accepts scheduledDate
10 Admin can track estimated/actual costs RequestDetail.tsx has "Cost Tracking" with estimated/actual cost fields
11 Dashboard shows total open requests count MaintenanceAnalyticsWidget.tsx and /admin/requests/analytics/page.tsx show stats.overview.totalOpen
12 Dashboard shows average resolution time Analytics page shows stats.overview.avgResolutionDays
13 Dashboard shows requests by status chart Both analytics widget and page show "By Status" bar chart
14 Dashboard shows requests by priority chart Both analytics widget and page show "By Priority" bar chart
15 Dashboard shows trend over time Analytics page shows stats.trend monthly table
16 Admin can view overdue requests list Analytics page shows stats.overview.overdue count
17 Status change history is preserved RequestHistory model in Prisma; history recorded on every status/assignee/priority change
18 All existing endpoints maintain backward compatibility Existing routes unchanged; new routes added at /api/maintenance/[id]/notes, /history, /assign
19 New endpoints follow REST conventions All new endpoints use standard REST patterns with proper HTTP methods
20 Zod schemas validate all inputs maintenanceRequestSchema from @entities/maintenance used in POST validation

STILL CURRENT — PENDING ⏳ (5 items)

# Spec Item Priority Reasoning

1 Admin can sort by date, priority, status P1 The admin page (/admin/requests/page.tsx) does NOT implement sorting controls. The API doesn't accept sort params. Requires adding sort UI + API sorting support.
2 Admin can export requests to CSV P2 No CSV export for maintenance exists. The only CSV in the codebase is for dwallet export and member bulk-import. No export button in the request list.
3 Resident receives email when status changes P1 POST /api/maintenance/[id]/notify exists and sendEmail is wired, but it requires MANUAL trigger from the admin detail view (the "Notify Resident" button). The spec calls for automatic email on status change, which is NOT implemented.
4 Admin receives notification on new request P2 The POST /api/maintenance route emits an event (emitEvent('maintenance.created', ...)) but does NOT send in-app notifications to admins automatically. The spec requires both in-app + email notification to admin/board on new submission.
5 ISR caching implemented appropriately P1 revalidateDashboard() is called on mutations, but the list endpoint lacks explicit Cache-Control headers or ISR tag-based revalidation. The spec asks for revalidate: 60 for request list. Analytics has Cache-Control but not the main list endpoint.
SUPERSEDED / NO LONGER RELEVANT (1 item)

# Spec Item Reason

1 Dashboard shows requests by category, resolution time by category charts (from section 3.2-3.3 chart detail) The spec's detailed chart list (pie/donut, horizontal bar, line, resolution-time-by-category) is partially superseded by the simpler bar-chart analytics that exist. The analytics page has "By Category" bar chart, "By Status", "By Priority" bars, and a monthly trend table — meeting the practical need without the exact chart types. The Recharts-based charts from section 3.2 were not implemented but the data is available. Mark as P3 if desired.
Source: /home/ubuntupunk/Projects/soralia-village/docs/features/widget-registry-architecture-react-rnd-v2.md (26 checklist items)
NOTE: Files #2 and #4 are duplicates (same content at different paths). The analysis below is for the single spec document.
ALREADY IMPLEMENTED ✅ (11 items)

# Checklist Item Implementation Evidence

1 Every widget has a unique id in kebab-case All widgets.ts entries use kebab-case IDs (e.g. 'maintenance-requests', 'quick-actions')
2 Every widget has a version in semver format All entries in widgets.ts have version: '1.0.0'
3 Every widget has an icon (Lucide component) and category All WidgetManifest entries in widgets.ts have icon (Lucide) and category
4 All registrations are in registry/widgets.ts — nowhere else registerAllWidgets in widgets.ts is the only file calling registry.register()
5 All widgets use React.lazy() — no eager imports in WidgetRenderer All component fields use lazy(() => import(...))
6 Named exports use .then(m => ({ default: m.WidgetName })) with React.lazy Every registration follows this pattern (e.g. import(...).then(m => ({ default: m.DashboardStats })))
7 All widget renders go through <WidgetRenderer> WidgetRenderer is the only component that resolves and renders widgets from the registry
8 No widget component is rendered directly in layout or page code All pages use WidgetRenderer or AdminWidgetRenderer
9 WidgetRenderer wraps every widget in ErrorBoundary and Suspense Confirmed in WidgetRenderer.tsx lines 84-90
10 'use client' directive at top of every widget file All widget implementations checked have 'use client'
11 Layout contains widgetId strings, not component references Layout storage uses registry IDs, not component references
STILL CURRENT — PENDING ⏳ (15 items)

# Checklist Item Priority Status Evidence

1 WidgetPermissionGate is applied inside WidgetRenderer P1 WidgetRenderer.tsx (line 87) renders <manifest.component /> without any permission check. The permission check is commented out on line 69-72.
2 resolveConfig is called in WidgetRenderer before passing config P2 No resolveConfig utility exists anywhere in the codebase. Config migration is not implemented.
3 <Rnd> is only used in WidgetContainer P2 react-rnd is NOT installed or used anywhere. No WidgetContainer.tsx exists. The grid/drag system is not implemented.
4 Min/max size constraints from manifest grid units P2 Grid unit conversion not implemented (no WidgetContainer). Sizes exist in manifests but aren't enforced.
5 onResizeStop uses ref.offsetWidth/ref.offsetHeight P3 No resize logic exists at all (no react-rnd).
6 onResizeStop spreads the position argument P3 Dormant — no react-rnd usage.
7 disableDragging and enableResizing gated on isEditing P3 Dormant — no react-rnd usage.
8 Canvas container has position: relative P3 Dormant — no react-rnd usage.
9 dragHandleClassName is set without a leading dot P3 Dormant — no react-rnd usage.
10 Widget handles collapsed prop P2 WidgetCard.tsx has local collapse toggle, but the collapsed state is NOT passed to WidgetRenderer/widget components. No widget implements a collapsed rendering branch.
11 Data fetching uses useSuspenseQuery P2 Widgets use useEffect + fetch (e.g., MaintenanceRequestsWidget.tsx), MaintenanceAnalyticsWidget.tsx), not TanStack Query's useSuspenseQuery.
12 useIsMobile used via DashboardGrid P2 No useIsMobile hook exists; no DashboardGrid component exists.
13 Widget renders identically in WidgetContainer (desktop) and MobileWidgetCard (mobile) P3 Dormant — neither component exists.
14 Each placed widget has a unique id (instance ID) P2 Instance ID generation (widgetId-random8) not implemented. Widgets use their registry ID only.
15 collapsed and configVersion are stored on WidgetLayout P2 configVersion not stored anywhere. Collapse is local-only (not persisted).

SUPERSEDED (0 items)
None — the spec is an architectural target for a future drag-and-drop grid system. The current implementation is a simpler vertical-stack layout with collapsed/expanded cards, which is a valid first iteration. The full react-rnd grid is deferred.
Source: /home/ubuntupunk/Projects/soralia-village/docs/features/widgets/NETCOMPLEX_WIDGET_ALIGNMENT.md (16 items)
This document is an alignment/gap-analysis document, not a feature checklist. Its purpose is to compare NetComplex's existing widget system against the masterplan spec. It identifies 10 gaps and 8 already-matching items.

ALREADY MATCHES THE MASTERPLAN ✅ (8 items)

# Item Evidence

1 Registry-based component lookup instead of switch statement registry.ts with registry.resolve(id) and WidgetRenderer
2 ErrorBoundary wrapping in WidgetRenderer Confirmed in WidgetRenderer.tsx line 85
3 Feature flag integration on widget metadata featureFlag field on WidgetManifest used by listForContext
4 Category system on widget registry `category: 'core'
5 Separate custom sections registry for tenant-specific content spaces.ts with space-domain separation
6 Premium widget tier concept premium: boolean on manifests (e.g., premium-portfolio, agent-dashboard)
7 Tenant-scoped data plane with withTenant() Confirmed in all API routes and entity services
8 Single Next.js app serving both platform and tenant traffic Next.js App Router with tenant-based routing
STILL CURRENT — GAPS REMAINING ⏳ (8 items)

# Gap Priority Status Details

1 No version on any widget P0 ✅ RESOLVED — All widgets in types.ts and widgets.ts now have version: '1.0.0'. The gap analysis from NETCOMPLEX_WIDGET_ALIGNMENT.md is now outdated on this point.
2 No lazy loading (eager imports) P1 ✅ RESOLVED — All widgets now use React.lazy(). The gap analysis is outdated.
3 Tenant context not wired into widgets P1 Widgets don't receive tenantId from context. WidgetRenderer has commented-out tenant code. Data fetching widgets call fetch(...) without tenant context from useTenantContext().
4 icon is a FontAwesome string, not a component P1 ✅ RESOLVED — All manifests use Lucide icon components, not FontAwesome strings.
5 No author field or external widget concept P2 ✅ RESOLVED — `author: 'internal'
6 No collapsed state pattern P2 WidgetCard.tsx has basic collapse, but no widget component implements a collapsed rendering branch.
7 No loader field / no remote loading path P3 WidgetManifest doesn't have loader field. Remote loading not implemented.
8 react-rnd not mentioned / not implemented P3 No drag-and-drop grid system exists. The widget layout is a static vertical stack.

# Summary of Still-Current Items by Priority

P0 (Critical — blocks safety/correctness)

- None at P0. The most critical items from the gap analysis (version, lazy loading, icon type, author field) have been resolved.

# P1 (High — needed for intended functionality)

1. Maintenance: Auto-notify resident on status change — email is sent only on manual "Notify Resident" click, not automatically
2. Maintenance: Notify admin/board on new request — event emitted but no notification delivered
3. Maintenance: ISR caching on list endpoint — missing Cache-Control headers and tag-based revalidation
4. Maintenance: Sort by date/priority/status — no sort controls in UI or API
5. Widget: WidgetPermissionGate — permission enforcement not implemented in WidgetRenderer
6. Widget: Tenant context — widgets not receiving tenantId from context

# P2 (Medium — important for completeness)

1. Maintenance: CSV export — no export capability
2. Widget: Config versioning/migration (resolveConfig) — not implemented
3. Widget: Collapsed state on widgets — widgets don't handle collapsed prop
4. Widget: useSuspenseQuery — widgets use useEffect + fetch instead
5. Widget: Instance ID generation — no instance-level ID for placed widgets
6. Widget: Persisted collapsed/configVersion — not stored
7. Widget: No react-rnd grid system — drag-and-drop DashboardGrid completely absent

# P3 (Low — nice to have / deferred)

1. Widget: All react-rnd implementation items (WidgetContainer, onResizeStop, dragHandleClassName, bounds, etc.)
2. Widget: MobileWidgetCard, useIsMobile, breakpoint testing
3. Widget: Remote widget loading (loader field, Module Federation)
4. Widget: Analytics enhancement (pie charts, resolution-time-by-category)

Superseded/Duplicate Items

- File #4 (docs/features/widget-registry-architecture-react-rnd-v2.md) is an exact duplicate of File #2 (docs/features/widgets/widget-registry-architecture-react-rnd-v2.md)
- Several NETCOMPLEX_WIDGET_ALIGNMENT.md gap items (version, lazy loading, icon type, author) have already been resolved in the actual codebase since the gap analysis was written

REPORT THREE

# Structured Analysis of PENDING.md Sections Against Source Code

1. CONTEXTS (5 files)
   File PENDING Claim Source Code Reality
   chat.md "Message pruning not implemented" Implemented. src/app/api/messages/route.ts:245-253 has Drizzle-based pruning (lt(messages.expiresAt, now())). Two test files cover it (chat.test.ts:649, messages.test.ts:375).
   competitions.md "Missing widget registration" No CompetitionWidget or competition registration found in WidgetRegistry. Competition DTO and tRPC router exist but no admin dashboard widget.
   content.md "Content DTO not in shared barrel" Export exists. src/shared/api/dto/index.ts line 11: export \* from './content';
   user.md "residentType overlap" Prisma uses residencyType consistently on both Profile and Invitation models. No residentType field found in source. The conceptual naming conflict described may have been resolved during the data model cleanup (marked ✅ COMPLETED in TECH_DEBT_REMEDIATION_PLAN).
   user.md "Suspension frontend not implemented" Implemented. SuspendUserModal.tsx, UsersListSection.tsx with full suspension integration, DTO at suspension.ts. Suspension UI is live in admin.
   widget.md "Phase 38 (ServicesLayer + MessagesLayer) not started" ServicesLayer.tsx exists as a file at src/widgets/dashboard/ui/ServicesLayer.tsx, but the Phase 38 planning item (specific architecture milestone) has not been initiated.

2. COMMUNIQUES (2 files)
   COMMUNIQUE.md — 5 items
   Item Status Evidence
   admin() plugin ✅ IMPLEMENTED admin({ adminUserIds: ['FmFmv6QHWXcwTzXbFDnxvEjF2Q4Qh4SE'] }) in auth.ts:178-180
   customSyntheticUser ✅ IMPLEMENTED customSyntheticUser config with banned: false, banReason: null, banExpires: null in auth.ts:65-72
   banned/banReason/banExpires columns ✅ IMPLEMENTED All three columns exist in schema.prisma:121-123 and DB
   impersonatedBy on session ✅ IMPLEMENTED Present in schema.prisma:79 and all Drizzle schemas
   Impersonation testing (stop endpoint) ❌ NOT IMPLEMENTED No /api/auth/admin/stop-impersonating route found
   Verdict: 4 of 5 items already implemented. Only the stop-impersonating test remains current (P1).

COMMUNIQUE-03.md — 13 items (Proposed 5-phase plan)

| Proposed Phase | Status | Evidence |
| -------------- | ------ | -------- |

Phase A — Audit & normalize gate usage 🟡 Partial canAccess() and assertModuleEnabled() both exist, but routes still gate inconsistently
Phase B — Gate context endpoint ✅ IMPLEMENTED GET /api/gate/context route exists at src/app/api/gate/context/route.ts
Phase B — Zustand store ✅ IMPLEMENTED useGateContextStore at src/entities/tenant/model/gate-context-store.ts
Phase B — Hydrate on app shell mount 🟡 Unknown Store has hydrate() method but not confirmed called at app shell
Phase C — Domain card gating ❌ NOT IMPLEMENTED Domain cards in ServicesLayer.tsx:64, AdminLayer.tsx:125 do NOT reference useGateContextStore
Phase C — Tooltip for gated cards ❌ NOT IMPLEMENTED No gated card tooltip components found
Phase D — <FeatureGateWall> component ❌ NOT IMPLEMENTED No FeatureGateWall found anywhere
Phase D — Wrap gated pages ❌ NOT IMPLEMENTED Depends on FeatureGateWall
Phase D — Remove per-page 403 handling ❌ NOT IMPLEMENTED Depends on above
Phase E — Dev tier decision ✅ RESOLVED Soralia Village is seeded as tier: 'PREMIUM' (from soralia-village/tenant.ts:9)
Phase E — Apply to seed data ✅ IMPLEMENTED PlatformModule seeds set tiers: 11 modules at STANDARD, 7 at PREMIUM
Phase E — Document decision 🟡 Unknown Not found in ADR updates

Verdict: 4 items already implemented, ~5 items still current (P1-P2), remainder depend on feature-gating UI work. The tier/module question has already been resolved (Soralia is PREMIUM, not STANDARD as assumed in the communique).

3. PRODUCT — user-stories-john-mary.md (114 items)
   All 114 items are marked ⏳ (pending) in the document. Here is the status of major story groups:
   Story Group Status Evidence
   User Story 1 — Landlord registration with unit number ❌ Not implemented No unit-number registration flow found
   User Story 2 — Letting agent (SEEF) invites occupants ❌ Not implemented Agent access model exists in schema but the invitation workflow is not built
   User Story 3–4 — Occupant profile setup ❌ Not implemented Profile creation flow for occupants not found
   User Story 5 — Landlord manages occupants ❌ Not implemented No household occupant management UI
   User Story 6 — Occupant privacy controls ❌ Not implemented No occupant-level privacy toggles
   User Story 7 — Premium Seat upgrade after 1 year ❌ Not implemented No tenure tracking or upgrade UI
   User Story 8 — SEEF induction assistance ❌ Not implemented No agent onboarding UI
   User Story 9–10 — Spouse/Co-owner scenarios ❌ Not implemented Joint household model not built
   User Story 11 — Minor profiles for children ❌ Not implemented MINOR profile type in concept only
   User Story 12 — Owner-occupier ❌ Not implemented
   User Story 13 — Multi-property landlord ❌ Not implemented Multiple household model not built
   User Story 14 — Non-resident board member ❌ Not implemented Premium Seat (MEMBER type) not implemented
   User Story 15–18 — Property agent workflows ❌ Not implemented AgentAccess model defined in Prisma but UI/workflows not built

Verdict: All 114 items are still current (P2) — these are aspirational product stories that describe the full household/seat lifecycle. None of the acceptance criteria are implemented. They represent the full "anchor tenant launch" roadmap (M5).

4. STANDARDS (3 files)

TECH_DEBT_REMEDIATION_PLAN.md — 44 items

| Priority | Section | Status | Evidence |
| -------- | ------- | ------ | -------- |

P0 — Security ✅ COMPLETED Auth on messages, input validation (Zod), sanitization
P0 — Build performance ❌ OPEN Server component conversion not done
P0 — Loading states & Error Boundaries ✅ COMPLETED ErrorBoundary, LoadingSpinner, LoadingSkeleton, etc. exist
P1 — Type Safety ✅ COMPLETED No any in application code per report
P1 — Data Model Cleanup ✅ COMPLETED Deprecated fields removed
P2 — Code Quality 🟡 PARTIAL Split dashboard done; error boundaries on all components and React.memo/useMemo still open
P2 — Config & Tooling ❌ OPEN ESLint enhancement, a11y rules, Prettier integration not done
P3 — Code Cleanup ❌ OPEN Unused code, console.log, logging framework
P3 — Monitoring & Performance ❌ OPEN No Sentry/LogRocket, no Core Web Vitals tracking
P0 — Vercel Cost Optimization 🟡 PARTIAL PPR enabled, caching added, revalidation utilities exist. Supabase region verification, Edge Runtime migration, spend alerts still open

Verdict: ~18 items already implemented, ~26 items still current (P0-P3). The plan itself is not tracked elsewhere as a unified workstream — it would benefit from conversion into BD issues.

TESTING_METHODS.md — 17 manual E2E checklist items

- All 17 items in the "Manual Testing Checklist" are marked ⏳
- They are generic testing descriptions, not actionable BD issues
- Verdict: All 17 are still current (P3) — ongoing QA activities
  dependency-analysis-recommendations.md — 9 items

| Recommendation | Status | Evidence |
| -------------- | ------ | -------- |

Migrate file storage to Vercel Blob ❌ NOT DONE @vercel/blob not in package.json
Edge-compatible health check ❌ NOT DONE No Edge health check route found
Migrate auth to Clerk ❌ NOT DONE Still using Better Auth (confirmed in auth.ts)
Migrate to Drizzle ORM ✅ IMPLEMENTED drizzle-orm@0.45.2 in package.json, src/db/schema/ exists, Drizzle used in API routes
Schema migration to Drizzle ✅ IMPLEMENTED Drizzle schema exists alongside Prisma
Full Edge Runtime deployment ❌ NOT DONE Still Node.js runtime

Verdict: 2 of 9 items already implemented (Drizzle adoption). The remaining 7 are still current (P3) — the plan itself was aspirational cost-optimization recommendations, not committed work items. The project chose to adopt Drizzle but did not follow through on Vercel Blob, Clerk, or full Edge Runtime migration.

5. ADVISORIES (26 files, ~240 items)

Specific Checks
Advisory Status
ADVISORY-027 (Seat/Invoice/Payment model duplication) Still open. BD soralia-village-sioz is in_progress (not closed). All gates G0-G3 unresolved. No code changes executed.
ADVISORY-030 (Onboarding Refactor, earlier draft) ✅ SUPERSEDED by ADVISORY-031. Explicitly marked as superseded at top of file.
ADVISORY-031 (Onboarding Refactor, canonical) Still open. Phase 0 (nullable tenantId migration) not done. No done criteria checked off. Gates G2, G3, G4 unresolved.
ADVISORY-008 through ADVISORY-034 (remaining ~23 advisories) These are forward-looking architectural recommendations. None are tracked as resolved in code.
Summary of advisories: 1 superseded, ~25 still current as forward-looking recommendations. Only ADVISORY-027 and ADVISORY-031 have specific execution plans with decision gates and BD issues assigned.

OVERALL SUMMARY TABLE
|Section| Already Implemented|
Contexts (chat, content, user suspension, user residentType) 4 items
Communiques (COMMUNIQUE.md 5 items, COMMUNIQUE-03.md 13 items) ~8 items
Product (user-stories, 114 items) 0 items
Standards (TECH_DEBT, TESTING, dependency) ~20 items
Advisories (26 files, ~240 items) 0 advisories closed
TOTAL (approximate) ~32 items

# Recommendations for PENDING.md Updates

1. Move to "completed": chat.md (message pruning), content.md (DTO barrel), user.md (residentType, suspension frontend)
2. Move to "completed": COMMUNIQUE.md items 1–4 (admin plugin, customSyntheticUser, banned columns, impersonatedBy)
3. Move to "completed": COMMUNIQUE-03.md Phases B (gate context endpoint + Zustand store) and E (tier resolution)
4. Keep as current: competitions.md (widget registration), widget.md (Phase 38), COMMUNIQUE.md item 5 (stop-impersonating test), COMMUNIQUE-03.md Phases A, C, D (domain card gating, FeatureGateWall)
5. Keep as current: All 114 user stories (they are the M5 anchor tenant launch roadmap)
6. Keep as current: ~26 still-open tech debt items, 17 testing checklist items, 7 dependency recommendations
7. Keep as current: ADVISORY-027, ADVISORY-031; mark ADVISORY-030 as superseded (already noted)
