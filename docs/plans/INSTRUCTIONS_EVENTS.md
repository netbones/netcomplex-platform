# INSTRUCTIONS: Events (admin + resident)

## Context

Events exist as a single shared feature with two surfaces reading and
writing the same `Event`/`EventAttendee` tables: an admin/management console
(list + create/edit) and a resident-facing page where residents browse
community events, RSVP, and — per the actual product requirement — create
their own events too. This document supersedes the earlier draft mockups
that assumed a richer schema (draft status, start/end time, capacity as a
generic field); it's now reconciled against the real Prisma model below.

**Status update:** the schema additions required for resident-side ownership
(`createdByUserId`), draft state (`isDraft`), and end time (`endDate`) are
now shipped in the codebase and modeled in a pending migration. The
resident create/edit/"My events" surface is still **not built** — it is now
unblocked by the schema and is the next implementation step. See
"Completed" and "Deferred" at the bottom.

Mockups attached alongside this file:

- `events_admin_list_v2` — admin/management list view (stat tiles, table,
  status derived from `date`/`deletedAt`)
- `new_event_form_v2` — admin create/edit form
- `events_resident_page` — resident-facing browse + RSVP + "my events" view

---

## 1. Data model (current, as provided)

```prisma
model Event {
  id              String          @id
  tenantId        String
  title           String
  description     String
  date            DateTime
  endDate         DateTime?
  location        String
  organizer       String
  image           String?
  isPublic        Boolean         @default(true)
  isDraft         Boolean         @default(false)
  category        String?
  maxAttendees    Int?
  createdByUserId String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @default(now()) @updatedAt
  deletedAt       DateTime?
  Tenant          Tenant          @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  createdBy       user?           @relation("EventCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)
  attendees       EventAttendee[]
  proxies         MeetingProxy[]  @relation("EventProxy")

  @@index([tenantId, date])
  @@index([tenantId, category])
  @@index([date])
  @@index([createdByUserId])
}

model EventAttendee {
  id        String    @id
  tenantId  String
  eventId   String
  userId    String
  createdAt DateTime  @default(now())
  deletedAt DateTime?
  event     Event     @relation(fields: [eventId], references: [id], onDelete: Cascade)
  Tenant    Tenant    @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  user      user      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([eventId, userId])
}
```

**`createdByUserId` is now added** as a nullable FK. Null means the event was
created by management (no per-user owner); non-null means a resident created
it and owns it for edit/cancel/"My events" purposes. `organizer` remains a
free-text display string and must never be used for access control.

**Draft state is now stored** via `isDraft` (default `false`). This is a
boolean, not a status enum — cancelled continues to be represented by
`deletedAt`, and published is `isDraft = false`. Admin list displays
**Draft** for `isDraft = true`, and all resident/public queries exclude
drafts.

**End time is now stored** via nullable `endDate`. When null, the event has
no explicit end; when set, the UI can render a duration/end time. This is
optional and does not currently drive venue blocking.

**Status is derived** — there is no status enum on this model. Compute
display status as:

- `deletedAt is not null` → **Cancelled**
- `deletedAt is null AND isDraft` → **Draft**
- `deletedAt is null AND isDraft = false AND date < now()` → **Past**
- `deletedAt is null AND isDraft = false AND date >= now()` → **Upcoming**

**`isPublic`** maps directly to the Visibility choice in `new_event_form_v2`
("Residents only" = `false`, "Public event" = `true`). Confirmed decision:
`isPublic` stays as-is; "always public" is the default, and restricted events
are `isPublic = false` — no separate `isRestricted` field is introduced.

**`MeetingProxy` (`EventProxy` relation)** — out of scope for this pass.
This relation implies certain events (AGM-style meetings) support proxy
vote assignment, which is a real, already-modeled feature this document
does not touch. Do not let either the admin or resident Events UI built
here interfere with or duplicate proxy-related functionality — if an event
has associated `MeetingProxy` records, that's a separate concern with its
own (unspecified here) UI, not something to surface as a generic Events
field.

**RSVP capacity**: `maxAttendees` is enforced by comparing
`count(EventAttendee where eventId = X and deletedAt is null)` against it
at RSVP time — there's no reserved/waitlist concept in the schema, so once
capacity is reached, RSVP should simply be blocked with a clear "This event
is full" state, not silently allowed or silently waitlisted. Waitlisting is
explicitly **deferred to v1.1** (see Deferred).

**Soft delete convention**: both `Event.deletedAt` and
`EventAttendee.deletedAt` are used for cancellation — cancelling an event
sets `Event.deletedAt`, un-RSVPing sets `EventAttendee.deletedAt` on that
attendee's row (not a hard delete, consistent with the soft-delete pattern
already used across this schema).

---

## 2. How admin and resident surfaces relate

One `Event` table, two views, gated by role and ownership — not two
parallel data models:

- **Admin list** (`events_admin_list_v2`): sees every `Event` for the
  tenant regardless of `isPublic`, `isDraft`, or who created it. This is
  the management/oversight view.
- **Resident page** (`events_resident_page`): sees `Event` rows where
  `isPublic = true` AND `isDraft = false` OR `createdByUserId = <the viewing
resident>`. A resident should always see their own event (draft or not),
  but never see another resident's draft or restricted event.
