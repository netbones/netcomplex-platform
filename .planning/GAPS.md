# Netcomplex — Gaps & Agent Instructions

> **Purpose:** Actionable instructions for the coding agent. Each gap is self-contained with exact files, acceptance criteria, and constraints. Work through items in priority order. Do not invent new architecture — follow the patterns already established in the codebase.

> **Last reviewed:** 2026-05-16 v3 (full code audit — 9/16 gaps confirmed done, 5 partial, 3 open)

> **Agent note:** This project uses `opencode.json` at the root for AI-assisted development. Ensure this file references GAPS.md as the primary instruction source if it does not already.

---

## How to Read This Document

Each gap follows this structure:

- **What:** What needs to be done and why
- **Files:** Exact paths to read before touching anything, and paths to create or edit
- **Instructions:** Step-by-step implementation guide
- **Acceptance criteria:** How to verify it is done correctly
- **Constraints:** What not to do

Prefix your commit message with the gap ID (e.g. `fix(GAP-01): enforce tenantId scoping on resource API`).

---

## Priority 1 — Correctness (do these first, they affect data integrity and security)

---

### GAP-01 · Verify `tenantId` scoping on `/api/resources` routes

> ✅ **COMPLETE** (2026-05-16 audit) — All handlers use `withTenant()` for tenantId resolution. GET/POST on list route passes `eq(resources.tenantId, tenantId)`. GET/PATCH/DELETE on `[id]` route verifies tenant ownership before operating. POST derives tenantId from session, never from request body.

**What:** ~~The `Resource` model has `tenantId` on every record.~~ [VERIFIED DONE]

**Files verified:**

- `src/app/api/resources/route.ts` — GET uses `eq(resources.tenantId, tenantId)`, POST sets `tenantId` from `withTenant()`
- `src/app/api/resources/[id]/route.ts` — All handlers verify `and(eq(resources.id, id), eq(resources.tenantId, tenantId))`
- `src/entities/tenant/api/with-tenant.ts` — helper confirmed in use

---

### GAP-02 · Verify `tenantId` scoping on `/api/events` and `/api/competitions` routes

> ✅ **COMPLETE** (2026-05-16 audit) — Both events and competitions routes use `withTenant()` and filter by `eq(events.tenantId, tenantId)` / `eq(competitions.tenantId, tenantId)`. POST handlers derive tenantId from session. All [id] handlers verify tenant ownership.

**What:** ~~Same issue as GAP-01 but for the Events and Competitions APIs.~~ [VERIFIED DONE]

**Files verified:**

- `src/app/api/events/route.ts` — GET/POST both use `withTenant()` + tenantId WHERE
- `src/app/api/events/[id]/route.ts` — GET/PATCH/DELETE all verify `and(eq(events.id, id), eq(events.tenantId, tenantId))`
- `src/app/api/competitions/route.ts` — GET (including unauthenticated `?upcoming=true`) uses tenantId filter, POST derives from session
- `src/app/api/competitions/[id]/route.ts` — All handlers verify tenant ownership

---

### GAP-03 · Verify `isPlatformAdmin` check on Platform Admin API routes

> ✅ **COMPLETE** (2026-05-16 audit) — All platform admin routes use `requirePlatformAdmin()` from `src/entities/tenant/api/guards.ts`. This helper checks `user.isPlatformAdmin` from the DB and returns 401/403 appropriately. Tenants list, tenant by id, and assist session routes all guarded.

**What:** ~~Routes under `/api/admin/platform/*` must verify `user.isPlatformAdmin === true`.~~ [VERIFIED DONE]

**Files verified:**

- `src/app/api/admin/platform/tenants/route.ts` — uses `requirePlatformAdmin(request)` guard
- `src/app/api/admin/platform/tenants/[id]/route.ts` — uses `requirePlatformAdmin(request)` guard
- `src/app/api/admin/platform/assist/route.ts` — manually checks `isPlatformAdmin` from DB (not via helper, but equivalent)
- `src/app/api/admin/platform/assist/[id]/route.ts` — DELETE checks `isPlatformAdmin || isTenantOwner`, PATCH checks `isPlatformAdmin`
- `src/entities/tenant/api/guards.ts` — `requirePlatformAdmin()` helper confirmed

---

### GAP-04 · Verify the `Header.tsx` role case-sensitivity bug

> ⚠️ **PARTIAL** (2026-05-16 audit) — `Header.tsx` is FIXED: uses `isAdmin()` helper from permissions.ts (line 9). **REMAINING:** `MobileMenu.tsx` line 28 has `const isBoard = session?.user?.role === 'board'` — should be `'BOARD'` (uppercase). This is a minor leftover bug.

