# INSTRUCTIONS: Amenities Calendar tab

## Context

This fills in the third resident-facing tab from the original Amenities work
(`INSTRUCTIONS.md` §2: `Amenities | My Bookings | Calendar`), which was left
unspecified in that pass ("Calendar tab — unchanged, no redesign in scope").
It gives residents a community-wide view of amenity availability by day,
across all bookable amenities at once, rather than the per-amenity slot
picker in the booking detail flow (`INSTRUCTIONS.md` §4).

This document assumes `INSTRUCTIONS.md` (resident Amenities) and
`INSTRUCTIONS_ADMIN_AMENITY.md` (admin console) are already implemented — it
adds no new tables, only a new read/query surface over `amenities` and
`bookings`.

One mockup was approved as the target UI, attached alongside this file:

- `amenities_calendar_tab` — month grid with per-amenity color dots, amenity
  filter chips, and a day agenda listing time slots (booked or available)

---

## 1. Data model

No new tables and **no `calendar_color` column**. Reads from `amenities` and
`bookings` (both defined in `INSTRUCTIONS.md` §1).

Colors are assigned at read time from a fixed shared palette, indexed by
`sort_order` among bookable amenities (stable as long as order is stable —
reorder in admin will re-map colors, which is acceptable). **Do not**
hash amenity ID/name client-side, and **do not** add an admin-editable
color field in this pass (§6.1).

No new query pattern beyond: for a given month + optional amenity filter,
fetch all `bookings` with `status in (confirmed, waitlisted)` whose
`start_at`/`end_at` (or `date` + times) fall in that range, joined to
`amenities` for name + palette index. Server-side aggregation by day (for
the month-grid dots) is preferable to shipping every booking row to the
client and aggregating there, especially once a tenant has many amenities
and residents.

---

## 2. Tab structure and navigation

No change to the existing tab bar (`Amenities | My Bookings | Calendar`) —
this document only fills in what "Calendar" renders. Tapping the tab lands
on the current month with no amenity filter applied (`All` chip selected)
and today's date pre-selected in the day agenda below the grid, if today has
any bookings or available bookable amenities; otherwise the agenda is empty
with a lightweight "No activity today" state (not the old empty-state
illustration from the pre-redesign Bookings page — keep it a plain one-line
message consistent with the flatter empty states used elsewhere).

---

## 3. Amenity filter chips

- Horizontally scrollable row above the month grid, per mockup.
- `All` chip is default-selected, shows every bookable amenity's dots
  together on the grid.
- One chip per **bookable** amenity (`amenities.bookable = true`) — do not
  include non-bookable amenities like Visitor Parking here, there's nothing
  to show on a calendar for something with no time-based booking concept.
- Each chip shows a colored dot (palette-by-`sort_order`) + name, matching
  the color used for that amenity's dots on the grid and its accent bar in
  the day agenda list.
- Selecting a chip filters both the month-grid dots and the day agenda to
  that single amenity; tapping the same chip again (or tapping `All`)
  clears the filter.

---

## 4. Month grid

- Standard month calendar, per mockup: weekday header row, days in a 7-column
  grid, previous/next month navigation.
- Each day cell shows up to **3** colored dots representing which filtered
  amenities have at least one `confirmed`/`waitlisted` booking that day.
  **Do not attempt to show a dot per individual booking** — this is a
  density indicator per amenity per day, not a booking count. If more than
  3 amenities have bookings that day, show the first 3 (by `sort_order`)
  only — no "+N more" affordance in this pass.
- Selected day gets the accent-filled treatment shown in the mockup (12 Aug
  in the reference). Selecting a different day updates the agenda below
  without navigating away from the tab.
- **Today-forward only.** Past days are not selectable. They may remain
  visible in the grid (muted) for month context, but taps do nothing;
  previous-month navigation that would land entirely before today is
  disabled or clamped so the earliest selectable day is today. Personal
  history stays on My Bookings → Past.

---

## 5. Day agenda

- Listed below the grid, per mockup: one row per time slot with a booking
  or an open slot, sorted chronologically.
