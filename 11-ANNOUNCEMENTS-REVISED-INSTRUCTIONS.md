# Phase 11 — Announcements: Revised Instructions

**Status:** SUPERSEDES plans `11-01-PLAN.md` and `11-02-PLAN.md`  
**Reason:** Three architectural issues must be resolved before execution.

---

## Issues with the Current Plans

### 1. Schema is missing targeting fields

The `Announcement` model currently has no targeting. It will broadcast identically to all tenant users regardless of whether they are owners, renters, agents, or board members. The `ResidentFilter` enum (`ALL`, `OWNERS_ONLY`, `RENTERS_ONLY`) and `Role` enum already exist on the schema and are already used by the `Group` model for exactly this purpose. Announcements must adopt the same pattern.

### 2. No relationship defined with `Notification`

The `Notification` model exists (`userId`, `title`, `message`, `type`, `link`, `read`). Announcements are broadcast notifications — a one-to-many variant. The plans create a parallel discovery channel with no fanout to `Notification`. A resident will never see an announcement unless they navigate to a dedicated page. This is a discoverability failure. The POST handler must fan out to `Notification` records for targeted users after an announcement is created.

### 3. Navigation governance violation

Plan `11-02` proposes adding an `/news/announcements` nav item to `navigation-config.ts`. This fails the Navigation Governance admission criteria (NAVIGATION_GOVERNANCE.md). Announcements do not represent a primary user journey, are not accessed weekly by most users, and duplicate what the notification/feed system should surface. A standalone nav item must not be added. Discovery must happen through contextual surfaces only (dashboard widget, notification feed).

---

## Required Schema Changes

Update `prisma/schema.prisma` — the `Announcement` model:

```prisma
model Announcement {
  id             String         @id
  tenantId       String
  title          String
  content        String
  author         String
  priority       String         @default("normal")
  targetFilter   ResidentFilter @default(ALL)
  targetRoles    Role[]
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @default(now()) @updatedAt
  expiresAt      DateTime?
}
```

**Changes:**

- `targetFilter ResidentFilter @default(ALL)` — mirrors the `Group` model pattern. Filters by occupancy type (owner/renter/all).
- `targetRoles Role[]` — optional role array. Empty means all roles. Populate to restrict to e.g. `[BOARD, COMMITTEE]` for governance notices or `[RESIDENT, COMMITTEE, BOARD]` to exclude agents.
- `updatedAt` — add this; it was missing and will be needed for cache invalidation.

Run `npx prisma migrate dev --name add_announcement_targeting` after the schema change, then `npx prisma generate` to regenerate the Drizzle schema.

---

## Notification Fanout

After a successful `POST /api/announcements`, the handler must fan out to individual `Notification` records. The targeting query logic:

1. Fetch all `user` records for the tenant where `isActive = true`.
2. Apply `targetFilter`:
   - `OWNERS_ONLY`: join through `standardSeat` or `premiumSeat` — only users who have a seat of that type for this tenant.
   - `RENTERS_ONLY`: join through `profile` where `residencyType = RENTER`.
   - `ALL`: no occupancy filter.
3. Apply `targetRoles` (if non-empty): filter `user.role IN targetRoles`.
4. Insert `Notification` records in bulk for each matched user:

```ts
{
  id: crypto.randomUUID(),
  tenantId,
  userId: user.id,
  title: announcement.title,
  message: announcement.content.slice(0, 200), // truncated preview
  type: 'announcement',
  link: `/news#announcement-${announcement.id}`,
  read: false,
  createdAt: new Date(),
}
```

Use a single batched insert, not a loop of individual inserts. Cap fanout at 500 users per announcement for now — add a note in the code that bulk job processing will be needed beyond that threshold.

---

## UI: Stream, Not Card Grid

The public-facing announcement view must be a **stream/log**, not a card grid. A stream is chronological, dense, and integrates naturally with a feed. A card grid implies discrete browsable items (appropriate for resources or services) and is the wrong pattern here.

**Stream item anatomy:**

```
[PRIORITY INDICATOR] Title                          [date]
                     Content (full, not truncated)
                     — Author name · Expires [date if set]
