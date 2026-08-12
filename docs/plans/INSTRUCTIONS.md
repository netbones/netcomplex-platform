# INSTRUCTIONS: Amenities & Bookings redesign

## Context

The Facility Bookings page currently ships as a bare "My Bookings / Calendar / New
Booking" shell with an empty-state illustration and no content until a resident
makes their first booking. This work merges bookings into a broader **Amenities**
feature: a browsable catalogue of every facility/service in the complex, each with
its own status, hours, and contextual actions (book, view info, call/contact).
Booking becomes one possible action on an amenity card, not the entire premise of
the page.

Three reference mockups were approved and should be treated as the target UI.
They are attached alongside this file:

- `amenities_page_mockup` — the new default landing tab (catalogue view)
- `tennis_court_booking_detail` — the booking flow opened from a bookable card
- `my_bookings_tab` — upcoming/past reservations view

Read all three before starting. Do not deviate from the visual language
(card layout, badge semantics, icon choices) without checking with DavDev first.

---

## 1. Data model changes

Add an `amenities` concept as the source of truth. Bookings reference an amenity;
not every amenity is bookable.

```
platform_modules / tenant_modules   (existing — gate the whole Amenities feature per tenant)

amenities
  id
  tenant_id
  name                 text
  description          text (nullable — rules/info shown on detail view)
  icon                 text (tabler icon name, e.g. "tennis", "swimming", "parking", "fire")
  photo_url            text (nullable — falls back to icon tile if absent)
  hours_open           time (nullable — null = "always open")
  hours_close          time (nullable)
  bookable             boolean          -- controls whether "Book" button renders
  contact_enabled      boolean          -- controls whether call/contact icon renders
  contact_phone        text (nullable)
  max_occupancy        int (nullable)   -- e.g. "Max 4 people"
  slot_duration_mins   int (nullable)   -- e.g. 60
  rules_text           text (nullable) -- shown in the info box on detail view
  waitlist_enabled     boolean default false
  sort_order           int
  active               boolean default true

bookings
  id
  tenant_id
  amenity_id           fk -> amenities.id
  user_id               fk -> users.id
  start_at              timestamptz
  end_at                timestamptz
  status                enum: confirmed | waitlisted | cancelled | completed | no_show
  created_at
  cancelled_at          nullable
```

Notes:

- `bookable = false` amenities (e.g. Visitor Parking) never expose booking UI —
  only info + contact actions. Do not build a dummy booking flow for these.
- `waitlist_enabled` governs whether a fully-booked slot shows "Join waitlist"
  instead of a disabled state. Confirm with DavDev whether waitlist promotion is
  automatic or requires manual board/management approval before building the
  promotion logic — this is currently undecided (see Open Questions).
- Row-Level Security: amenities and bookings scoped by `tenant_id` per existing
  RLS pattern. Bookings additionally scoped so residents can only read/cancel
  their own rows; management/admin roles get full tenant visibility.
- Follow the existing FSD architecture migration conventions for where this
  slice lives (feature: `amenities`, entities: `amenity`, `booking`).

---

## 2. Navigation / IA changes

Current tabs: `My Bookings | Calendar | New Booking`

New tabs: `Amenities | My Bookings | Calendar`

- **Amenities** (new default landing tab) — the catalogue view. Replaces the old
  empty-state "My Bookings" default.
- **My Bookings** — unchanged in purpose, but redesigned per `my_bookings_tab`
  mockup (see §4).
- **Calendar** — unchanged, no redesign in scope for this pass.
- **"New Booking" tab is removed.** Booking is now initiated by tapping a
  bookable amenity card, not via a standalone empty form. Update any deep links
  or notification payloads that currently point at "New Booking" to instead
  route to the relevant amenity's detail view.

Update breadcrumb from `Home > Bookings` to `Home > Amenities`. Page title
changes from "Facility Bookings" to "Amenities" (icon stays a calendar-in-circle
per mockup, unless product wants an amenities-specific icon — flag if so).

---

## 3. Amenities tab (catalogue view)

Reference: `amenities_page_mockup`

Build a vertical list of amenity cards, one per row, ordered by `sort_order`.
Each card:

- Left: photo (`photo_url`) or, if absent, a colored icon tile (tabler icon,
  color-coded — see §5 for status/color mapping conventions already used in
  the mockups; do not invent new colors per amenity, colors are for status).
- Right: name, status badge, hours line (or "No booking needed" copy for
  non-bookable amenities), and an action row.
