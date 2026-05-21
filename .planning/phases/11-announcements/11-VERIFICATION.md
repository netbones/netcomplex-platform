---
phase: 11-announcements
verified: 2026-05-21T15:30:00Z
status: passed
score: 11/11
must-haves:
  truths:
    - 'Board/admin can create, edit, and delete announcements with audience targeting'
    - 'Announcements support targetFilter (ALL/OWNERS_ONLY/RENTERS_ONLY) and targetRoles (Role[])'
    - 'Creating an announcement fans out Notification records to matching users'
    - 'OWNERS_ONLY filter does not deliver notifications to renter-only profiles'
    - 'Only BOARD and ADMIN roles may publish urgent announcements; COMMITTEE max high; MANAGER max normal'
    - 'Announcements can optionally link to a Resource record for supporting documents'
    - 'Priority dropdown is role-gated — COMMITTEE cannot select urgent, MANAGER cannot select high'
    - 'Priority taxonomy definitions appear as helper text in the form (not just colour codes)'
    - 'Residents see a stream of announcements in the dashboard widget and on the /news page'
    - 'Admin dashboard has a compact announcement management widget'
    - 'NO new entries in navigation-config.ts — discovery through dashboard widget and notification feed only'
  artifacts:
    - path: 'prisma/schema.prisma'
      provides: 'Announcement model with targetFilter, targetRoles, resourceId, updatedAt'
      status: verified
    - path: 'src/features/announcements/model/priority-taxonomy.ts'
      provides: 'Priority taxonomy definitions with role restrictions and labels'
      status: verified
    - path: 'src/app/api/announcements/route.ts'
      provides: 'Announcement CRUD API with targeting + fanout + priority enforcement'
      status: verified
    - path: 'src/app/api/announcements/[id]/route.ts'
      provides: 'Single-announcement API (GET, PATCH, DELETE)'
      status: verified
    - path: 'src/entities/tenant/api/permissions.ts'
      provides: 'canPublishAnnouncements helper'
      status: verified
    - path: 'src/features/announcements/ui/AnnouncementForm.tsx'
      provides: 'Role-gated priority form with targeting, resource link, taxonomy helper text'
      status: verified
    - path: 'src/features/announcements/ui/AnnouncementList.tsx'
      provides: 'Compact admin list with taxonomy labels, target summary, resource indicators'
      status: verified
    - path: 'src/widgets/dashboard/ui/AnnouncementsStreamWidget.tsx'
      provides: 'Stream/log UI showing 5 most recent active announcements with taxonomy labels'
      status: verified
    - path: 'src/widgets/admin/ui/AdminAnnouncementsWidget.tsx'
      provides: 'Admin dashboard compact list widget linking to /admin/announcements'
      status: verified
    - path: 'src/widgets/dashboard/model/widgets.ts'
      provides: 'Widget registry entries for announcements-stream and admin-announcements'
      status: verified
    - path: 'src/app/news/page.tsx'
      provides: 'Existing /news page with embedded announcements stream section'
      status: verified
  key_links:
    - from: 'src/app/api/announcements/route.ts'
      to: 'Notification table'
      via: 'batch insert after announcement creation'
      status: wired
    - from: 'src/app/api/announcements/route.ts'
      to: 'priority-taxonomy.ts'
      via: 'validatePriorityForRole before insert'
      status: wired
    - from: 'src/app/api/announcements/route.ts'
      to: 'profiles table'
      via: 'targetFilter query for OWNERS_ONLY/RENTERS_ONLY'
      status: wired
    - from: 'src/features/announcements/ui/AnnouncementForm.tsx'
      to: 'priority-taxonomy.ts'
      via: 'import getAllowedPriorities and PRIORITY_TAXONOMY'
      status: wired
    - from: 'src/widgets/dashboard/ui/AnnouncementsStreamWidget.tsx'
      to: '/api/announcements'
      via: 'fetch with ?active=true&limit=5'
      status: wired
    - from: 'src/widgets/dashboard/model/widgets.ts'
      to: 'AnnouncementsStreamWidget'
      via: "registry.register with id 'announcements-stream'"
      status: wired
    - from: 'src/app/news/page.tsx'
      to: 'AnnouncementsStreamWidget'
      via: 'import and render as section'
      status: wired
---

# Phase 11: Announcements Verification Report

**Phase Goal:** Implement governed announcements layer — role-gated priority taxonomy, audience targeting with fanout, document attachment, admin CRUD UI, stream widget + /news embed (no new nav items)