- Each row: time range, colored accent bar (matches the amenity's
  palette color), amenity name, and a state:
  - **Other resident's booking** → label reads "Booked" only. **Do not
    display the other resident's name, unit number, or any other
    identifying detail on this shared calendar view** — this is a
    community-wide surface, not an admin one, and residents should not be
    able to infer who is using an amenity when. This is a firm privacy
    boundary, not a placeholder to fill in later.
  - **Own booking** → same "Booked" treatment plus a small "You" badge
    (accent-colored), so the resident can distinguish their own bookings at
    a glance without exposing anyone else's identity. Own rows may also
    expose an "Add to calendar" affordance (see §6a).
  - **Available slot** → label reads "Available" with a **Book** button
    that routes directly into the existing booking detail flow
    (`INSTRUCTIONS.md` §4) with the amenity and slot pre-selected. Do not
    build a second, parallel booking confirmation flow for this entry
    point — reuse the one already specified.
  - **Non-bookable amenity time windows** (e.g. Visitor Parking's "always
    open") never appear in the day agenda — filtered out per §3, nothing to
    show.
- Generate the set of "available" rows the same way the booking detail flow
  generates its slot grid (per `amenities.slot_duration_mins` within
  `hours_open`/`hours_close`) — don't reimplement slot generation logic
  separately here; factor it into a shared function/selector both surfaces
  call.

---

## 6. Decisions (resolved 2026-08-13)

1. **Colors** — Fixed palette cycled by `sort_order` among bookable
   amenities. No `calendar_color` column; no admin color picker in this pass.
2. **Dot cap** — **3** dots max per day cell. No "+N more".
3. **Past days** — **Today-forward only.** Past days not selectable; My
   Bookings → Past covers personal history.

### 6a. Week / day views and calendar export (wanted — feasible)

Originally out of scope; DavDev wants them if we can. Feasibility:

| Feature                           | Verdict        | Notes                                                                                                                                                                                                      |
| --------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Week view**                     | Yes            | Same data as month; denser agenda rows per day. Ship after month grid lands, same API.                                                                                                                     |
| **Day view**                      | Yes            | Essentially the day agenda full-bleed (already specified). Toggle Month \| Week \| Day.                                                                                                                    |
| **iCal (.ics) download**          | Yes            | Own bookings only (`CONFIRMED`/`WAITLISTED`). Single-event or multi-event file. Privacy-safe.                                                                                                              |
| **Google Calendar**               | Yes (light)    | "Add to Google Calendar" link (`calendar.google.com/calendar/render?...`) and/or subscribe via `webcal://` / authenticated `.ics` feed of **own** bookings. No Google OAuth required for the URL approach. |
| **Community-wide subscribe feed** | No (this pass) | Would leak anonymized slots at best and invite scraping; keep export scoped to the viewing resident's own bookings.                                                                                        |

**This pass (v1):** month grid + day agenda + filter chips (mockup).

**Same feature, follow-on slice (v1.1):** Month \| Week \| Day toggle; "Add to
calendar" on own agenda rows (`.ics` download + Google Calendar deep link);
optional "Export my bookings" on My Bookings.

Do not block v1 on week/day/export — build the mockup surface first.

---

## 7. Out of scope for this pass

- Admin/management version of this calendar (distinct from
  `INSTRUCTIONS_ADMIN_AMENITY.md` — possible future feature).
- Any change to the underlying booking confirmation flow — this tab only
  provides a new entry point into the existing one.
- Community-wide calendar subscribe feeds (privacy).
- Admin-editable `calendar_color` field.
- Selecting / browsing past days on this calendar.

Week/day modes and personal iCal/Google export are **in scope for v1.1**
(§6a), not v1.

---

## 8. Acceptance criteria

### v1 (month + agenda)

- [x] Calendar tab renders the month grid and day agenda per
      `amenities_calendar_tab`, with today pre-selected on first load.
- [x] Amenity filter chips only include bookable amenities and correctly
      filter both the grid dots and the day agenda.
- [x] Day-cell dots represent amenity-level daily density (cap **3**), not
      a literal per-booking count. Colors from palette-by-`sort_order`.
- [x] Past days are not selectable; calendar is today-forward only.
- [x] Day agenda never exposes another resident's name, unit, or identity
      for a booked slot — "Booked" only, with a "You" badge reserved for the
      viewing resident's own bookings.
- [x] Tapping "Book" on an available slot routes into the existing booking
      detail flow from `INSTRUCTIONS.md` §4 — no duplicate booking flow is
      built.
- [x] Non-bookable amenities never appear on this calendar.
- [x] Slot availability generation reuses the same logic/selector as the
      booking detail flow, not a reimplementation.

**Implemented (2026-08-13):** `AmenitiesCalendarTab`,
`GET /api/amenities/calendar`, `GET /api/amenities/calendar/day`.
BD: `soralia-village-6lg2`.

### v1.1 (follow-on)

- [ ] Month \| Week \| Day view toggle on the same data.
- [ ] Own bookings: `.ics` download and/or Google Calendar deep link.
- [ ] No community-wide subscribe feed.