- Action row:
  - `bookable = true` and slots available → **Book** button, opens booking
    detail (§4a) with this amenity preselected.
  - `bookable = true`, no slots available, `waitlist_enabled = true` →
    **Join waitlist** button instead of Book.
  - Always (if data present): info icon → opens amenity detail/rules sheet.
    contact icon → tel: link or in-app chat to management, per
    `contact_enabled`.

Status badge logic (compute server-side or in a selector, not hardcoded per
amenity):

| Condition                                   | Badge text     | Badge color   |
| ------------------------------------------- | -------------- | ------------- |
| `hours_open`/`hours_close` null             | "Always open"  | neutral/gray  |
| now within hours, no conflict               | "Open"         | success/green |
| now within hours but closes soon (< 1hr)    | "Closes HH:MM" | warning/amber |
| now outside hours                           | "Closed"       | neutral/gray  |
| bookable, no free slots today, no waitlist  | "Fully booked" | danger/red    |
| bookable, no free slots today, has waitlist | "Booked today" | danger/red    |

Empty footer CTA: keep the "Know of a facility that should be listed here? Chat
to management" prompt — wire it to the same contact/chat-to-management flow
used elsewhere in the app, not a new endpoint.

**This view must never show an empty state as long as the tenant has at least
one active amenity configured.** If a tenant genuinely has zero amenities
configured, show a lightweight empty state pointed at management/admin to add
one (admin-side concern, not resident-facing — flag for the admin console
backlog, out of scope here).

---

## 4. Booking detail flow

Reference: `tennis_court_booking_detail`

Opened when a resident taps a bookable amenity card (either directly via "Book"
or by tapping the card body).

- Header: amenity photo/icon, name, live status badge, hours line,
  occupancy/slot-duration line (only if `max_occupancy` / `slot_duration_mins`
  set).
- Date strip: horizontally scrollable, default range 5–7 days forward
  (configurable per tenant if a booking-window limit exists — check with
  DavDev whether Trafalgar/HOA policy caps how far ahead residents can book;
  do not hardcode 7 days without confirming).
- Time slot grid: generate slots from `hours_open`/`hours_close` at
  `slot_duration_mins` intervals. Disable (not hide) slots that are:
  - in the past for today's date
  - already booked by another resident (status `confirmed`)
    Selected slot gets the accent-outline treatment shown in the mockup.
