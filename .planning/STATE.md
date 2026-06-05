---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: Phase 43 (m4-5-blockers) planned and verified. 5 PLAN.md files in 3 waves. Round 1 plan-checker found 0 blockers + 8 warnings; round 2 verified all 8 fixes correctly applied. Plans ready to execute. Phase 43 must complete BEFORE M4.5 stabilization (7-day soak) begins.
last_updated: '2026-06-04T11:00:00.000Z'
progress:
  total_phases: 47
  completed_phases: 37
  total_plans: 102
  completed_plans: 94
  percent: 79
---

# Project State

## Current Position

- **Phase:** Phase 48 (admin-chrome-parity) COMPLETE (3/3 plans shipped, visual gate passed 15/15 routes, P1 03kz auth session timeout fixed in same ship). Next: Phase 43 (m4-5-blockers) ready to execute.
- **Status:** Phase 48 done. Phase 43 plans ready to execute. After Phase 43 ships, M4.5 Stabilization (7-day soak) begins.
- **Last Updated:** 2026-06-05
- **Next Step:** Execute Phase 43 in worktree: `git worktree add ../worktrees/phase-43-m4-5-blockers -b phase-43-m4-5-blockers`, then `/gsd-execute-phase 43`. See `.planning/MILESTONES.md` §2 for M4.5 criteria.

**Last Session:** 2026-06-05T13:45:00.000Z
**Stopped at:** Phase 48 executed end-to-end. 3 PLAN.md files (48-01..48-03) across 2 waves: Wave 1 = 48-01 (SpaceChrome + getActiveSpaceId + href field, TDD with 16 unit-test cases); Wave 2 = 48-02 (dashboard/layout.tsx refactor 67→7 lines) + 48-03 (admin/layout.tsx creation with blocking-human visual verification). Visual gate (REPORT.md): 15/15 routes pass for chrome parity. 4 orthogonal pre-existing bugs filed as BD issues (03kz P1 fixed inline by bumping POOL_CONFIG.max 1→10; igwm P2 survey View routing; k91v P2 AdminContentWidget filter; fjq1 P3 announcements seed check). 3 BD issues remain open for follow-up. 48-03 was `autonomous: false` due to blocking-human visual checkpoint.
**Resume file:** None

## Active Phase Decisions

