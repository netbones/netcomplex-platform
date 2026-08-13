# INSTRUCTIONS: Admin Amenities console

## Context

The original Amenities work (`INSTRUCTIONS.md`) built the resident-facing
catalogue, booking flow, and My Bookings tab against an `amenities` table,
but explicitly left the admin/management side out of scope — amenities were
assumed to be seeded manually. This closes that gap: a management-facing
console to create, edit, reorder, and deactivate amenities, plus a
lightweight operational view (bookings today, waitlist, no-shows).

This document only covers the admin console. It does not change anything in
the resident-facing spec — read `INSTRUCTIONS.md` first if it hasn't already
been implemented, since this work depends entirely on the `amenities` and
`bookings` tables defined there.

Two mockups were approved as the target UI, attached alongside this file:

- `admin_amenities_dashboard` — stat tiles, search, and a reorderable table
  of all amenities with inline bookable/status indicators
- `admin_amenity_edit_form` — the add/edit form for a single amenity

---

## 1. Data model

No new tables. This works entirely against the `amenities` schema already
defined in `INSTRUCTIONS.md` §1:

```
amenities
  id, tenant_id, name, description, icon, photo_url,
  hours_open, hours_close, bookable, contact_enabled, contact_phone,
  max_occupancy, slot_duration_mins, rules_text, waitlist_enabled,
  sort_order, active
```

One addition for this console — **already present** on `Amenity` in Prisma
(`updatedAt` with `@updatedAt`); no migration needed for this column:

```
amenities
  ...
  updated_at             timestamptz  -- touch on every admin write
```

`updated_by_user_id` is deferred — not in this pass.

RLS: `amenities` write access (create/update/reorder/deactivate/delete) is
management/admin only. Resident read access is unchanged from
`INSTRUCTIONS.md` — this document doesn't alter who can _see_ amenities,
only who can _configure_ them.

---

## 2. Dashboard (list view)

Reference: `admin_amenities_dashboard`

- **Stat tiles**: active amenities count, bookings today, on waitlist,
  no-shows this week. All computed live from `amenities`/`bookings`, not
  hardcoded. "No-shows this week" depends on the `no_show` booking status
  defined in `INSTRUCTIONS.md` §5 — if that transition mechanism isn't
  built yet, this tile should show `—` rather than a fake zero.
- **Search** — filters the table by amenity name, client-side is fine given
  the expected row count per tenant (dozens, not thousands).
- **Table columns**: drag handle (reorder), Amenity (icon + name, same icon
  set as the resident-facing cards), Hours (or "Always open"), Bookable
  (checkmark/x, read-only indicator — editing happens in the form),
  Bookings today, Status (Active/Inactive badge), row `⋮` menu.
- **Reordering**: drag-and-drop updates `sort_order` for affected rows.
  Persist on drop, not on a separate "save order" step — this should feel
  immediate, matching the resident-facing list's `sort_order`-driven
  ordering.
- **Row `⋮` menu**: Edit (opens §3 form), Deactivate/Activate (toggles
  `active` without opening the full form — a quick action for "take this
  offline right now," e.g. pool closed for maintenance), Delete (only when
  the amenity has zero related bookings — policy A; otherwise disabled /
  error pointing at Deactivate). No Duplicate (decided out of scope — §5.2).
- **Add amenity** button (top right) opens §3 form with empty defaults.

---

## 3. Add/edit form

Reference: `admin_amenity_edit_form`

Fields map directly to the `amenities` schema — no field on this form
should exist without a corresponding column, and no column should be
un-editable here without a documented reason:

- Name (required, text)
- Icon (select from the existing tabler icon set already used on the
  resident-facing cards — do not introduce icons the resident UI doesn't
  also support)
- Photo upload (optional — if omitted, resident-facing card falls back to
  the icon tile, per `INSTRUCTIONS.md` §3)
- Opens / Closes time pickers, plus an "Always open" checkbox that nulls
  out `hours_open`/`hours_close` when checked (mirrors the "no hours
  restriction" case in the resident-facing status badge logic — don't let
  admin set one of the two times and leave the other blank, that's an
  invalid state)
- **Bookable** toggle — when off, hides Slot duration, Max occupancy, and
  Waitlist fields entirely rather than just disabling them, since they're
  meaningless for a non-bookable amenity (matches how Visitor Parking works
  today on the resident side)
- Slot duration (minutes), Max occupancy — plain number inputs, only shown
  when Bookable is on
- Allow waitlist toggle — only shown when Bookable is on
- Rules and info (textarea) — maps to `rules_text`; empty is valid (the
  resident-facing info box hides itself when this is null, per
  `INSTRUCTIONS.md` §4)
- **Active** toggle — controls resident visibility. Default `true` for new
  amenities.
