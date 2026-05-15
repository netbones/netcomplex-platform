---
phase: 21-content-events
verified: 2026-05-15T12:00:00Z
reverified: 2026-05-15T12:15:00Z
status: passed
score: 12/12 must-haves verified
gaps:
  - truth: 'TypeScript type check passes for phase 21 code'
    status: resolved
    reason: 'or() in Drizzle returns SQL<unknown> | undefined but whereConditions array expects SQL<unknown>. Type mismatch on lines 82-83 of content/[id]/route.ts.'
    artifacts:
      - path: 'src/app/api/content/[id]/route.ts'
        issue: 'or(isNull(...), lte(...)) returns SQL<unknown> | undefined, incompatible with whereConditions SQL<unknown>[] type'
    missing:
      - 'Add type assertion or restructure query to satisfy strict TypeScript'
    fix: 'Added explicit type assertion `as SQL<unknown>` to or() calls and imported SQL type from drizzle-orm'
    fix_commit: 'cf94486'
human_verification:
  - test: 'Navigate to /admin/events and verify event list renders'
    expected: 'Table shows events with title, date, location, organizer columns and edit/delete actions'
    why_human: 'Requires running dev server with seeded data'
  - test: 'Create a new event via /admin/events/new'
    expected: 'Form validates required fields, submits to API, redirects to /admin/events on success'
    why_human: 'End-to-end flow requires live API and database'
  - test: 'Verify Events tab appears in admin dashboard'
    expected: 'Events tab visible alongside Overview, Maintenance, Users, Content, System, Settings tabs'
    why_human: 'Visual UI verification'
  - test: 'Verify EventsWidget empty state shows Create Event link'
    expected: "When no upcoming events exist, widget shows 'No upcoming events' with 'Create Event' button linking to /admin/events/new"
    why_human: 'Requires clearing events data and checking UI state'
  - test: 'Verify content scheduling filters work for non-admin users'
    expected: 'Non-admin users cannot see content with future publishedAt or past expiresAt'
    why_human: 'Requires testing with different user roles and scheduled content'
---

# Phase 21: Content Events Verification Report

**Phase Goal:** Content scheduling UI, Events CRUD admin pages, Events dashboard tab
**Verified:** 2026-05-15T12:00:00Z
**Re-verified:** 2026-05-15T12:15:00Z
**Status:** passed
**Re-verification:** Yes — gap closure verified

## Goal Achievement

### Observable Truths