- [x] [Phase 40-01]: Prisma 7-status enum + 5 new models + Drizzle schema imports
- [x] [Phase 40-02]: CRUD API for teams, providers, categories + assignment with history tracking
- [x] [Phase 40-02]: Ticket number generation SRV-{YYYY}-{NNNN} + comma-separated priority filter
- [x] [Phase 40-02]: Resident notes bug fix — filter isInternal instead of 403 on any internal note
- [x] [Phase 40-02]: Admin activity 7-status CASE + ticketNumber in metadata
  - [x] [Phase 40-04]: Status timeline uses 5-step vertical layout; PENDING_PARTS at IN_PROGRESS level; CANCELLED rendered separately
  - [x] [Phase 40-04]: ActivityZone merges announcement + maintenance items sorted by date, top 5; Maintenance type uses Wrench icon + /maintenance link
  - [x] [Phase 40-04]: 7 seed requests covering lawn irrigation, burst pipe, tree felling, network outage, electrical mains, bin removal, garage door

  - [x] [Phase 41]: Module key as canonical FeatureKey namespace (most stable of the three systems' key formats)

- [x] [Phase 41]: Role as Layer 0 (prerequisite) — runs before tier; synchronous in-memory lookup against ROLE_PERMISSIONS
- [x] [Phase 41]: Two-tier-system bridge — server uses TenantTier (STANDARD/PREMIUM/ENTERPRISE), client uses TierLevel (foundation/depth/core); conversion via tenantTierToTierLevel() helper
- [x] [Phase 41]: Explicit null values in mapping tables (load-bearing — documents "no gate at this layer")
- [x] [Phase 41]: Client skips Module layer check (server is source of truth; client relies on server 403 + Flag layer)
- [x] [Phase 41]: Phase 1 is purely additive — no existing callsites change; CI test prevents future drift
- [x] [Phase 41]: Advisory at .planning/ADVISORY.md is STALE — references helpers (`getTenantTier`/`getModuleDefinition`/`getTenantModule`) and patterns (`unstable_cache`+`revalidateTag`) that don't exist; `/api/flags` doesn't return `tier`; pseudocode has dead-code bug (line 261 uses `result` before defined). Only "no legacy tier strings" signal is authoritative.
- [x] [Phase 41]: Q1=A — Client skips Tier and Module layers; server is source of truth. Client `useGateContext()` provides `{ role, flags }` only (no tier); Layer 4 (FeatureToggle) degrades gracefully when tier absent
- [x] [Phase 41]: Q2=A — Remove ALL 8 legacy tier string occurrences: `tiers.ts:261-275` (3 cases in switch), `tenants.ts:17` (Drizzle default `'sprout'`→`'basic'`), `prisma/schema.prisma:72` (default `"sprout"`→`"basic"`), `TenantFeaturePage.tsx:111-113` (3 `<option>` lines), `base.ts:6` (comment "subscriptionTier: 'forest'"→"'flagship'")
- [x] [Phase 41]: Slug file `src/shared/api/slug.ts:67` `'forest'` is a NATURE-WORD LIST (sky, sun, tree, flower, forest, mountain, ...) — NOT a tier reference. DO NOT touch.

- [x] [Phase 39-competition-entries]: CompetitionEntry model + DTOs + Prisma migration (39-01)
- [x] [Phase 39-competition-entries]: tRPC competition router with 9 procedures (39-02)
- [x] [Phase 39-competition-entries]: Public UI — cards grid at /competition, detail page at /competition/[id] (39-03)
- [x] [Phase 39-competition-entries]: Admin UI — expandable rows, per-type actions, type selector (39-04)

## Decisions Made

- **Onboarding transaction scope:** Onboarding route wraps setting upserts (not user/tenant/role creation) in db.transaction — user/tenant creation happens in tenants route with its own transaction + cleanup pattern
- **Server-side guard separation:** requirePlatformAdmin helper placed in separate guards.ts file (not permissions.ts) to avoid breaking client-side imports — permissions.ts is imported by Header.tsx and other client components
- **Self-service tenant signup:** Primary path is /platform/signup — Platform Admin–led inception replaced (DISCUSSION.md v2)
- **Trust boundary separation:** isPlatformAdmin flag on user model, never a Role enum value
- **Tenant ownership:** ownerId on Tenant schema for verifiable ownership
- **Setting uniqueness:** @@unique([tenantId, key]) — global @unique breaks with 2+ tenants
- **Resources as standalone model:** Not Content category — needs file attachments, visibility scoping, versioning
- **Competitions as standalone model:** Needs entry management, voting, deadlines
- **Module architecture:** Two-table design (platform_modules + tenant_modules)
- **Tier hierarchy:** standard (base) → premium → enterprise
- **Tier enforcement:** FeatureGate reads from tenant_modules filtered by tier
- **Hybrid feature gating:** TierGuard (tier baseline) + FeatureGate (per-tenant overrides)
- **Super-admin route:** /admin/platform/ is canonical
- **withTenant enforcement:** Applied to 11 tenant-scoped API routes
- **Tenant branding UI:** Uses API routes for updates with live client-side preview
- **Feature toggle UI:** Shows tier-allowed (green), tenant-overridden (yellow), locked (gray) states
- **Widget registry:** Map-based O(1) lookups, manifest-driven feature flags, backward-compatible exports
- **Real-time chat hooks:** useRealtimeMessages, useTypingIndicator, usePresence for Supabase Realtime
- **Email infrastructure:** MailerSend for transactional emails with graceful API key validation
- **Password reset:** Custom UUID token-based flow with 1-hour expiry
- **Email enumeration protection:** Password reset always returns success regardless of email existence
- **Toast unification:** Sonner as single toast system — Zustand toast removed, useApiToast retained for API operations
- **Events CRUD pattern:** Simplified form (no Tiptap, no i18n) vs ContentForm — events are single-language plain text
- **adminEventSchema:** Separate schema from existing eventSchema (different fields: title/description/date/location/organizer vs startDate/endDate/maxAttendees)
- [Phase 21-content-events]: Used simplified form pattern (no Tiptap, no i18n) vs ContentForm — events are single-language with plain text fields
- [Phase 21-content-events]: Extended events API with limit and upcoming query params for efficient widget data fetching — Client-side filtering would be inefficient; API should support server-side filtering
- [Phase 22-page-flag-expansion]: Expanding page visibility flags to Groups, Services, Resources, Maintenance, Surveys, and Competitions.
- [Phase 22-page-flag-expansion]: Centralized flag fetching via `usePageFlags` hook to ensure consistency across Header, Footer, and Mobile Menu.
- [Phase 41-feature-gate-consolidation]: Phase 1 ships infrastructure only — `canAccess()` callable but no existing callsite migrations. Two gate systems run in parallel temporarily; zero risk of breaking production gates.
- [Phase 41-feature-gate-consolidation]: Q1=A — Client skips Tier and Module layers. `useGateContext()` returns `{ role, flags }` only; server 403 is source of truth.
- [Phase 41-feature-gate-consolidation]: Q2=A — Real session role, not hardcoded. Both server (`resolveGateContext`) and client (`useGateContext`) read role from Better Auth session. Default `'RESIDENT'` if unauthenticated.
- [Phase 41-feature-gate-consolidation]: No `normalizeTier()` bridge in Phase 1 — `TenantTier` flows directly into `GateContext.tier`; conversion to `TierLevel` happens only at FeatureToggle layer.
- [Phase 41-feature-gate-consolidation]: Deny by default while loading — `useGateContext()` returns `null` when loading, `useCanAccess` converts to `{ allowed: false, reason: 'role' }`. `GateGuard` renders `loadingFallback` (default `null`).
- [Phase 41-feature-gate-consolidation]: Explicit `null` in mapping tables is load-bearing — `competitions` and `dashboard` map to `null` at module/registry layers. CI test (Plan 41-03) enforces no missing keys.
- [Phase 41-feature-gate-consolidation]: Tri-state flag handling — `true` constant for non-boolean branch (TypeScript narrows `flagValue` to non-boolean in false branch). UI consumes the value, gate layer treats tri-state as enabled.
- [Phase 41-feature-gate-consolidation]: Mapping test count assertion is `toHaveLength(14)` — explicit count catches silent inflation from duplicate or extra keys.
- [Phase 41-feature-gate-consolidation]: `revalidateGate()` uses `revalidatePath()` (matches existing pattern), NOT `revalidateTag()`. Phase 2 mutation routes will provide call-site coverage.
- [Phase 22-page-flag-expansion]: Added 6 new page visibility flags to PlatformPageFlags interface with default value 'true'
- [Phase 22-page-flag-expansion]: Implemented a simple client-side hook 'usePageFlags' using native fetch
- [Phase 22]: Added Page Settings toggle and localized navigation labels.
- [Phase 23-competitions-resources-01]: Used Events CRUD pattern as template for competition admin pages (adminEventSchema → adminCompetitionSchema)
- [Phase 23-competitions-resources-01]: Public /competition page fetches upcoming competitions (startDate <= now AND endDate >= now)
- [Phase 23-competitions-resources-01]: Entry submission button kept as placeholder — entry management is future work
- [Phase 23-competitions-resources-03]: Migration script does NOT delete original Content records — left for manual verification
- [Phase 23-competitions-resources-03]: Content RESOURCE maps to ResourceCategory.OTHER (no direct category mapping)
- [Phase 23-competitions-resources-04]: Server components query Drizzle directly for admin edit pages instead of fetching from internal API — simpler, more reliable
- [Phase 23-competitions-resources-04]: Competition API allows unauthenticated access for upcoming=true filter with ACTIVE status only
- [Phase 24-dashboard-enhancement-01]: Surveys tab added to admin dashboard with SurveysWidget, aggregated responses API, and visual results page
- [Phase 24-dashboard-enhancement-01]: Pure Tailwind CSS bar charts used instead of external chart library for survey results
- [Phase 24-dashboard-enhancement-02]: Group membership moderation API + GroupModerationWidget — uses hasPermission('content') for access control, withTenant() for tenant isolation
- [Phase 26]: PageSettingsWidget imports PlatformPageFlags from entity layer instead of duplicating locally
- [Phase 26]: AdminQuickLinksWidget uses ADMIN_ITEMS from navigation-config with adminLabelKey i18n fallback
- [Phase 26]: headerEngagementFocus radio placed before page toggles for admin visual prominence
- [Phase 11]: Announcement admin UI uses simplified form pattern (no Tiptap, no i18n) matching Phase 21 events
- [Phase 11]: Stream widget renders full content per revised instructions, not truncated
- [Phase 11]: No new navigation entries — discovery through dashboard widgets and notification feed only
- [Phase 11]: /news page embeds stream as section with #announcements anchor — no separate route
- [Phase 29]: Moved default-layouts.ts to @entities/widget/model to avoid circular dep — widget-store imports it directly
- [Phase 29]: resetToRoleDefaults(role, userId) single-call pattern — clears store + persists to DB
- [Phase 29]: DashboardPage fallback chain: userWidgets[tab] → roleDefaults.userWidgets[tab] → [] (no more DEFAULT_TABS.defaultWidgets)
- [Phase 34-admin-layer]: AdminLayer renders instead of SpaceLayout for admin space — replaces widget-grid+sub-launcher hybrid
- [Phase 34-admin-layer]: AdminCommandBar has reactive CTAs (open maintenance, pending members, closing surveys, expired announcements) + 6 default shortcuts + extensible Add popover
- [Phase 34-admin-layer]: AdminActivityStream uses lazy-load with domain filter tabs (All/Users/Maintenance/Content/Events/Surveys/System) + cursor pagination
- [Phase 34-admin-layer]: Domain grid shows urgency badges from /api/admin/urgency domainBadges
- [Phase 34-admin-layer]: admin-activity and admin-quick-links widgets removed from admin space defaults (absorbed into AdminLayer)
- [Phase 35-api-alignment]: [Phase 35-B01]: Used @trpc/openapi (official tRPC v11, not trpc-openapi v1) — trpc-openapi requires @trpc/server@^10, incompatible with v11
- [Phase 35-api-alignment]: Canonical tRPC routers live in src/server/routers/ per tRPC.md §15 — old entity router kept as deprecated re-export shim
- [Phase 35-api-alignment]: v1 routes re-export from flat routes — keeps logic DRY during transition to tRPC
- [Phase 35-api-alignment]: Re-exports match source exactly — 16 mismatches fixed to prevent compilation failures
- [Phase 35-api-alignment]: Public v1 routes only export GET handlers — mutations require auth in tenant namespace
- [Phase 35-api-alignment]: DTO ISO string dates — all dates serialized to ISO strings for portable API contracts
- [Phase 35-api-alignment]: Feature gate reuses existing DB-backed isModuleEnabled instead of simpler Tenant.modules check — already handles tier enforcement + platform_modules + tenant_modules
- [Phase 35-api-alignment]: Rate limiter uses in-memory Map store (single-instance) — Redis upgrade flagged for multi-instance production
- [Phase 35-api-alignment]: Entity DTOs re-export from @shared/api/dto (shared canonical layer) — avoids duplication during transition
- [Phase 35-api-alignment]: API test infrastructure uses hoisted mock state pattern with per-file vi.hoisted() for route mocking
- [Phase 35-api-alignment]: Shared helpers (makeSelectChain, createMockRequest) extracted to src/test/api/helpers.ts
- [Phase 35-api-alignment]: Entity services mocked at module level (vi.mock) to avoid deep import chains during route testing
- [Phase 35-api-alignment]: Redocly lint targets local public/openapi.json via --config .redocly.yaml
- [Phase 35-api-alignment]: Schema ownership: Entity-owned schema.ts files created for 6 entities (booking, chat, content, events, maintenance, tenant), re-exported from shared
- [Phase 35-api-alignment]: requireRole() helper added to permissions.ts for canonical role gating
- [Phase 35-api-alignment]: CONFLICT (409) and GONE (410) added to canonical error taxonomy with apiConflict()/apiGone() wrappers
- [Phase 37-admin-route-consolidation]: ADMIN_ROUTE_OVERRIDES map: maintenance→/admin/requests, system→/admin/categories — domain IDs that differ from their target admin page
- [Phase 37-admin-route-consolidation]: Platform admin cross-links (/dashboard/admin/platform) preserved intentionally — these route through the separate platform route group and are out of scope
- [Phase 38]: Used ClipboardPlus instead of WrenchPlus for New Request shortcut — WrenchPlus not in installed lucide-react — WrenchPlus doesn't exist in current lucide-react version, ClipboardPlus fits form/request creation semantic
- [Phase 38]: No AddShortcutPopover in ServicesCommandBar — keeping resident UI simple for MVP — AdminCommandBar has extensibility via AddShortcutPopover; residents don't need custom shortcut management
- [Phase 38]: No activity stream in ServicesLayer — not needed for MVP, may add later — AdminLayer has AdminActivityStream but services space doesn't need real-time activity for initial launch
- [Phase 38]: MessagesLayer skips activity stream — conversations list IS the activity — Plan truth: messages doesn't need separate stream, conversations serve as activity
- [Phase 38]: MessagesCommandBar simplified for all users — no AddShortcutPopover, no adminOnly flags — MVP: keep messages simple, all users see same command bar
- [Phase 38]: Domain grid heading 'Communication' hardcoded — i18n deferred to Plan 04 — Follows plan spec: i18n integration happens in routing plan
- [Phase 38-04]: SERVICES_DOMAINS and MESSAGES_DOMAINS placed in spaces.ts mirroring ADMIN_DOMAINS pattern
- [Phase 38-04]: Routing order: admin → services → messages → SpaceLayout fallback preserves community as only DnD space
- [Phase 38-04]: myServices (camelCase) in JSON keys matches ServicesSubLauncher labelKey — i18n libraries don't support hyphens well
- [Phase 39-01]: CompetitionEntry id uses crypto.randomUUID() for server-side ID generation
- [Phase 39-01]: Three competition types (RAFFLE, PHOTO, SCORE) with different winner mechanics
- [Phase 39-02]: `inArray` from drizzle-orm used directly (not dynamic import) for performance
- [Phase 39-02]: Winner notifications create records via db.insert(notifications) using existing Notification model
- [Phase 39-02]: Fisher-Yates shuffle for fair RAFFLE winner selection
- [Phase 39-03]: Responsive card grid at /competition with type badges and participant count avatars
- [Phase 39-03]: Detail page uses hero + info grid + collapsible rules + type-specific action section
- [Phase 39-04]: Removed .default() from adminCompetitionSchema to avoid react-hook-form type inference issues
- [Phase 39-04]: Winners count hidden for PHOTO type (manual selection only); auto-select uses top N scores for SCORE type
- [Phase 40]: Workflow transitions defined as UI constant map for MVP simplicity (not API-driven)
- [Phase 40]: Category filter falls back to hardcoded list when DB categories empty
- [Phase 40]: Handoff flow unassigns team + assigns provider in single assign API call with reason field
- [Phase 40]: Ticket number shown as #--- fallback for pre-ticketing data in UI cards
- [Phase 36]: JSON config column pattern for type-specific question settings (displayAs, charLimit, minValue/maxValue, maxStars) — Avoid schema migrations when adding new question type features; config: Json? @default('{}') prevents NULL handling
- [Phase 36]: Question.sectionId uses SetNull on Section delete (preserves questions if section removed) — Questions are content, sections are organizational groupings — losing section context shouldn't cascade-delete questions
- [Phase 36]: SurveySection cascades on Survey delete (sections are owned by survey) — Sections only have meaning within their parent survey — no orphan sections needed
- [Phase 36-survey-builder]: [36-02] QuestionType validation uses const-tuple (VALID_QUESTION_TYPES as const) — single source of truth for runtime + compile-time enum — Avoids drift between pgEnum and TS types
- [Phase 36-survey-builder]: [36-02] Reorder endpoints pre-verify all IDs in single inArray query before starting transaction — fails fast with 404 if any ID is wrong — Avoids partial updates from misrouted IDs
- [Phase 36-survey-builder]: [36-02] GET-survey returns flat {survey, questions, sections} shape — builder UI groups questions client-side using sectionId — Matches builder mental model; one request for full hydration
- [Phase 31]: Inlined TAB_TO_SPACE_MAP in widget-store.ts instead of importing from tab-migration-map.ts (file deleted in Plan 31-02)
- [Phase 31]: Renamed resetTabLayout→resetSpaceLayout for API consistency (plan missed this 4th method with Tab in name)
- [Phase 31]: dashboard/page.tsx simplified to always render HomeLayer + MyHomeSpace (no conditional flag branch)
- [Phase 31]: dashboard/layout.tsx simplified to always render SpaceLauncher + MobileSpaceBar (no conditional flag branch)
- [Phase 31]: NEXT_PUBLIC_FOCUS_SPACES was not present in .env.local — no env cleanup needed
- [Phase 31]: admin-config.ts safe to delete — not exported from entities/admin barrel, only used DashboardTab type from deleted DashboardTabs.tsx
- [Phase 31]: Dropped SPACE\_ prefix from constants — DEFAULT_USER_WIDGETS/DEFAULT_LAYOUTS are canonical (no migration prefix needed)

## Notes

- Phase 01 enforcement: tenant isolation enforced in API routes
- Dynamic tenant theming wired via layout.tsx
- FeatureGate ready for navigation integration
- Phase 02-01 complete: Admin UI for tenant management implemented
- **09-real-time-chat-01:** Complete - Tasks 1-5 verified (user approved)
- **10-email-notifications-01:** Complete - Tasks 1-5 committed, TypeScript errors fixed
- Task 5 checkpoint: human verification passed
- Email sending is async and non-blocking to not affect main flows
- **18-toast-unification-01:** Complete - Zustand toast removed, Sonner unified, ADR-018 added
- **19-schema-corrections-01:** Complete - Setting @@unique, Tenant.ownerId, user.isPlatformAdmin — migration applied
- **19-schema-corrections-02:** Complete - Header role case-sensitivity bug fixed with isAdmin() helper
- **19-schema-corrections-03:** Complete - Platform Admin tenant CRUD wired, isPlatformAdmin guard added
- **20-self-service-inception-01:** Complete - Signup API uses Better Auth for password, sets ownerId, redirects to onboarding
- **20-self-service-inception-02:** Complete - 5-step onboarding wizard built with state management, API persistence, and admin redirect
- **20-self-service-inception-03:** Complete - AssistSession model + API for time-limited staff access with dual revocation
- **20-self-service-inception-04:** Complete - Gap closure: InviteStep sends invitations, auth-guard enforces AssistSession scope
- **21-content-events-01:** Complete — ContentForm date pickers, API date filtering for public queries, admin bypass (2 commits)
- **21-content-events-02:** Complete — Events CRUD admin pages, EventForm, EventList, API routes (3 commits)
- **21-content-events-03:** Complete — Events dashboard tab and upcoming events widget with limit/upcoming query params (2 commits)
- **22-page-flag-expansion-01:** Complete — Expanded settings/flag logic, API, shared hook, tests (2 commits)
- **22-page-flag-expansion-02:** Complete — Page Settings toggle in admin widget, localized navigation labels (2 commits)
- **22-page-flag-expansion-03:** Complete — Header, Footer, MobileMenu navigation expansion with usePageFlags hook (2 commits)
- **22-page-flag-expansion:** All 3 verification blockers resolved post-execution (surveys page stub, test path, competition href)
- **23-competitions-resources-01:** Complete — Competition model, API routes, admin pages.
- **23-competitions-resources-02:** Complete — Resource model with file attachments, visibility scoping, admin CRUD.
- **23-competitions-resources-03:** Complete — Public /resources page rewritten to use Resource API, migration script created, RESOURCES removed from ContentCategory enum.
- **23-competitions-resources-04:** Complete — Gap closure: unauthenticated competition API, status selector UI, resource edit Drizzle query (3 commits).
- **24-dashboard-enhancement-02:** Complete — Group membership moderation API + GroupModerationWidget (2 commits).
- **24-dashboard-enhancement-03:** Complete — Widget state persistence wired to zustand store, reset-to-defaults added (2 commits).
- **24-dashboard-enhancement-01:** Complete — Surveys tab, SurveysWidget, responses API, results page (3 commits).
- **25-gap-closure-02:** Complete — Onboarding setting upserts wrapped in db.transaction, ModerationQueueWidget deprecated in favor of GroupModerationWidget (2 commits).
- **25-gap-closure-01:** Complete — Platform admin auth guards on tenant CRUD routes, MobileMenu role case-sensitivity fix (2 commits).
- **25-gap-closure-02:** Complete — Onboarding setting upserts wrapped in db.transaction, ModerationQueueWidget deprecated in favor of GroupModerationWidget (2 commits).
- **25-gap-closure-03:** Complete — Resource, Competition, and Platform Admin API test suites (41 tests across 3 files).
- [Phase 26-navigation-alignment]: PageSettingsWidget imports canonical PlatformPageFlags type instead of local duplicate
- [Phase 26-navigation-alignment]: AdminQuickLinksWidget uses ADMIN_ITEMS from navigation-config with adminLabelKey i18n
- [Phase 26-navigation-alignment]: headerEngagementFocus radio placed before page toggles for visual prominence
- **26-navigation-alignment-01:** Complete — navigation-config.ts single source of truth + headerEngagementFocus flag (2 commits)
- **26-navigation-alignment-02:** Complete — Header, MobileMenu, SideDrawer, Footer all aligned to navigation-config (2 commits)
- **26-navigation-alignment-03:** Complete — headerEngagementFocus admin selector, dead constants removed, 28 nav tests (2 commits)
- [Phase 11-announcements-01]: Priority is structural not cosmetic — validatePriorityForRole() downgrades with warning in response
- [Phase 11-announcements-01]: Notification type includes priority suffix (announcement-urgent, announcement-high) for future R4 acknowledgement
- [Phase 11-announcements-01]: Fanout capped at 500 users with TODO for queue-based processing
- [Phase 11-announcements-01]: FUTURE comment on Notification table for requiresAck/ackedAt — no blocking constraints
- [Phase 27-tenant-config-and-gaps-01]: Facility type changed from union to string — Prisma already had `facility String`, no migration needed
- [Phase 27-tenant-config-and-gaps-01]: Preset catalog pattern — PRESET_FACILITIES (15) + PRESET_CATEGORIES (14) for onboarding; DEFAULT_FACILITIES (5) + DEFAULT_CATEGORIES (8) for backward compat
- [Phase 27-tenant-config-and-gaps-01]: Settings keys `booking_facilities` and `maintenance_categories` stored as JSON arrays of {value, label}
- [Phase 27-tenant-config-and-gaps-01]: Onboarding wizard expanded from 5→7 steps (Branding→Modules→Facilities→Maintenance→Pages→Invite→Launch)
- [Phase 27-tenant-config-and-gaps-02]: Assist scope guard applied only to write operations (POST/PATCH/DELETE) — GET routes intentionally unguarded
- [Phase 27-tenant-config-and-gaps-02]: Widget auto-save uses 500ms debounce via subscribeWidgetAutoSave subscription pattern
- [Phase 27-tenant-config-and-gaps-02]: Server-wins-on-conflict pattern for widget hydration — DB layout overrides localStorage on mount
- [Phase 27-tenant-config-and-gaps-02]: Migration script kept as .DONE.ts (not deleted) — idempotent, historical reference
- [Phase 28-proxy-consolidation-01]: Export name must be 'middleware' for Next.js 15.5 — 'proxy' is Next.js 16+ only
- [Phase 28-proxy-consolidation-01]: Root proxy.ts deleted entirely — not kept as re-export to avoid confusion
- [Phase 28-proxy-consolidation-01]: Debug console.log removed from production middleware
- [Phase 29-dashboard-defaults-01]: 'manager' is not a valid WidgetManifest permissions role — mapped to ['admin', 'board']
- [Phase 29-dashboard-defaults-01]: MaintenanceList is a named export (not default) — lazy() uses .then(m => ({ default: m.MaintenanceList }))
- [Phase 29-dashboard-defaults-01]: announcements-stream was also missing from dashboard-config.ts — added with page.news feature key
- [Phase 29-dashboard-defaults-02]: default-layouts.ts moved from @widgets/dashboard/model to @entities/widget/model to avoid circular dependency
- [Phase 29-dashboard-defaults-02]: resetToRoleDefaults takes both role and userId parameters for single-call persist flow
- [Phase 29-dashboard-defaults-02]: DEFAULT_TABS.defaultWidgets retained on interface but no longer used as widget fallback source
- [Phase 30-dashboard-phase-b Q1]: Mobile slots — 5 spaces: Home, Services (merges Maintenance), Community, Messages, Admin
- [Phase 30-dashboard-phase-b Q2]: Hybrid module gating — core spaces (Home, Messages, Admin) always visible; optional spaces (Services, Community) auto-hide when all their feature flags are disabled
- [Phase 30-dashboard-phase-b Q3]: My Home — full consolidation of property details, household members, and profile management in one Home space
- [Phase 30-dashboard-phase-b Q4]: Announcements — absorbed into Messages space as broadcast message type; admin UI at /dashboard/messages/announcements
- [Phase 30-dashboard-phase-b Q5]: Feature flag rollout — NEXT_PUBLIC_FOCUS_SPACES builds alongside existing tabs, toggle with flag, remove tabs later
- [Phase 30-01]: WidgetManifest.spaces changed from optional to required — forces explicit space assignment
- [Phase 30-02]: Tab-to-space mapping: overview→home, maintenance→services, bookings→services, services→services, content→community, premium→community
- [Phase 30-02]: Widget store persist version bumped to 4 (triggers re-hydration for migration)
- [Phase 30-03]: Multi-space widgets allowed — notifications→[home,messages], events→[services,community], etc.
- [Phase 30-04]: 9 admin domains in sub-launcher: users, maintenance, content, events, competitions, resources, surveys, announcements, system
- [Phase 30-05]: MobileSpaceBar md:hidden + SpaceLauncher hidden md:flex — no overlap
- [Phase 30-05]: Better Auth additionalFields now includes role (defaultValue: 'RESIDENT', input: false) — fixes client-side role access
- [Phase 30-05]: i18n spaces.\* keys added to all 4 locale files (en, af, xh, zu) in common namespace
- [Phase 30-05]: /api/bookings date=today normalized to ISO date string before Date constructor
- [Phase 30-05]: HomeLayer uses /api/messages/unread endpoint (not /api/messages?unread=true)
- **30-01:** Complete — SpaceDefinition + SPACES registry + getVisibleSpaces + SpaceLauncher sidebar + dynamic route pages (2 commits)
- **30-02:** Complete — HomeLayer three-zone + feature flag toggle + tab→space migration map + widget store v4 (2 commits)
- **30-03:** Complete — Widget manifest spaces field (required) + SpaceLayout + AddWidgetModal filtering (2 commits)
- **30-04:** Complete — Admin sub-launcher + MyHomeSpace + announcements in Messages + NAV_REGISTRY (2 commits)
- **30-05:** Complete — MobileSpaceBar + responsive layout + 5 checkpoint bug fixes (2 commits)
- **32-01:** Complete — UsersListSection 1,431→462 lines, 13 new files, ModalOverlay shared primitive, backward-compat re-export shim (1 commit)
- **32-01:** Complete — UsersListSection 1,431→462 lines, 13 new files, ModalOverlay shared primitive, backward-compat re-export shim
- [Phase 32-users-list-refactor]: AdminUser/SeatInfo/Invitation types extracted to @entities/user/model/types
- [Phase 32-users-list-refactor]: resolveAddress/resolveType/resolveSeatInfo extracted to lib/resolve-user-helpers
- [Phase 32-users-list-refactor]: ModalOverlay shared primitive replaces 5 duplicate overlay patterns
- [Phase 32-users-list-refactor]: Old UsersListSection.tsx path preserved via re-export shim
- [Phase 33-user-suspension]: platformSuspension table already exists — no schema migration needed
- [Phase 33-user-suspension]: Dedicated POST /api/users/[id]/suspend and /unsuspend routes (not PATCH) for atomic operations in transactions
- [Phase 33-user-suspension]: Suspension auth check via requireNotSuspended() helper — separate from getSessionAndRole() to avoid breaking existing callers
- [Phase 33-user-suspension]: 4 duration presets (2 days, 1 week, 30 days, permanent) with end date calculation on the frontend
- [Phase 33-user-suspension]: i18n-only frontend check — no Middleware interception for MVP; API-level enforcement via requireNotSuspended()
- [Phase 33-user-suspension-01]: Auto-unsuspension on API request — timed suspensions expire on next request, no cron job needed
- [Phase 33-user-suspension-01]: requireNotSuspended() as separate helper — independent or integrated into getSessionAndRole()
- [Phase 33-user-suspension-01]: throwIfSuspended() convenience guard returns 403 NextResponse for clean early-return pattern
- [Phase 33-user-suspension-01]: Drizzle transactions for atomic suspend/unsuspend — both operations succeed or fail together
- [Phase 35-api-alignment]: 20 gaps (G1–G20) identified across P0/P1/P2 severity — P0 gaps block all downstream work
- [Phase 35-api-alignment]: Response envelope: apiSuccess(data) + apiError(code, status, message) — replaces all NextResponse.json() in governed routes
- [Phase 35-api-alignment]: Error code taxonomy: VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED, FORBIDDEN, CONFLICT, TENANT_REQUIRED, SUSPENDED, RATE_LIMITED, INTERNAL_ERROR, NOT_IMPLEMENTED
- [Phase 35-api-alignment]: tRPC migration: only identity module (12 procedures) currently uses tRPC — 85+ REST routes to migrate iteratively
- [Phase 35-api-alignment]: trpc-openapi will replace hand-written /api/openapi.json — install from npm
- [Phase 35-api-alignment]: Rate limiting: in-memory Map for now (single-instance), Redis upgrade flagged for multi-instance
- [Phase 35-api-alignment]: Request IDs: middleware-set x-request-id header with crypto.randomUUID() fallback
- [Phase 35-api-alignment]: All v1 canonical routes initially re-export from flat routes to keep logic DRY during transition

## Performance Metrics

| Phase                                  | Plan   | Duration | Tasks    | Files |
| -------------------------------------- | ------ | -------- | -------- | ----- |
| Phase 33 P01                           | 11min  | 4 tasks  | 6 files  |
| Phase 33 P02                           | 1min   | 3 tasks  | 8 files  |
| Phase 35 (Planning)                    | —      | 20 gaps  | 11 files |
| Phase 35 P01                           | 22min  | 3 tasks  | 87 files |
| Phase 35 PA01                          | 22min  | 3 tasks  | 87 files |
| Phase 35-api-alignment PB01            | 47m    | 2 tasks  | 6 files  |
| Phase 35-api-alignment PB02            | 279s   | 2 tasks  | 4 files  |
| Phase 35-api-alignment PC01            | 12min  | 2 tasks  | 17 files |
| Phase 35-api-alignment PC02            | 532    | 2 tasks  | 19 files |
| Phase 35-api-alignment PD02            | 12min  | 2 tasks  | 10 files |
| Phase 35-api-alignment PD01            | 348    | 2 tasks  | 8 files  |
| Phase 35-api-alignment PE01            | 12m    | 2 tasks  | 19 files |
| Phase 35-api-alignment PF01            | 8m 51s | 2 tasks  | 7 files  |
| Phase 35-api-alignment PF02            | 1054   | 2 tasks  | 28 files |
| Phase 37-admin-route-consolidation P01 | 10min  | 3 tasks  | 22 files |
| Phase 38 P02                           | 51min  | 2 tasks  | 3 files  |
| Phase 38 P03                           | 76min  | 2 tasks  | 3 files  |
| Phase 38 P04                           | 37min  | 2 tasks  | 4 files  |
| Phase 39 P01                           | ~15min | 3 tasks  | 8 files  |
| Phase 39 P02                           | ~20min | 3 tasks  | 2 files  |
| Phase 39 P03                           | ~15min | 2 tasks  | 4 files  |
| Phase 39 P04                           | ~25min | 2 tasks  | 3 files  |
| Phase 40 P03                           | 88     | 3 tasks  | 4 files  |
| Phase 40 P04                           | 259min | 3 tasks  | 5 files  |
| Phase 36 P01                           | 9min   | 2 tasks  | 11 files |
| Phase 36-survey-builder P02            | 11min  | 3 tasks  | 7 files  |
| Phase 31 P02                           | 281m   | 2 tasks  | 8 files  |
| Phase 31 P03                           | 12min  | 2 tasks  | 4 files  |

## A01 Execution Decisions

- [Phase 35-A01]: apiPaginated hasMore uses page\*pageSize < total (not <=)
- [Phase 35-A01]: apiNoContent returns new NextResponse(null, { status: 204 })
- [Phase 35-A01]: Unused NextResponse import removed from 67 files post-conversion
- [Phase 35-A01]: CONFLICT(409)/GONE(410) use apiError('VALIDATION_ERROR', msg, status) — no canonical codes exist yet