- **Edit/cancel permission**: an `Event` can be edited or cancelled by its
  `createdByUserId` or by a management/admin role — never by any other
  resident. This is now enforceable via `createdByUserId`.
- **RSVP** (`EventAttendee` create/soft-delete) is available to any
  resident on any event they can see, admin-created or resident-created
  alike — RSVP is not restricted to admin events.

Reuse `new_event_form_v2`'s structure for both admin and resident creation.
The resident flow should scope fields appropriately and not duplicate the
admin form wholesale.

---

## 3. Admin list

Reference: `events_admin_list_v2`

**Shipped.** The admin list now includes:

- Stat tiles: **Upcoming**, **This week**, **Total RSVPs**, **Cancelled**,
  **Drafts**.
- Status column: **Draft** / **Upcoming** / **Past** / **Cancelled**,
  computed per §1.
- Search + status/visibility filters.
- Row `⋮` menu: **Edit** and **Cancel event** (soft-delete).
- Category-based icon tile fallback, RSVP count, and soft-deleted
  (cancelled/past) rows muted.

**Not yet done (deferred follow-up):**

- "View RSVPs" detail list for admins (list `EventAttendee` joined to
  `user`).
- "Organizer type" indicator (resident vs management) once
  `createdByUserId` has real resident-created rows.

---

## 4. Resident page

Reference: `events_resident_page`

**Not built.** Now unblocked by `createdByUserId`. Implementation plan:

- Filter chips: **Upcoming** (default), **Attending** (events with an
  active `EventAttendee` row for the viewing resident), **My events**
  (`createdByUserId = viewer`), **Past**.
- Each card: image (`image` URL, fallback to a category-based icon tile if
  null — mirrors the Amenities pattern of icon-tile fallback), title,
  category badge (`category`, nullable — hide the badge entirely if null,
  don't show an empty pill), date/time + end time (if `endDate`) + location
  line, organizer + RSVP count line (`Hosted by {organizer} · {count} going`,
  plus `· Capacity {maxAttendees}` appended only when set).
- RSVP button states:
  - Not attending, capacity available → **RSVP** button, creates an
    `EventAttendee` row (or un-soft-deletes an existing one if the resident
    previously cancelled and is re-joining — check for an existing row
    with `deletedAt` set before inserting a new one, given the
    `@@unique([eventId, userId])` constraint).
  - Attending → **Going** indicator + **Cancel RSVP** button, soft-deletes
    the `EventAttendee` row.
  - At capacity, not attending → RSVP button disabled, label changes to
    "Event full" — per §1, no waitlist fallback exists.
- Own event (`createdByUserId = viewer`) → "Yours" badge, and the action
  row swaps to **Edit event** / **Cancel event** instead of an RSVP button —
  a resident doesn't RSVP to their own event.
- **Create event** button (top right) opens the same form structure as
  `new_event_form_v2`, scoped to what a resident can set.

---

## 5. Decisions (resolved)

1. **`createdByUserId` migration** — DONE. Nullable FK, `onDelete: SetNull`.
2. **`isPublic` meaning** — DONE. Stays a boolean; restricted = `false`,
   no separate `isRestricted` field.
3. **Draft state** — DONE. `isDraft` boolean added (default `false`).
4. **End time** — DONE. `endDate` nullable DateTime added.
5. **Resident-created `isPublic` default** — deferred; decide when building
   the resident form.
6. **Admin "Organizer type" indicator** — deferred follow-up.
7. **Waitlist** — deferred to v1.1.

---

## 6. Out of scope / deferred

- Any UI for `MeetingProxy`/proxy-vote assignment tied to events — that
  relation exists in the schema but is a separate, already-modeled feature
  this document does not touch.
- Waitlisting beyond hard capacity block — **deferred to v1.1**.
- "View RSVPs" detail list for admins (deferred follow-up, not built here).
- Event editing history/audit trail beyond the existing `updatedAt`
  timestamp already on the model.
- Resident create/edit/"My events" surface — next implementation step, now
  unblocked.

---

## 7. Acceptance criteria

- [x] `createdByUserId` exists on `Event` (nullable FK, `onDelete: SetNull`).
- [x] `isDraft` exists on `Event` (boolean, default `false`).
- [x] `endDate` exists on `Event` (nullable DateTime).
- [x] Admin list shows every tenant event regardless of `isPublic`, `isDraft`,
      or creator.
- [x] Status (Draft/Upcoming/Past/Cancelled) is computed from
      `isDraft`/`date`/`deletedAt`.
- [x] Resident/public queries exclude drafts.
- [ ] Resident page shows only `isPublic = true` events plus the viewer's
      own events (including their drafts), per §2.
- [ ] A resident can only edit or cancel events where
      `createdByUserId = viewer`, or where the viewer holds a management/
      admin role — enforced server-side, not just hidden in the UI.
- [ ] RSVP respects `maxAttendees` via a live count against active
      `EventAttendee` rows; no client-side-only capacity check.
- [ ] Re-RSVPing after a previous cancel reuses/un-soft-deletes the
      existing `EventAttendee` row rather than violating the
      `@@unique([eventId, userId])` constraint.
- [ ] Cancelling an event or an RSVP always soft-deletes
      (`deletedAt` set), never hard-deletes.
- [ ] Neither surface builds any UI for `MeetingProxy`/`EventProxy` in this
      pass.