| #   | Truth                                                                               | Status     | Evidence                                                                                                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | ContentForm has datetime-local inputs for publishedAt and expiresAt                 | ✓ VERIFIED | Lines 322-352: native `<input type="datetime-local">` for both fields with labels, help text, and setValue handlers                                                                                                            |
| 2   | Form submission converts datetime strings to Date objects                           | ✓ VERIFIED | Lines 147-151: `publishedAt: data.publishedAt ? new Date(data.publishedAt) : null`                                                                                                                                             |
| 3   | GET /api/content filters out not-yet-published and expired content for public users | ✓ VERIFIED | Lines 131-137: `if (!canViewAll)` block adds `or(isNull, lte)` and `or(isNull, gt)` conditions                                                                                                                                 |
| 4   | Admin users see all content regardless of schedule                                  | ✓ VERIFIED | Date filtering only applied when `!canViewAll` (line 131). Admins with 'content' permission bypass                                                                                                                             |
| 5   | POST /api/content accepts publishedAt and expiresAt in request body                 | ✓ VERIFIED | Lines 216-217: `publishedAt: body.publishedAt ? new Date(body.publishedAt) : body.published ? now : null`                                                                                                                      |
| 6   | GET /api/content/[id] returns 404 for non-admin accessing scheduled/expired content | ✓ VERIFIED | Lines 80-84: same date filtering applied; line 113-114: returns 404 if no content found                                                                                                                                        |
| 7   | Events API has GET list, POST create, GET by ID, PATCH update, DELETE               | ✓ VERIFIED | events/route.ts: GET (line 43), POST (line 88). events/[id]/route.ts: GET (line 12), PATCH (line 41), DELETE (line 99)                                                                                                         |
| 8   | EventForm creates and updates events with validation                                | ✓ VERIFIED | 294 lines. Zod schema (adminEventSchema) validates title, description, date, location, organizer. POST/PATCH to /api/events. Delete with confirmation                                                                          |
| 9   | EventList displays events with edit/delete actions                                  | ✓ VERIFIED | 136 lines. Fetches GET /api/events, renders table with Title/Date/Location/Organizer/Actions columns. Edit link + inline delete confirmation                                                                                   |
| 10  | Admin events pages: list, new, edit                                                 | ✓ VERIFIED | /admin/events/page.tsx (EventList + New Event button), /admin/events/new/page.tsx (EventForm), /admin/events/[id]/page.tsx (fetches event, passes to EventForm)                                                                |
| 11  | Dashboard has Events tab with EventsWidget showing up to 5 upcoming events          | ✓ VERIFIED | admin-config.ts: Events tab (line 35-39), admin-events widget (line 60), medium size (line 91). EventsWidget.tsx: fetches `/api/events?limit=5&upcoming=true`, shows title/date/location, empty state with "Create Event" link |
| 12  | TypeScript type check passes                                                        | ✓ VERIFIED | Fixed: Added `as SQL<unknown>` type assertion to or() calls in content/[id]/route.ts (commit cf94486)                                                                                                                          |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact                                      | Expected                                                | Status     | Details                                                                                                                                                                                                      |
| --------------------------------------------- | ------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/widgets/admin/ui/ContentForm.tsx`        | Date pickers for publishedAt/expiresAt                  | ✓ VERIFIED | 463 lines. datetime-local inputs (lines 322-352), Date conversion on submit (lines 147-151), Date→string conversion for edit mode (lines 52-63)                                                              |
| `src/app/api/content/route.ts`                | GET filters by publishedAt/expiresAt for public queries | ✓ VERIFIED | 231 lines. Date filtering in GET (lines 131-137), POST accepts publishedAt/expiresAt (lines 216-217)                                                                                                         |
| `src/app/api/content/[id]/route.ts`           | Date filtering for single content GET                   | ✓ VERIFIED | 212 lines. Date filtering logic correct (lines 80-84). TypeScript type error fixed with explicit `as SQL<unknown>` assertion (commit cf94486). Also handles PATCH with publishedAt/expiresAt (lines 178-186) |
| `src/app/api/events/route.ts`                 | Events CRUD API (GET, POST)                             | ✓ VERIFIED | 135 lines. GET with tenant isolation, upcoming filter, limit support. POST with required field validation, tenant isolation                                                                                  |
| `src/app/api/events/[id]/route.ts`            | Single event CRUD (GET, PATCH, DELETE)                  | ✓ VERIFIED | 137 lines. All three handlers with auth checks, tenant isolation, revalidateContent calls                                                                                                                    |
| `src/widgets/admin/ui/EventForm.tsx`          | Event form with validation                              | ✓ VERIFIED | 294 lines. React Hook Form + Zod, all required fields (title, description, date, location, organizer), create/update/delete, confirmation dialog                                                             |
| `src/widgets/admin/ui/EventList.tsx`          | Event list with edit/delete                             | ✓ VERIFIED | 136 lines. Fetches events, renders table, edit links, inline delete confirmation, empty state                                                                                                                |
| `src/app/(tenant)/admin/events/page.tsx`      | Events list page                                        | ✓ VERIFIED | 24 lines. EventList component, "New Event" button linking to /admin/events/new                                                                                                                               |
| `src/app/(tenant)/admin/events/new/page.tsx`  | New event form page                                     | ✓ VERIFIED | 30 lines. EventForm component, back button to /admin/events                                                                                                                                                  |
| `src/app/(tenant)/admin/events/[id]/page.tsx` | Edit event page                                         | ✓ VERIFIED | 100 lines. Fetches event by ID, passes to EventForm, handles loading/404 states                                                                                                                              |
| `src/entities/admin/model/admin-config.ts`    | Events tab in ADMIN_TABS                                | ✓ VERIFIED | Events tab at line 35-39 (id: 'events', icon: 'fa-calendar', defaultWidgets: ['admin-events', 'admin-quick-links']). admin-events widget at line 60. Size 'medium' at line 91                                |
| `src/widgets/admin/ui/EventsWidget.tsx`       | Dashboard widget for upcoming events                    | ✓ VERIFIED | 163 lines. Fetches `/api/events?limit=5&upcoming=true`, loading skeleton, error state with retry, empty state with "Create Event" link, event list with title/date/location, "View All Events" link          |
| `src/shared/api/schemas.ts`                   | Zod schemas for validation                              | ✓ VERIFIED | contentSchema includes publishedAt/expiresAt (lines 28-29). adminEventSchema validates all event fields (lines 314-329)                                                                                      |
| `src/widgets/dashboard/model/widgets.ts`      | Widget registry entry                                   | ✓ VERIFIED | EventsWidget registered with lazy import (lines 161-174), icon: Calendar, defaultSize 3x2                                                                                                                    |

### Key Link Verification

| From                       | To             | Via                                         | Status  | Details                                                                                                                                             |
| -------------------------- | -------------- | ------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| ContentForm.tsx            | /api/content   | POST includes publishedAt/expiresAt in body | ✓ WIRED | Lines 147-157: body includes `publishedAt: new Date(data.publishedAt)` and `expiresAt: new Date(data.expiresAt)`, sent via fetch POST/PATCH         |
| /api/content/route.ts      | contents table | Drizzle query filtering by dates            | ✓ WIRED | Lines 134-136: `or(isNull(contents.publishedAt), lte(contents.publishedAt, now))` and `or(isNull(contents.expiresAt), gt(contents.expiresAt, now))` |
| /api/content/[id]/route.ts | contents table | Drizzle query filtering by dates            | ✓ WIRED | Lines 82-83: date filtering with type assertions. TypeScript error resolved with `as SQL<unknown>` assertion                                        |
| EventForm.tsx              | /api/events    | POST/PATCH/DELETE via fetch                 | ✓ WIRED | Lines 72-84: POST to /api/events for create, PATCH to /api/events/[id] for update, DELETE for removal                                               |
| EventList.tsx              | /api/events    | GET /api/events on mount                    | ✓ WIRED | Lines 24-34: useEffect fetches /api/events, sets state. Lines 36-42: DELETE on /api/events/[id]                                                     |
| EventsWidget.tsx           | /api/events    | GET /api/events?limit=5&upcoming=true       | ✓ WIRED | Line 35: `fetch('/api/events?limit=5&upcoming=true')`. API supports both params (lines 54-78 of events/route.ts)                                    |
| admin-config.ts            | EventsWidget   | Widget registry via 'admin-events' ID       | ✓ WIRED | admin-config.ts declares 'admin-events' widget. widgets.ts registers EventsWidget with lazy import at line 169                                      |
| admin/events/page.tsx      | EventList.tsx  | Import and render                           | ✓ WIRED | Line 5: `import { EventList }`, line 21: `<EventList />`                                                                                            |
| admin/events/new/page.tsx  | EventForm.tsx  | Import and render                           | ✓ WIRED | Line 5: `import { EventForm }`, line 27: `<EventForm />`                                                                                            |
| admin/events/[id]/page.tsx | EventForm.tsx  | Import with initialData                     | ✓ WIRED | Line 7: `import { EventForm }`, line 97: `<EventForm initialData={initialData} />`                                                                  |

### Requirements Coverage

REQUIREMENTS.md does not exist in `.planning/`. Cannot cross-reference requirement IDs CONTENT-01, CONTENT-02, EVENTS-01, EVENTS-02, EVENTS-03.

Based on plan frontmatter declarations:
| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| CONTENT-01 | 21-01 | Content scheduling UI | ✓ SATISFIED | ContentForm has datetime-local inputs, API enforces date filtering |
| CONTENT-02 | 21-01 | Public content filtering by schedule | ✓ SATISFIED | GET routes filter by publishedAt/expiresAt for non-admin users |
| EVENTS-01 | 21-02 | Events CRUD API | ✓ SATISFIED | All 5 endpoints implemented with auth and tenant isolation |
| EVENTS-02 | 21-02 | Events admin pages | ✓ SATISFIED | List, new, edit pages all functional with EventForm/EventList |
| EVENTS-03 | 21-03 | Events dashboard tab | ✓ SATISFIED | Events tab in ADMIN_TABS, EventsWidget registered and wired |

### Anti-Patterns Found

None found. All code follows project conventions and TypeScript strict mode.

### Human Verification Required

1. **Admin Events List Page** — Navigate to /admin/events and verify event list renders with correct columns and actions
   - Expected: Table shows events with title, date, location, organizer columns and edit/delete actions
   - Why human: Requires running dev server with seeded event data

2. **Create Event Flow** — Create a new event via /admin/events/new
   - Expected: Form validates required fields, submits to API, redirects to /admin/events on success
   - Why human: End-to-end flow requires live API and database

3. **Events Dashboard Tab** — Verify Events tab appears in admin dashboard
   - Expected: Events tab visible alongside Overview, Maintenance, Users, Content, System, Settings tabs
   - Why human: Visual UI verification

4. **EventsWidget Empty State** — Verify empty state shows Create Event link
   - Expected: When no upcoming events exist, widget shows "No upcoming events" with "Create Event" button
   - Why human: Requires clearing events data and checking UI state

5. **Content Scheduling Access Control** — Verify non-admin users cannot see scheduled/expired content
   - Expected: Non-admin users get 404 or filtered results for content with future publishedAt or past expiresAt
   - Why human: Requires testing with different user roles and scheduled content

### Gaps Summary

**All gaps resolved.** Initial verification found 1 TypeScript type error, which was fixed:

- **File:** `src/app/api/content/[id]/route.ts` lines 82-83
- **Issue:** `or(isNull(contents.publishedAt), lte(contents.publishedAt, now))` returns `SQL<unknown> | undefined` from Drizzle's type definitions, but the `whereConditions` array is inferred as `SQL<unknown>[]` from the initial `eq()` calls.
- **Fix:** Added explicit type assertion `as SQL<unknown>` to `or()` calls and imported `SQL` type from `drizzle-orm` (commit cf94486).
- **Verification:** `npx tsc --noEmit` passes with no errors for phase 21 files.

---

_Verified: 2026-05-15T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