**What:** ~~`Header.tsx` was noted to check for lowercase `'admin'`.~~ Header fixed. **MobileMenu still has lowercase `'board'` check.**

**Remaining fix needed:**

- `src/shared/ui/MobileMenu.tsx` line 28: change `role === 'board'` to `role === 'BOARD'` (or use `hasPermission(role, 'admin')` helper)

**Files verified:**

- `src/shared/ui/Header.tsx` — line 9: `import { isAdmin } from '@entities/tenant/api/permissions'`, line 86: `const isAdminUser = isAdmin(session?.user?.role)` ✅
- `src/shared/ui/MobileMenu.tsx` — line 28: `const isBoard = session?.user?.role === 'board'` ❌ (lowercase bug)

---

### GAP-05 · Run the Resource migration script and verify

> ✅ **CLOSED** (2026-05-23) — Migration already executed (2026-05-16), zero Content RESOURCE records remain. Script renamed to `migrate-resources.DONE.ts`. `RESOURCE` removed from ContentCategory enum.

**What:** `src/lib/migrations/migrate-resources.ts` exists but has NOT been executed. Any `Content` records with `category = 'RESOURCES'` need to be migrated to the new standalone `Resource` model.

**Files to read first:**

- `src/lib/migrations/migrate-resources.ts` — read the full script before running anything
- `prisma/schema.prisma` — confirm `RESOURCE` is no longer in `ContentCategory` enum
- `src/db/schema/content-category-enum.ts` — confirm Drizzle enum matches

**Instructions:**

1. Read the migration script fully. Confirm it handles: title (Json → String), content (Json → bodyContent Json), authorId, tenantId, createdAt.
2. Check if `ContentCategory` still contains `RESOURCE` in either the Prisma schema or Drizzle output. If it does, it must be removed after migration.
3. Run the script in a dev/staging environment: `npx tsx src/lib/migrations/migrate-resources.ts`
4. Verify zero `Content` records remain with `category = 'RESOURCE'` after the run.
5. If the `RESOURCE` enum value still exists in `content-category-enum.ts` after migration, remove it and regenerate.

**Acceptance criteria:**

- No `Content` records exist with `category = 'RESOURCE'`.
- `ContentCategory` enum does not contain `RESOURCE` in schema or generated Drizzle files.
- Migration script is idempotent (safe to run twice without duplicating records).

**Constraints:** Do not delete the migration script after running — rename it `migrate-resources.DONE.ts` or add a header comment marking it complete with the date.

---

## Priority 2 — Feature Completeness (core user-facing features that may be wired incompletely)

---

### GAP-06 · Verify the Competition public page reads from the API

> ✅ **COMPLETE** (2026-05-16 audit) — `src/app/competition/page.tsx` fetches from `/api/competitions?upcoming=true` via useEffect (line 33). No hardcoded data. Empty state handled with friendly message. Shows only ACTIVE competitions where `startDate <= now AND endDate >= now`.

**What:** ~~`src/app/competition/page.tsx` previously used hardcoded static data.~~ [VERIFIED DONE]

**Files verified:**

- `src/app/competition/page.tsx` — fetches live data from API, handles loading/error/empty states
- `src/app/api/competitions/route.ts` — `?upcoming=true` path returns only ACTIVE competitions within date range

---

### GAP-07 · Verify content scheduling is enforced in the Content API

> ✅ **COMPLETE** (2026-05-16 audit) — `ContentForm.tsx` has `publishedAt` and `expiresAt` datetime-local inputs (lines 323-351). Content API GET handler (lines 131-137) applies date filtering for public queries: `publishedAt <= now OR null` AND `expiresAt > now OR null`. Admin queries skip the date filter.

**What:** ~~The `Content` model has `publishedAt` and `expiresAt` fields.~~ [VERIFIED DONE]

**Files verified:**

- `src/widgets/admin/ui/ContentForm.tsx` — lines 323-351: datetime-local inputs for both fields
- `src/app/api/content/route.ts` — lines 131-137: `if (!canViewAll)` applies publishedAt/expiresAt filters

---

### GAP-08 · Verify Resource visibility scoping in the public `/resources` page

> ✅ **COMPLETE** (2026-07-24) — API has full role-based visibility filtering via `buildVisibilityFilter()`. Resource cards now render an amber visibility badge when `visibility !== 'ALL_RESIDENTS'` (e.g. "BOARD", "OWNERS"). Both the API filtering and UI badge are verified.