- Rules/info box: render `rules_text` verbatim if present; hide the box
  entirely if null (don't show an empty box).
- Confirm button: label must echo the selection back, e.g.
  `Confirm booking · {weekday} {day}, {HH:MM}` — do not ship a generic
  "Confirm" button, per the mockup pattern.
- On confirm: create `bookings` row with `status = confirmed` (or
  `waitlisted` if the slot is full and waitlist is enabled), redirect to
  My Bookings with the new/updated row visible, show a success toast.

---

## 5. My Bookings tab

Reference: `my_bookings_tab`

Two sections, **Upcoming** and **Past**, sorted by `start_at`.

**Upcoming** — statuses `confirmed`, `waitlisted`:

- Row: icon tile (colored per amenity type — reuse the color already assigned
  to that amenity, don't reintroduce per-status coloring here, the badge
  carries status), name, date/time range, status badge, cancel (×) action.
- Cancel action: confirm dialog, then set `status = cancelled`,
  `cancelled_at = now()`. Free the slot immediately for other residents.

**Past** — statuses `completed`, `no_show`, `cancelled` (design shows
`completed`/`no_show`; confirm with DavDev whether cancelled bookings should
also appear here or be hidden — currently unspecified, default to showing them
with a "Cancelled" badge unless told otherwise):

- Rows render at reduced opacity per mockup.
- Action button is **Book again** — prefill the booking detail flow (§4) with
  the same amenity, no date/time preselected.

`no_show` status: a booking transitions from `confirmed` to `no_show` via a
scheduled job or management action after the slot end time passes with no
check-in mechanism — **there is no check-in UI in scope for this pass**.
Confirm with DavDev how `no_show` gets set (manual by management/board vs.
automated) before building that transition. Do not silently auto-mark
no-shows without sign-off — this has enforcement/dispute implications given
the resident's ongoing HOA context.

---

## 6. Open questions to confirm before/during build

Do not guess on these — check with DavDev:

1. **Waitlist promotion**: automatic confirm + notify, or manual
   management/board approval?
2. **Booking window**: is there a max days-ahead limit for bookings, and does
   it vary by amenity or tenant?
3. **No-show determination**: manual flag by management, or automated based on
   a check-in mechanism (not yet designed)?
4. **Cancelled bookings in Past tab**: show with a badge, or hide entirely?
5. **Non-bookable amenities without `contact_phone`**: what does the contact
   icon do — hide it, or route to a generic "chat to management" flow?

---

## 7. Out of scope for this pass

- Admin/management console for creating and editing amenities (assume seed
  data or a manual DB step for now; flag as a follow-up ticket).
- Check-in mechanism for no-show detection.
- Calendar tab redesign.
- Push/email notifications for booking confirmation, cancellation, or waitlist
  promotion (routing hooks should exist, but templates/copy are a separate
  task).

---

## 8. Acceptance criteria

- [x] Amenities tab is the default landing view; never shows the old empty
      state illustration.
- [ ] Every amenity card renders correct status badge per §3 table.
      _Partial — `always_open`/`open`/`closes_soon`/`closed` compute correctly;
      `fully_booked`/`booked_today` are defined but never computed._
- [x] Non-bookable amenities never show a Book button.
- [x] Booking detail flow disables past/taken slots without hiding them.
- [x] Confirm button label always echoes the selected date/time.
- [ ] My Bookings correctly splits Upcoming vs Past and supports cancel /
      book-again actions. _Not built — currently a placeholder._
- [ ] All new tables respect existing tenant RLS conventions.
      _Not done — migration has FKs but no RLS policies._
- [ ] "New Booking" tab and any routes/deep-links to it are removed or
      redirected to the amenity detail view.
      _Partial — tab removed, but two deep links remain (see §9)._

---

## 9. Implementation status (audit)

Last audited: 2026-08-12. Cross-referenced plan against code in `dev`.

### Done

- **§1 Data model** — `Amenity` model (Prisma + Drizzle), `Booking` extended
  (`amenityId`, `startAt`/`endAt`/`cancelledAt`), `BookingStatus` enum expanded
  (`WAITLISTED`, `NO_SHOW`). Migration `20260812164134_add_amenities_model`
  applied; seed data written and run (4 amenities).
- **§2 Navigation/IA** — `/bookings` → `/amenities` route rename with feature
  gate; tabs are `Amenities | My bookings | Calendar`; breadcrumb/page title
  updated to "Amenities".
- **§3 Catalogue view** — `AmenityCard` + `AmenityBadge` render icon tile,
  name, status badge, hours, and Book/Waitlist/Info/Contact actions. Footer CTA
  present.
- **§4 Booking detail** — `BookingDetail` with date strip, time-slot grid
  (disables past/taken), rules box, and confirm label echoing selection.
- **FSD slice** — `src/entities/amenity/` (types, selectors, UI), `AmenitiesPage`
  in `src/page-modules/booking/ui/`, `BookingDetail` in
  `src/features/booking/ui/`.
- **API** — `GET /api/amenities` (catalogue with computed status) and
  `GET /api/amenities/[id]/bookings` (slot availability).

### Remaining

1. **My Bookings tab (§5)** — the visible placeholder. Build Upcoming
   (`confirmed`/`waitlisted`) and Past (`completed`/`no_show`/`cancelled`)
   sections with cancel and book-again actions.
2. **Status badge — booking-based states (§3)** — compute `fully_booked` and
   `booked_today` from slot availability so those badges actually render.
3. **RLS policies (§1 note, #7)** — add tenant scoping for `amenities` and
   `bookings`, plus resident-only-own-rows for `bookings`.
4. **Leftover "New Booking" deep links (#8)** —
   `src/widgets/dashboard/ui/ServicesCommandBar.tsx:60`
   (`/dashboard/services/amenities?action=new`) and
   `src/widgets/dashboard/ui/AdminCommandBar.tsx:106-107` (`new-booking`).
5. **Info modal + contact fallback (§3)** — `handleInfo` and `handleContact`
   (no-phone case) are stubs; waitlist join is a stub pending §6 Q1.

### Open questions (still undecided, §6)

1. Waitlist promotion — automatic vs. manual approval.
2. Booking window — max days-ahead limit, per amenity/tenant?
3. No-show determination — manual flag vs. automated.
4. Cancelled bookings in Past tab — show with badge or hide.
5. Non-bookable amenities without `contact_phone` — hide contact icon or route
   to generic "chat to management"?
