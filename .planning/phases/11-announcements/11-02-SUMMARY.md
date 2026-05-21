---
phase: 11-announcements
plan: 02
subsystem: ui
tags: [react, tailwind, widgets, announcements, priority-taxonomy, zod, forms]

# Dependency graph
requires:
  - phase: 11-announcements
    plan: 01
    provides: Announcement API routes, priority taxonomy module, permission helpers, Zod schema, types
provides:
  - Admin CRUD page at /admin/announcements with role-gated priority form
  - AnnouncementsStreamWidget for dashboard and /news page embed
  - AdminAnnouncementsWidget for admin dashboard compact list
  - Widget registry entries for both widgets
  - /news page announcements section with #announcements anchor
affects: [dashboard, widgets, news-page, admin-ui]

# Tech tracking
tech-stack:
  added: []
patterns:
  - 'Role-gated priority dropdown: getAllowedPriorities + PRIORITY_TAXONOMY for form rendering'
  - 'Stream/log pattern for announcements: left-border accent + taxonomy pill + full content'
  - 'Widget registry entry with Megaphone icon from lucide-react'

key-files:
  created:
    - src/features/announcements/ui/AnnouncementForm.tsx
    - src/features/announcements/ui/AnnouncementList.tsx
    - src/features/announcements/model/useAnnouncements.ts
    - src/app/(tenant)/admin/announcements/page.tsx
    - src/widgets/dashboard/ui/AnnouncementsStreamWidget.tsx
    - src/widgets/admin/ui/AdminAnnouncementsWidget.tsx
  modified:
    - src/widgets/dashboard/model/widgets.ts
    - src/widgets/admin/ui/AdminWidgetRenderer.tsx
    - src/app/news/page.tsx

key-decisions:
  - 'AnnouncementForm uses simplified form pattern (no Tiptap, no i18n) matching Phase 21 events pattern'
  - 'Stream widget renders full content (not truncated) per revised instructions'
  - 'AdminAnnouncementsWidget links to /admin/announcements for full management'
  - '/news page embeds stream as section with #announcements anchor — no separate route'
  - 'No new navigation-config.ts entries — discovery through widgets and notifications only'

patterns-established:
  - 'Role-gated form fields: dropdown options restricted via getAllowedPriorities() with taxonomy helper text'
  - 'Stream/log UI pattern: left-border accent + taxonomy pill badge + full content + metadata footer'

requirements-completed: [ANN-04, ANN-05, R1, R7, R8]

# Metrics
duration: 45min
completed: 2026-05-21
---

# Phase 11: Announcements Plan 02 Summary

**Admin CRUD UI with role-gated priority dropdown, announcement stream widget with taxonomy labels, admin management widget, and /news page embed — no new navigation routes**

## Performance

- **Duration:** 45 min
- **Started:** 2026-05-21T07:30:00Z
- **Completed:** 2026-05-21T08:15:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Admin page at /admin/announcements with full CRUD — form with role-gated priority, targeting fields, optional resource link
- AnnouncementForm shows taxonomy definitions as helper text and restricts priority dropdown by user role
- AnnouncementList shows compact items with taxonomy labels, target audience summary, and resource indicators
- AnnouncementsStreamWidget renders stream/log items with priority taxonomy labels and left-border accents
- AdminAnnouncementsWidget shows compact management list with taxonomy labels on admin dashboard
- Both widgets registered in widget registry with Megaphone icon
- /news page embeds announcements stream as section with #announcements anchor for notification fragment links
- No new page routes or navigation entries — discovery through widgets and notification feeds only

## Task Commits

Each task was committed atomically:

1. **Task 1: Admin CRUD UI (form + list + hook + page)** - `e01dd41` (feat)
2. **Task 2: Stream widget + admin widget + /news embed + registry** - `8e6f480` (feat)

## Files Created/Modified

- `src/features/announcements/ui/AnnouncementForm.tsx` - Role-gated priority form with targeting, resource link, taxonomy helper text
- `src/features/announcements/ui/AnnouncementList.tsx` - Compact admin list with taxonomy labels and resource indicators
- `src/features/announcements/model/useAnnouncements.ts` - CRUD hook for announcement API operations
- `src/app/(tenant)/admin/announcements/page.tsx` - Admin page with permission check and form/list layout
- `src/widgets/dashboard/ui/AnnouncementsStreamWidget.tsx` - Stream/log widget fetching active announcements with taxonomy labels
- `src/widgets/admin/ui/AdminAnnouncementsWidget.tsx` - Admin dashboard compact management list
- `src/widgets/dashboard/model/widgets.ts` - Added announcements-stream and admin-announcements registry entries
- `src/widgets/admin/ui/AdminWidgetRenderer.tsx` - Added admin-announcements case
- `src/app/news/page.tsx` - Embedded AnnouncementsStreamWidget as section with #announcements anchor

## Decisions Made

- Used simplified form pattern (no Tiptap, no i18n) matching Phase 21 events — announcements are single-language plain text
- Stream widget renders full content per revised instructions, not truncated
- No new navigation entries — discovery through dashboard widgets and notification feed clicks only
- /news page embed uses Suspense for lazy-loaded stream widget with loading skeleton fallback

## Deviations from Plan

None — plan executed as specified.

## Issues Encountered

- Execution was interrupted after Task 1 commit; Task 2 was completed manually by the orchestrator

## Next Phase Readiness

- Announcements feature complete: schema, API, admin UI, stream widget, /news embed all working
- No new navigation entries to clean up
- Widget registry entries available for dashboard configuration
- Future: requiresAck on Notification (R4/R6) can be added without schema migration issues

## Self-Check: PASSED

All key files verified on disk. Commits verified in git log. No FAILED markers.

---

_Phase: 11-announcements_
_Completed: 2026-05-21_