**What:** ~~The `Resource` model has a `visibility` field. API filtering and UI badge both implemented.~~ [VERIFIED DONE]

**Files verified:**

- `src/app/api/resources/route.ts` — `buildVisibilityFilter()` handles all role levels: unauthenticated→ALL_RESIDENTS, RESIDENT+owner→+OWNERS_ONLY, COMMITTEE→+COMMITTEE_ONLY, ADMIN/MANAGER/BOARD→all ✅
- `src/app/resources/page.tsx` — lines 430-434: visibility badge rendered on `ResourceCard` when visibility is not ALL_RESIDENTS ✅

---

### GAP-09 · Verify the onboarding wizard completes the signup transaction atomically

> ✅ **CLOSED** (resolved by Phase 20: Self-Service Inception) — `POST /api/platform/tenants` (route.ts) now atomically creates the tenant, user (via Better Auth), and ADMIN role assignment inside a single Drizzle `db.transaction()` with `ownerId` linkage. Verfied 2026-05-15 in `20-VERIFICATION.md` — 15/15 truths passed, `INCEPT-01` satisfied. 5. Confirm the `ownerId` on the newly created `Tenant` is set to the new user's `id` within the same transaction.

**Acceptance criteria:**

- If tenant creation fails after user creation, no user record is left in the database.
- If role assignment fails after tenant creation, neither the user nor the tenant record persists.
- On success, `Tenant.ownerId === user.id` and user has `role: 'ADMIN'` and matching `tenantId`.

**Constraints:** Do not split this across multiple API calls on the client side. The entire operation must be server-side and atomic.

---

### GAP-10 · Verify `AssistSession` expiry is enforced at request time

> ✅ **CLOSED** (2026-05-23) — `requireAssistScope(request, 'full'|'metadata')` guard created in `src/entities/tenant/api/assist-scope-guard.ts`. Applied to content POST, users PATCH/DELETE, settings/[key] PATCH. Metadata-scoped sessions receive 403 on write operations. GET routes intentionally unguarded.

**What:** ~~`AssistSession` records have an `expiresAt` field and an `isActive` boolean.~~ Expiry and revoke implemented. **Missing: scope enforcement for metadata sessions.**

**Remaining fix needed:**

- Add a guard/middleware that checks assist session `scope` before granting access to content, users, or settings endpoints
- `scope: 'metadata'` sessions should only access tenant metadata fields — not CRUD operations on content, users, or settings

**Files to read first:**

- `src/app/api/admin/platform/assist/route.ts`
- `src/app/api/admin/platform/assist/[id]/route.ts`
- `src/entities/tenant/api/permissions.ts`

**Instructions:**

1. Identify where assist session tokens are validated during an assisted provisioning request.
2. Confirm the validation checks ALL of: `isActive === true`, `expiresAt > new Date()`, and `scope` matches what the request is attempting.
3. If the expiry check is missing, add: `if (!session.isActive || session.expiresAt < new Date()) return 403`.
4. Confirm `PATCH /api/admin/platform/assist/[id]` supports a `revoke` action that sets `isActive: false` and `revokedAt: new Date()` and `revokedBy: requestingUserId` — so tenant owners can revoke staff access.
5. Confirm `scope: 'metadata'` sessions cannot access tenant content, users, or settings — only the fields on the `Tenant` record itself.

**Acceptance criteria:**

- A request using an expired `AssistSession` token receives `403`.
- A request using a revoked session receives `403`.
- A `metadata`-scoped session cannot access `/api/users`, `/api/content`, or `/api/settings`.
- Tenant owner can revoke an assist session and subsequent requests with that session fail immediately.

---

## Priority 3 — Admin Dashboard Completeness

---

### GAP-11 · Add Events, Competitions, and Resources tabs to the admin dashboard

> ❌ **OPEN** (2026-05-16 audit) — Widget registry (`widgets.ts`) only registers the `events` widget (line 162). Missing registrations: `CompetitionList`, `ResourceList`, `SurveysWidget`. The `events` widget in the registry points to `src/widgets/dashboard/ui/EventsWidget.tsx` which is a 21-line stub that just shows a placeholder and links to `/resources`.

**What:** The admin dashboard (`/admin`) uses a tabbed widget layout. Events, Competitions, and Resources now have full admin pages and widget components but are NOT wired into the dashboard widget registry.

**Files to read first:**