- **Deactivate** button (edit mode only, visually separated to the left per
  the mockup) — shortcut for flipping Active off without touching any other
  field, then returning to the dashboard. This is intentionally _not_ a
  delete action.

**Hard delete (policy A).** Delete is allowed only when the amenity has
**zero** related `bookings` rows. If any booking exists (past or future),
refuse delete and direct the admin to Deactivate instead. Deactivation
(`active = false`) remains the path for amenities with history.

**Validation before save**:

- If Bookable is on, Slot duration and Max occupancy must be set (can't book
  an amenity with no slot length).
- Opens/Closes must be a valid range (closes after opens) unless "Always
  open" is checked.
- Name is required. Soft uniqueness nudge only (warn if another amenity in
  the same tenant already has that name) — no hard DB constraint (§5.3).

---

## 4. Interaction with existing resident-facing spec

This console doesn't change behavior defined in `INSTRUCTIONS.md` — it's
purely the missing write path for a table that spec already assumed existed.
Specifically:

- Status badge logic (§3 of `INSTRUCTIONS.md`) is computed the same way
  regardless of whether the amenity was seeded manually or created here.
- Toggling `bookable` off on an amenity that has future `confirmed` or
  `waitlisted` bookings does **not** retroactively cancel them — those
  bookings remain honored silently (§5.4). The toggle only prevents _new_
  bookings from being made. No resident-facing notice.
- Same applies to deactivating (`active = false`) an amenity with future
  bookings — don't auto-cancel, don't hide from the resident's My Bookings
  view even if it disappears from the main catalogue, no notice.

---

## 5. Decisions (resolved 2026-08-13)

1. **Audit columns** — **`updated_at` only** (already on `Amenity` as
   `updatedAt` / `@updatedAt`). Skip `updated_by_user_id` for now.
2. **Duplicate amenity** — **No.** Out of scope; omit from the row `⋮` menu.
3. **Name uniqueness** — **Soft UI suggestion only** (warn / nudge). Amenities
   are already scoped per tenant; do not add a hard unique constraint.
4. **Deactivate / make non-bookable with future bookings** — **Silent.**
   Honor existing bookings; no resident-facing notice.
5. **True deletion** — **Yes.** Policy is **A (block)**: refuse delete if any
   `bookings` row references the amenity; admin must deactivate instead.
   Delete is only available when booking count is zero. No cascade, no
   soft-delete column for this pass.

### 5a. Deletion policy (resolved)

**A — Block.** If `bookings` exist for the amenity, Delete is disabled (or
returns an error) and the UI points the admin at Deactivate. If booking
count is zero, hard delete is allowed and removes the amenity row.

---

## 6. Out of scope for this pass

- Soft-delete / cascade delete of amenities (policy is block-if-bookings).
- Duplicate amenity action.
- Bulk edit/import of amenities.
- Per-amenity analytics beyond the dashboard's basic stat tiles (e.g.
  utilization trends over time, revenue if amenities are ever monetized).
- Tenant-level default amenity templates (e.g. a starter set offered when a
  new tenant onboards) — this console assumes a tenant already exists and
  an admin is configuring it manually.
- Resident notice when an amenity with future bookings is deactivated or
  made non-bookable (silent honor per §5.4).

---

## 7. Acceptance criteria

- [x] Admin dashboard lists all amenities for the tenant regardless of
      `active` status, matching `admin_amenities_dashboard` layout.
- [x] Drag-and-drop reorder persists `sort_order` immediately on drop.
- [x] Add/edit form matches `admin_amenity_edit_form`, with
      booking-related fields (slot duration, max occupancy, waitlist) only
      shown when Bookable is on.
- [x] "Always open" checkbox correctly nulls both `hours_open` and
      `hours_close` together — never one without the other.
- [x] Deactivating an amenity hides it from the resident-facing catalogue
      but does not cancel or hide any existing bookings tied to it
      (silent — no resident notice).
- [x] No Duplicate action in the row menu.
- [x] Name uniqueness is a soft UI nudge only (no hard DB unique constraint).
- [x] Hard delete (policy A): allowed only when booking count is zero;
      otherwise refuse and point admin to Deactivate.
- [x] `updated_at` is maintained on admin writes; no `updated_by_user_id`
      in this pass.
- [x] Write access (create/edit/reorder/deactivate/delete) is restricted to
      management/admin roles; resident read access is unchanged.
- [x] Every field on the form maps to an existing `amenities` column — no
      orphaned UI state.

**Implemented (2026-08-13):** `/admin/amenities`, `/admin/amenities/new`,
`/admin/amenities/[id]`, APIs under `/api/admin/amenities*`. BD:
`soralia-village-bvlu`. No-shows tile returns `—` until no-show
determination is decided.