**Verified:** 2026-05-21T15:30:00Z

**Status:** PASSED

**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                        | Status     | Evidence                                                                                                                                                                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Board/admin can create, edit, and delete announcements with audience targeting               | ✓ VERIFIED | POST/PATCH/DELETE in route.ts + [id]/route.ts with `canPublishAnnouncements` guard; AnnouncementForm.tsx has targetFilter select + targetRoles multi-select; admin page at `/admin/announcements`                                                                                       |
| 2   | Announcements support targetFilter (ALL/OWNERS_ONLY/RENTERS_ONLY) and targetRoles (Role[])   | ✓ VERIFIED | Prisma schema line 93-94: `targetFilter ResidentFilter @default(ALL)`, `targetRoles Role[]`; Drizzle schema: `targetFilter: residentFilterEnum('targetFilter').default('ALL').notNull()`, `targetRoles: roleEnum('targetRoles').array().default([]).notNull()`                          |
| 3   | Creating an announcement fans out Notification records to matching users                     | ✓ VERIFIED | route.ts lines 191-263: fetches active users → applies targetFilter → applies targetRoles → caps at 500 → `db.insert(notifications).values(...)` with type `announcement-${priority}` and link `/news#announcement-${id}`                                                               |
| 4   | OWNERS_ONLY filter does not deliver notifications to renter-only profiles                    | ✓ VERIFIED | route.ts lines 199-211: OWNERS_ONLY branch joins profiles where `residencyType IN ['OWNER_RESIDENT', 'FAMILY']`, excluding RENTER profiles                                                                                                                                              |
| 5   | Only BOARD and ADMIN roles may publish urgent; COMMITTEE max high; MANAGER max normal        | ✓ VERIFIED | priority-taxonomy.ts: `MAX_PRIORITY_BY_ROLE = { ADMIN: 'urgent', BOARD: 'urgent', COMMITTEE: 'high', MANAGER: 'normal' }`; route.ts line 141: `validatePriorityForRole()` called on POST; [id]/route.ts line 76: same on PATCH                                                          |
| 6   | Announcements can optionally link to a Resource record for supporting documents              | ✓ VERIFIED | Prisma schema line 95: `resourceId String?`, line 99: `resource Resource? @relation(...)`; route.ts lines 152-165: validates resourceId belongs to same tenant; AnnouncementForm lines 293-316: resource dropdown with "Attach Supporting Document" label                               |
| 7   | Priority dropdown is role-gated — COMMITTEE cannot select urgent, MANAGER cannot select high | ✓ VERIFIED | AnnouncementForm.tsx line 87: `allowedPriorities = getAllowedPriorities(userRole)`; line 223: dropdown only renders `allowedPriorities.map(...)`; lines 249-253: note shows "Your role permits a maximum priority of {label}" when restricted                                           |
| 8   | Priority taxonomy definitions appear as helper text in the form                              | ✓ VERIFIED | AnnouncementForm.tsx lines 232-246: full taxonomy block with label, meaning, and examples per priority level; disallowed items shown as `opacity-40 line-through`                                                                                                                       |
| 9   | Residents see a stream of announcements in the dashboard widget and on the /news page        | ✓ VERIFIED | AnnouncementsStreamWidget.tsx: fetches `/api/announcements?active=true&limit=5`, renders stream/log with taxonomy labels; widgets.ts lines 178-194: registered as `announcements-stream`; news/page.tsx line 194: `<section id="announcements">` embeds `<AnnouncementsStreamWidget />` |
| 10  | Admin dashboard has a compact announcement management widget                                 | ✓ VERIFIED | AdminAnnouncementsWidget.tsx: compact list with taxonomy labels, target summary, "Manage" link to `/admin/announcements`; widgets.ts lines 232-250: registered as `admin-announcements` with `permissions: ['admin']`; AdminWidgetRenderer.tsx line 136: case handler                   |
| 11  | NO new entries in navigation-config.ts                                                       | ✓ VERIFIED | navigation-config.ts has zero occurrences of "announcements" — confirmed by grep                                                                                                                                                                                                        |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact                                                 | Expected                                                                 | Status     | Details                                                                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                                   | Announcement model with targetFilter, targetRoles, resourceId, updatedAt | ✓ VERIFIED | Lines 86-100: all fields present, relation to Resource defined                                            |
| `src/features/announcements/model/priority-taxonomy.ts`  | Priority taxonomy definitions with role restrictions                     | ✓ VERIFIED | 108 lines: PRIORITY_TAXONOMY, MAX_PRIORITY_BY_ROLE, validatePriorityForRole(), getAllowedPriorities()     |
| `src/app/api/announcements/route.ts`                     | CRUD API with targeting + fanout + priority enforcement                  | ✓ VERIFIED | 275 lines: GET with priority/active/limit filters, POST with full fanout + priority validation            |
| `src/app/api/announcements/[id]/route.ts`                | Single-announcement API                                                  | ✓ VERIFIED | 177 lines: GET/PATCH/DELETE with auth, tenant isolation, priority enforcement on PATCH                    |
| `src/entities/tenant/api/permissions.ts`                 | canPublishAnnouncements helper                                           | ✓ VERIFIED | Lines 21, 40-152: `announcements: boolean` in Permission, per-role values, helper at line 303             |
| `src/features/announcements/ui/AnnouncementForm.tsx`     | Role-gated priority form                                                 | ✓ VERIFIED | 396 lines: role-gated dropdown, targeting fields, resource link, taxonomy helper text                     |
| `src/features/announcements/ui/AnnouncementList.tsx`     | Compact admin list                                                       | ✓ VERIFIED | 156 lines: taxonomy labels, target summary, resource indicator, edit/delete actions                       |
| `src/widgets/dashboard/ui/AnnouncementsStreamWidget.tsx` | Stream/log widget                                                        | ✓ VERIFIED | 179 lines: fetches active announcements, taxonomy labels, border accents, document link                   |
| `src/widgets/admin/ui/AdminAnnouncementsWidget.tsx`      | Admin dashboard widget                                                   | ✓ VERIFIED | 201 lines: compact list with taxonomy labels, "Manage" + "View All" links                                 |
| `src/widgets/dashboard/model/widgets.ts`                 | Widget registry entries                                                  | ✓ VERIFIED | Lines 178-194: `announcements-stream`; Lines 232-250: `admin-announcements` with `permissions: ['admin']` |
| `src/app/news/page.tsx`                                  | /news page with announcements section                                    | ✓ VERIFIED | Lines 10, 194-208: imports + embeds AnnouncementsStreamWidget with `id="announcements"` section           |