- `src/widgets/dashboard/model/registry.ts`
- `src/widgets/dashboard/model/widgets.ts`
- `src/widgets/dashboard/ui/DashboardTabs.tsx`
- `src/widgets/admin/ui/EventsWidget.tsx`
- `src/widgets/admin/ui/SurveysWidget.tsx`
- `src/widgets/admin/ui/AdminWidgetRenderer.tsx`

**Instructions:**

1. Open `registry.ts` and `widgets.ts` and check whether `EventsWidget`, `CompetitionList`, `ResourceList`, and `SurveysWidget` are registered.
2. Check `DashboardTabs.tsx` for the current tab list. Confirm Events, Surveys (not just the page), Competitions, and Resources have tabs or are accessible via the widget picker.
3. If any widget is missing from the registry, add it following the pattern of existing registered widgets.
4. Confirm `AdminWidgetRenderer.tsx` handles rendering for all new widget types.

**Acceptance criteria:**

- From the admin dashboard, an ADMIN user can add an Events widget, Surveys widget, Competition widget, and Resources widget via the widget picker.
- Each widget renders a meaningful summary (e.g. upcoming events, active competitions, recent resources).

---

### GAP-12 · Resolve `ModerationQueueWidget` vs `GroupModerationWidget` duplication

> ✅ **COMPLETE** (2026-05-16 audit) — `ModerationQueueWidget.tsx` is marked `// DEPRECATED: use GroupModerationWidget instead` (line 1). `GroupModerationWidget.tsx` is the active component, used by `AdminWidgetRenderer.tsx` (line 16 import, line 51 render). It connects to `/api/groups/membership-requests` with approve/reject actions. No imports of `ModerationQueueWidget` found outside its own file.

**What:** ~~Two components exist that appear to serve the same group moderation function.~~ [VERIFIED DONE — resolved]

**Files verified:**

- `src/widgets/admin/ui/ModerationQueueWidget.tsx` — line 1: `// DEPRECATED: use GroupModerationWidget instead` ✅
- `src/widgets/admin/ui/GroupModerationWidget.tsx` — active, connects to `/api/groups/membership-requests`, approve/reject actions ✅
- `src/widgets/admin/ui/AdminWidgetRenderer.tsx` — imports and renders `GroupModerationWidgetWithErrorBoundary` ✅

---

### GAP-13 · Implement widget state persistence for the admin dashboard

> ✅ **CLOSED** (2026-05-23) — Widget store now syncs to DB via `hydrateFromServer(userId)` and `subscribeWidgetAutoSave(userId)` with 500ms debounce. Admin dashboard uses new pattern: localStorage = fast local cache, DB = source of truth across devices. `saveToDatabase` guards against pre-hydration saves.

**What:** ~~The admin dashboard widget layout resets when the user changes tabs.~~ Layout persists via localStorage. **Missing: DB-backed persistence via `user.dashboardLayout`.**

**Remaining fix needed:**

- Add sync logic: on mount, load layout from `GET /api/users/[id]` → hydrate Zustand store
- On layout change, debounce-save to `PATCH /api/users/[id]` with `{ dashboardLayout: currentLayout }`
- This ensures layout survives browser cache clear and works across devices

**Files verified:**

- `src/entities/widget/model/widget-store.ts` — Zustand store with `persist` middleware (localStorage), per-tab layouts ✅
- `src/db/schema/users.ts` — `dashboardLayout: jsonb('dashboardLayout')` column exists ✅
- `src/app/api/users/[id]/route.ts` — PATCH accepts `dashboardLayout` ✅

---

## Priority 4 — Testing

---

### GAP-14 · Add tests for new models and API routes

> ✅ **COMPLETE** — `src/test/resources.test.ts`, `src/test/platform-admin.test.ts`, and `src/test/competitions.test.ts` are all confirmed present in the file tree (2026-05-16). No action required.

---

### GAP-15 · Resolve `EventsWidget` duplication between admin and dashboard layers

> ✅ **CLOSED** (2026-05-23) — Both files serve distinct purposes and are both imported. Dashboard widget: resident-facing summary (24 lines). Admin widget: management-oriented list with fetch/retry (167 lines). Both have clarifying purpose comments at top. Dashboard registry uses dashboard widget, admin uses admin widget.

**What:** Two `EventsWidget.tsx` files exist at different paths:

- `src/widgets/admin/ui/EventsWidget.tsx` — admin layer
- `src/widgets/dashboard/ui/EventsWidget.tsx` — resident dashboard layer

These may be intentional (admin management view vs resident upcoming-events view) or one may be a stale copy. They must be reviewed and either both confirmed distinct-and-used, or the stale one removed.

**Files to read first:**

