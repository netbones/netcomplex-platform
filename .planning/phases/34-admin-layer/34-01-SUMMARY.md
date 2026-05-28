# Phase 34 — Admin Layer — Plan 01 Summary

**Status:** Complete
**Date:** 2026-05-28
**Commit:** `5cba8a1` (Tasks 2–4), `7212947` (Task 1 — urgency + activity APIs)

## What Was Built

### Task 1: Urgency + Activity APIs (previously committed)

- `src/app/api/admin/urgency/route.ts` — Returns `{ commandBar: {...}, domainBadges: {...} }` with counts for open maintenance, pending members, closing surveys, expired announcements, unpublished content, draft competitions
- `src/app/api/admin/activity/route.ts` — Activity feed with domain filtering, cursor-based pagination, cross-tenant for platform admins

### Task 2: AdminCommandBar

- `src/widgets/dashboard/ui/AdminCommandBar.tsx`
- Reactive urgency chips (open maintenance → red, pending members → amber, closing surveys → blue, expired announcements → orange) — only rendered if count > 0
- 6 default creation shortcuts: Invite User, New Announcement, New Event, New Survey, New Competition, Add Resource
- Extensible "Add" popover with checkboxes for 6 additional shortcuts (New Group, New Booking, External Survey, Invite Board Member, New Category, Manage Households)
- Persistent shortcut customisation via `useLocalStorage('admin-shortcuts', [])`
- `adminOnly` flag on shortcuts that require full admin role

### Task 3: AdminActivityStream

- `src/widgets/dashboard/ui/AdminActivityStream.tsx`
- 7 domain filter tabs: All, Users, Maintenance, Content, Events, Surveys, System
- Cursor-based pagination with "Load more" button
- Activity items show: domain-coloured icon, actor name, action description, resource label, metadata, relative timestamp
- Platform admin tenant badge on cross-tenant items
- Skeleton loading state + error state with retry
- Lazy-loaded via `React.lazy()` in AdminLayer

### Task 4: AdminLayer + Routing + Widget Cleanup

- `src/widgets/dashboard/ui/AdminLayer.tsx` — Mirrors HomeLayer architecture:
  1. Fetches `/api/admin/urgency` on mount
  2. Renders AdminCommandBar (reactive CTAs + shortcuts)
  3. Domain grid (2→5 col responsive) with urgency badges from domainBadges
  4. Lazy-loaded AdminActivityStream wrapped in ErrorBoundary + Suspense
- `src/app/(tenant)/dashboard/[space]/page.tsx` — Admin space now renders `<AdminLayer />` instead of `<SpaceLayoutWithErrorBoundary />` + `<AdminSubLauncher />` + `<UsersListSection />`
- `src/entities/widget/model/default-layouts.ts` — Simplified admin space default widgets to just `['admin-stats', 'admin-user']` (activity/quick-links/system/page-settings/announcements absorbed into AdminLayer or moved to domain pages)
- `src/widgets/dashboard/model/spaces.ts` — Removed `admin-activity` and `admin-quick-links` from admin space widgetIds (these widgets still exist in registry for domain pages, just not in the admin space overview)

## Decisions Made

- AdminLayer uses `useLocalStorage` for shortcut persistence (not DB) — fast, no API needed for UX preference
- Admin space no longer shows SpaceLayout widget grid at all — AdminLayer is the full page
- UsersListSection removed from admin space overview (was only there for scroll-to-anchor pattern) — users domain page at `/dashboard/admin/users` is the proper place
- AdminCommandBar default shortcuts are hardcoded (not configurable via settings) — extensible via popover
- Activity stream is lazy-loaded to reduce initial bundle — domain grid + command bar render first

## Files Created

- `src/widgets/dashboard/ui/AdminCommandBar.tsx` (213 lines)
- `src/widgets/dashboard/ui/AdminActivityStream.tsx` (282 lines)
- `src/widgets/dashboard/ui/AdminLayer.tsx` (168 lines)

## Files Modified

- `src/app/(tenant)/dashboard/[space]/page.tsx`
- `src/entities/widget/model/default-layouts.ts`
- `src/widgets/dashboard/model/spaces.ts`
- `src/app/api/admin/urgency/route.ts` (created in prior commit)
- `src/app/api/admin/activity/route.ts` (created in prior commit)

## Verification

- TypeScript: `pnpm exec tsc --noEmit` — zero new errors in modified files
- ESLint + Prettier: passed via pre-commit hook
- Git: pushed to both remotes (GitHub + Codeberg)