### Key Link Verification

| From                            | To                        | Via                                               | Status  | Details                                                                                                 |
| ------------------------------- | ------------------------- | ------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------- |
| `route.ts` (POST)               | Notification table        | `db.insert(notifications).values(...)`            | ✓ WIRED | Lines 251-262: bulk insert after announcement creation                                                  |
| `route.ts` (POST)               | priority-taxonomy.ts      | `validatePriorityForRole()` import                | ✓ WIRED | Line 9: import; line 141: call before insert                                                            |
| `route.ts` (POST)               | profiles table            | targetFilter JOIN                                 | ✓ WIRED | Lines 200-224: OWNERS_ONLY/RENTERS_ONLY join profiles.residencyType                                     |
| `AnnouncementForm.tsx`          | priority-taxonomy.ts      | `getAllowedPriorities` + `PRIORITY_TAXONOMY`      | ✓ WIRED | Lines 10-13: imports; line 87: `getAllowedPriorities(userRole)`; line 225: `PRIORITY_TAXONOMY[p].label` |
| `AnnouncementsStreamWidget.tsx` | `/api/announcements`      | `fetch('/api/announcements?active=true&limit=5')` | ✓ WIRED | Line 39: fetch call in useEffect                                                                        |
| `widgets.ts`                    | AnnouncementsStreamWidget | `registry.register({id: 'announcements-stream'})` | ✓ WIRED | Lines 178-194: lazy import + register                                                                   |
| `news/page.tsx`                 | AnnouncementsStreamWidget | `<AnnouncementsStreamWidget />` render            | ✓ WIRED | Line 10: import; line 206: rendered in `<section id="announcements">`                                   |
| `AdminWidgetRenderer.tsx`       | AdminAnnouncementsWidget  | `case 'admin-announcements'`                      | ✓ WIRED | Line 136: renders `<AdminAnnouncementsWidget />`                                                        |

### Requirements Coverage