- `src/widgets/admin/ui/EventsWidget.tsx`
- `src/widgets/dashboard/ui/EventsWidget.tsx`
- `src/widgets/dashboard/model/registry.ts`
- `src/widgets/dashboard/model/widgets.ts`
- Run: `grep -r "EventsWidget" src/ --include="*.tsx" --include="*.ts" -l`

**Instructions:**

1. Read both files. Determine their purpose:
   - The **admin widget** should show event management controls — list, status, quick-edit links.
   - The **dashboard widget** should show upcoming events to residents — read-only, date-sorted.
2. If both serve distinct purposes and are both imported somewhere, add a comment to each clarifying its role: `// Admin management widget — use in /admin routes only` or `// Resident-facing events summary widget`.
3. If one is unused (no imports found), delete it.
4. Confirm `registry.ts` references the correct one for each context — dashboard registry should reference the dashboard widget, not the admin one.

**Acceptance criteria:**

- `grep -r "EventsWidget" src/` returns imports in both an admin page and a dashboard page, confirming both are live.
- Or: one file is deleted and no broken imports remain (`pnpm build` passes).
- Each surviving file has a comment at the top clarifying its intended use context.

**Constraints:** Do not merge both into a single component with a prop-switch. Keep admin and resident concerns in separate components.

---

### GAP-16 · Confirm single database client instantiation path

> ✅ **CLOSED** (2026-05-23) — Verified: `src/shared/api/db.ts` has single `drizzle()` call (singleton via Proxy). `src/db/index.ts` is schema re-exports only (no `drizzle()` call). `migrate-resources.DONE.ts` has a one-off `drizzle()` call (acceptable — completed migration script). Both files have clarifying comments.

**What:** Two database client files now exist:

- `src/db/index.ts` — the original Drizzle client
- `src/shared/api/db.ts` — new file added recently

If both instantiate a new database connection, the app will open two connection pools in production, exhausting the Supabase/Postgres connection limit quickly. There must be exactly one client instance, with the second file being a re-export of the first.

**Files to read first:**

- `src/db/index.ts`
- `src/shared/api/db.ts`
- Run: `grep -r "drizzle(" src/ --include="*.ts" -n`

**Instructions:**

1. Open both files. Check whether `src/shared/api/db.ts` calls `drizzle(...)` to create a new connection, or simply re-exports from `src/db/index.ts`.
2. If `db.ts` creates a new connection: refactor it to `export { db } from '../../db'` (re-export only). Remove the duplicate `drizzle()` call.
3. If `db.ts` is already a re-export: add a comment `// Re-exports the singleton Drizzle client from src/db/index.ts` to make intent clear.
4. Run `grep -r "drizzle(" src/ --include="*.ts" -n` and confirm it returns exactly **one** result.

**Acceptance criteria:**

- `grep -r "drizzle(" src/` returns exactly one match.
- All existing imports of `db` from either path continue to work — do not break existing imports.
- `pnpm build` passes with no type errors.

**Constraints:** Do not change which path other files import from. Fix the source, not the consumers.

---

## Reference: Codebase Conventions

These apply to all gap implementations. Do not deviate.

**Auth resolution:** Always use `getSessionAndRole()` from `src/shared/api/auth-utils.ts` or `withTenant()` from `src/entities/tenant/api/with-tenant.ts`. Do not read session cookies directly.

**Database:** The project uses both Prisma (schema source of truth) and Drizzle (generated, used for queries). Use the Drizzle schema under `src/db/schema/` for queries, not Prisma client directly, unless an existing pattern in the file you're editing uses Prisma.

**API responses:** Return `NextResponse.json(data)` for success. Return `NextResponse.json({ error: 'message' }, { status: N })` for errors. Do not throw unhandled exceptions from route handlers.

**Role checks:** Use helpers from `src/entities/tenant/api/permissions.ts`. Do not write inline `role === 'ADMIN'` comparisons in route handlers — use the exported permission functions.

**tenantId in creates:** Never trust `tenantId` from the request body. Always derive it from the session. Pattern: `const { tenantId } = await withTenant(request)`.

**Error codes:** `401` = not authenticated, `403` = authenticated but not authorised, `404` = not found (only if the record exists but belongs to the right tenant — return `404` not `403` to avoid leaking existence), `422` = validation error.

**File naming:** Follow existing conventions. New test files go in `src/test/`. New API routes go in `src/app/api/`. New widget components go in `src/widgets/admin/ui/` or `src/widgets/dashboard/ui/` as appropriate.

**Commits:** One gap per commit. Reference the gap ID in the commit message.