```

Priority indicator: a left-border colour accent or a small pill badge (urgent=red, high=amber, normal=blue, low=muted). Not a large card with heavy padding.

**Where the stream lives:**

- As a widget: `src/widgets/dashboard/ui/AnnouncementsStreamWidget.tsx` — shows the 5 most recent active announcements. Registered in the widget registry under `id: 'announcements-stream'`, available to resident and admin dashboards.
- As an embeddable section: the stream component should be importable into the existing `/news` page as a section, not as a new standalone page. Add it as a named section within the existing news page rather than creating `/news/announcements` as a new route.

**Do not create `/news/announcements` as a new page.**  
**Do not add any new permanent navigation item for announcements.**

---

## Admin Management Page

`/admin/announcements` is correct and should be built as planned in `11-01`. The form requires these additions given the schema changes:

- `targetFilter` select: All Residents / Owners Only / Renters Only (maps to `ResidentFilter` enum)
- `targetRoles` multi-select: optional, defaults to empty (all roles). Offer the `Role` enum values with human-readable labels. Show a helper note: "Leave empty to send to all roles matching the audience filter above."

---

## Widget Registry

Register in `src/widgets/dashboard/model/widgets.ts`:

```ts
{
  id: 'announcements-stream',
  name: 'Announcements',
  category: 'core',
  icon: Megaphone, // lucide-react
  permissions: ['resident', 'admin'],
  lazy: () => import('../../dashboard/ui/AnnouncementsStreamWidget'),
}
```

The admin-only management widget (`admin-announcements`) from the original plan is still valid — keep it but ensure it links to `/admin/announcements` and shows a compact list (title, priority badge, target audience summary, date).

---

## What to Carry Forward from the Original Plans

| Item                                       | Decision                                                              |
| ------------------------------------------ | --------------------------------------------------------------------- |
| `POST/GET /api/announcements`              | Keep — add `targetFilter` and `targetRoles` to Zod schema and handler |
| `GET/PATCH/DELETE /api/announcements/[id]` | Keep as-is                                                            |
| `announcementSchema` in `schemas.ts`       | Keep — extend with `targetFilter` and `targetRoles`                   |
| `/admin/announcements` page                | Keep — extend form with targeting fields                              |
| `AnnouncementForm.tsx`                     | Keep — extend with targeting fields                                   |
| `AnnouncementList.tsx`                     | Keep for admin view                                                   |
| `useAnnouncements.ts` hook                 | Keep                                                                  |
| `/news/announcements` page                 | **Drop** — embed stream in existing `/news` page instead              |
| Navigation config update                   | **Drop** — no new nav item                                            |
| `AnnouncementsWidget` (admin)              | Keep — rename to `AdminAnnouncementsWidget` for clarity               |
| New `AnnouncementsStreamWidget`            | **New** — stream component for dashboard and news page embedding      |

---

## Execution Order

1. Schema migration (`targetFilter`, `targetRoles`, `updatedAt` on `Announcement`)
2. Drizzle regeneration (`npx prisma generate`)
3. API routes with targeting logic and notification fanout
4. `AnnouncementForm.tsx` with targeting fields
5. `AnnouncementsStreamWidget` (stream component)
6. Embed stream in existing `/news` page
7. Register widget in registry
8. Admin page at `/admin/announcements`

---

## Quality Gates

Before marking any task complete:

- `pnpm exec tsc --noEmit` — zero errors
- No new entries in `navigation-config.ts`
- No new standalone page routes outside `/admin/`
- Notification fanout verified: creating an announcement inserts `Notification` rows
- Targeting verified: `OWNERS_ONLY` filter does not deliver to renter-only profiles