| Requirement | Source Plan  | Description                                        | Status      | Evidence                                                                                                                 |
| ----------- | ------------ | -------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| ANN-01      | 11-01        | Announcement schema with targeting fields          | ✓ SATISFIED | Prisma + Drizzle schemas have targetFilter, targetRoles, resourceId, updatedAt                                           |
| ANN-02      | 11-01        | Audience targeting with filter + roles             | ✓ SATISFIED | POST handler applies targetFilter → targetRoles intersection; AnnouncementForm has both fields                           |
| ANN-03      | 11-01        | Notification fanout on creation                    | ✓ SATISFIED | POST handler lines 191-263: full fanout with type=announcement-${priority}                                               |
| R1          | 11-01, 11-02 | Priority is structural, not cosmetic               | ✓ SATISFIED | PRIORITY_TAXONOMY with label/meaning/examples; form shows full taxonomy as helper text; validatePriorityForRole enforces |
| R2          | 11-01        | Targeting is mandatory                             | ✓ SATISFIED | targetFilter (ResidentFilter) + targetRoles (Role[]) in schema and API; form has both                                    |
| R3          | 11-01        | Notification fanout required for all announcements | ✓ SATISFIED | POST handler creates Notification records for all matching users                                                         |
| R6          | 11-01        | Audit trail design                                 | ✓ SATISFIED | FUTURE comment on notifications.ts for requiresAck/ackedAt; no blocking constraints                                      |
| R7          | 11-01, 11-02 | Document attachment                                | ✓ SATISFIED | resourceId field in schema; API validates same-tenant; form has resource dropdown                                        |
| R8          | 11-02        | No new permanent navigation item                   | ✓ SATISFIED | Zero announcements references in navigation-config.ts; discovery via widgets + notifications                             |
| ANN-04      | 11-02        | Admin CRUD UI                                      | ✓ SATISFIED | /admin/announcements page with AnnouncementForm + AnnouncementList + useAnnouncements hook                               |
| ANN-05      | 11-02        | Stream widget for dashboard + /news                | ✓ SATISFIED | AnnouncementsStreamWidget registered + embedded in /news page                                                            |

**No orphaned requirements found.** All requirement IDs from the ROADMAP phase definition are covered by at least one plan.

### Anti-Patterns Found

| File                                 | Line | Pattern                                                                        | Severity | Impact                                                                                        |
| ------------------------------------ | ---- | ------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------- |
| `src/app/api/announcements/route.ts` | 247  | `// TODO: Beyond FANOUT_CAP users, bulk job processing (queue) will be needed` | ℹ️ Info  | Acknowledged technical debt for scale; current 500-user cap is sufficient for 180-home tenant |

No blocker or warning anti-patterns found. The single TODO is an acknowledged scalability note, not a missing implementation.

### Human Verification Required

### 1. Role-Gated Priority Dropdown Visual Behaviour

**Test:** Log in as COMMITTEE user, navigate to /admin/announcements, click "New Announcement"
**Expected:** Priority dropdown shows only low, normal, high — urgent is absent. Helper text shows urgent as greyed/struck-through. Note reads "Your role permits a maximum priority of Governance."
**Why human:** Visual rendering and UX flow cannot be verified by code inspection alone.

### 2. Stream Widget on /news Page

**Test:** Create an announcement via /admin/announcements, then visit /news
**Expected:** New announcement appears in the "Announcements" section at the bottom of the /news page with priority taxonomy label, left-border accent, full content, and document link (if attached).
**Why human:** Visual layout, responsive behaviour, and real-time data flow require browser testing.

### 3. Notification Fanout Correctness

**Test:** Create announcement with targetFilter=OWNERS_ONLY, verify notification records in database
**Expected:** Only users with profiles having residencyType IN ('OWNER_RESIDENT', 'FAMILY') have Notification records; no RENTER-only profiles received notifications.
**Why human:** Requires running app + database query to verify end-to-end data flow.

### 4. Admin Widget on Dashboard

**Test:** Log in as ADMIN, view admin dashboard
**Expected:** Admin Announcements widget appears in widget picker; shows compact list with taxonomy labels; "Manage" link navigates to /admin/announcements.
**Why human:** Widget rendering and navigation require live app testing.

### Gaps Summary

No gaps found. All 11 observable truths verified against the actual codebase. All artifacts exist, are substantive (not stubs), and are wired correctly. The phase goal — governed announcements layer with role-gated priority, audience targeting with fanout, document attachment, admin CRUD UI, stream widget + /news embed, no new nav items — is achieved.

---

_Verified: 2026-05-21T15:30:00Z_
_Verifier: Claude (gsd-verifier)_
