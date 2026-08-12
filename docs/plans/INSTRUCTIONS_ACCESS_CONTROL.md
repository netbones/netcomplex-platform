# INSTRUCTIONS: Access Control domain

## Context

This introduces visitor/vehicle access management as its own domain, distinct
from Amenities. A resident can pre-register a visitor (walk-in or vehicle) and
get a shareable code/QR for gate entry, or respond in real time when an
unplanned visitor arrives at the gate ("Access inbox" push-style requests).
Security/guard-house hardware is the consumer on the other end of these codes
and requests — this is not a closed-loop in-app feature, it integrates with
physical access control.

Three mockups were approved as the target UI and are attached alongside this
file:

- `access_control_landing` — default tab: visitor list, access inbox badge,
  quick-access-code entry point, search
- `access_inbox_live_request` — the "unplanned visitor at the gate" real-time
  allow/deny card, pushed to the resident's phone
- `admin_access_control_stream` — management/guard-desk view: live table of
  every access event across the tenant, filters, manual entry, pause stream

Read both before starting. Reference photos from a comparable vendor
(EstateMate) were also supplied for flow context — do not copy their branding,
colors, or copy; the visual language must match the existing Netcomplex design
system already used for Amenities (flat cards, status badges, tabler icons).

---

## 1. Data model

```
visitors
  id
  tenant_id
  property_id           fk -> properties.id (unit/property the visitor belongs to)
  requested_by_user_id  fk -> users.id
  full_name             text
  phone                 text (nullable)
  photo_url             text (nullable — captured at gate, or uploaded by resident)
  visitor_type          enum: walk_in | vehicle
  vehicle_reg           text (nullable — required if visitor_type = vehicle)
  role_label            text (nullable — e.g. "Uber driver", "Contractor")
  visit_type            enum: single | recurring
  valid_from            timestamptz
  valid_until           timestamptz (nullable for recurring — see recurrence_rule)
  recurrence_rule       text (nullable — RRULE-style, only for visit_type = recurring)
  status                enum: pending | active | expired | cancelled | denied
  created_at

access_codes
  id
  tenant_id
  visitor_id            fk -> visitors.id
  code                  text (6-digit, unique per tenant while active)
  qr_payload            text
  share_url             text
  used_at                nullable timestamptz (first successful gate scan)
  revoked_at             nullable timestamptz
  created_at

access_requests            -- "unplanned visitor at the gate" flow
  id
  tenant_id
  property_id           fk -> properties.id
  gate_id                fk -> gates.id (see below)
  visitor_name           text
  visitor_photo_url       text (nullable — captured live by guard-house camera/kiosk)
  role_label              text (nullable)
  vehicle_reg              text (nullable)
  status                 enum: pending | allowed | denied | expired
  requested_at             timestamptz
  responded_at              nullable timestamptz
  responded_by_user_id       fk -> users.id (nullable)
  expires_at                timestamptz   -- countdown deadline shown in the UI

gates
  id
  tenant_id
  name                  text (e.g. "Main gate", "Pedestrian gate")
  integration_type       enum: manual | third_party_api  -- see §5
  active                 boolean

access_events               -- unified audit log the admin stream reads from
  id
  tenant_id
  gate_id                fk -> gates.id
  property_id             fk -> properties.id (nullable — null for unmatched plates etc.)
  visitor_id               fk -> visitors.id (nullable — set when tied to a pre-registered visitor)
  access_request_id         fk -> access_requests.id (nullable — set when originating from §4)
  visitor_label             text (display name; for ANPR-only hits this may be
                             "Unknown plate (CA 184 421)" rather than a real name)
  vehicle_reg               text (nullable)
  state                    enum: granted | denied | pending
  method                   enum: qr | code | manual | anpr | intercom | auto_list
  actor_type                enum: resident | manager | auto_list | auto_deny | guard | awaiting_resident
  actor_user_id              fk -> users.id (nullable — null for actor_type in
                             (auto_list, auto_deny, awaiting_resident))
  occurred_at                timestamptz
```

Notes:

- `access_codes` is separate from `visitors` because a visitor can have their
  code revoked/regenerated without recreating the visitor record.
- `access_requests` is separate from `visitors` — it represents an
  _unplanned_ arrival with no prior code, sourced from gate hardware/guard
  house, not from the resident. Do not conflate the two tables; they answer
  different questions ("who did I pre-authorize" vs "who is asking right now").
- `access_events` is the append-only log every write to `visitors`,
  `access_codes`, or `access_requests` also produces a row into — it's what
  the admin stream (§7) reads from, and it's the only table that needs to
  represent every method (including `anpr` and `auto_list`/`auto_deny`
  outcomes that never touch a resident's phone). Do not have the admin
  stream query `access_requests`/`access_codes` directly and reconstruct a
  timeline in the UI layer — write to `access_events` at the same time as
  the source-of-truth table, in the same transaction, so the two can never
  drift out of sync.
- RLS: `visitors`, `access_codes`, `access_requests` scoped by `tenant_id` and
  further restricted so residents only see rows tied to their own
  `property_id`. Security/guard-house and management roles get broader
  visibility scoped to the tenant (needed for dispute resolution — this
  overlaps with DavDev's existing HOA/CSOS dispute context, so audit trail
  fields like `created_at`/`responded_by_user_id` are not optional).
- RLS: `access_events` is management/guard-desk only, tenant-scoped, no
  resident access — this is the admin-facing audit stream, not something
  surfaced on the resident's own Visitors/History tabs (those read from
  `visitors`/`access_requests` directly, scoped to the resident's own
  `property_id`, per above).

---

## 2. Navigation / IA

Tabs: `Visitors | Access inbox | History`

- **Visitors** (default landing tab) — per `access_control_landing` mockup.
  Lists visitors with `status in (pending, active)` first; search box filters
  by name/phone/reg across all statuses.
- **Access inbox** — list of `access_requests` needing a response, badge count
  on the tab showing `status = pending` count (see mockup: red badge "1"
  next to the tab label). Tapping a pending request opens the live
  allow/deny card (§4).
- **History** — read-only log of past visitors and access requests
  (`expired`, `cancelled`, `denied`, `allowed`), for the resident's own
  records and for CSOS/dispute purposes if ever needed.

Two primary CTAs on the Visitors tab: **Add new visitor** (opens the
create-visitor flow, §3) and **Quick access code** (skips the full visitor
form for a one-off code — shorter flow, name + phone only, single-visit,
short default validity e.g. 2 hours).

---

## 3. Add new visitor flow

Not mocked in detail — build following the existing form conventions used
elsewhere in the app (e.g. the booking detail flow's date/time picker
patterns). Required fields:

1. Visitor type: walk-in or vehicle (vehicle adds a registration field).
2. Name + phone (phone optional for walk-in, required for vehicle so gate
   security can call ahead if needed — confirm with DavDev whether phone
   should be mandatory in both cases).
3. Visit period: single visit (date/time range) or recurring (start date +
   recurrence rule + optional end date) — mirror the "single or multiple
   visit period" language from the reference flow.
4. Optional role label (free text, e.g. "Plumber", "Uber driver").
5. Submit → creates `visitors` row with `status = pending`, generates an
   `access_codes` row, and lands on the share screen (§3a).

### 3a. Share screen

Not mocked yet in this pass — follow the reference screen's structure but
restyle to house design system: large access code, QR code, Copy and Share
buttons, and a pre-filled message the resident can send to their visitor
(name, property, code, deep link). Include a "Delete visit" / cancel action
(sets `visitors.status = cancelled`, `access_codes.revoked_at = now()`) and a
"No access received? Report the issue here" link routed to the same
chat-to-management flow used in Amenities. Flag to DavDev whether this screen
needs its own mockup pass before build, or whether the spec above is
sufficient to implement directly.

---

## 4. Access inbox / live request flow

Reference: `access_inbox_live_request`

This is a **push-driven** flow, not something the resident navigates to
proactively in most cases — a new `access_requests` row with
`status = pending` should trigger a push notification that deep-links
straight into this card.

- Card shows visitor photo (if the gate/kiosk captured one — fall back to a
  generic person icon per the mockup), name, role/reg line, and a live
  countdown to `expires_at`.
- **Countdown behavior**: if the resident does not respond before
  `expires_at`, the request auto-transitions to `status = expired` and the
  gate hardware/guard falls back to its default policy (deny entry, or hold
  for manual guard decision — confirm with DavDev which, this is a physical
  security policy decision, not a UI one).
- **Allow** → `status = allowed`, `responded_at = now()`,
  `responded_by_user_id` set. Signal sent to the gate integration (§5) to
  open/permit entry.
- **Deny** → `status = denied`, same audit fields set. Signal sent to deny.
- Both actions must be idempotent and safe against double-tap (disable
  buttons immediately on tap, show a brief confirmation state) since this
  controls physical gate access.
- If multiple residents are linked to the same property, decide whether the
  request goes to all linked residents simultaneously (first response wins)
  or a designated primary contact only — flag to DavDev, this affects the
  notification fan-out logic.

---

## 5. Gate hardware integration

`gates.integration_type` determines how Allow/Deny and access-code
validation reach physical hardware:

- `manual` — no API integration; guard house staff independently checks the
  code/QR against what's shown in-app (visual verification only). No webhook
  needed, this is the safe default/fallback for tenants without integrated
  hardware (matches Soralia Village's likely current state — confirm with
  DavDev what gate hardware, if any, Soralia currently has before assuming an
  API-based integration is in scope for v1).
- `third_party_api` — out of scope to design in detail here; when a real
  vendor is chosen, this needs its own ADVISORY-\*.md covering the specific
  API/webhook contract. Do not build speculative integration code against an
  unspecified vendor.

**Recommendation: build `manual` mode first.** It requires no external
dependency, unblocks the resident-facing UI end to end, and the
`access_requests`/`access_codes` tables are structured so a hardware
integration can be layered in later without a schema change (guard house
staff or a kiosk app becomes another writer to `access_requests`, not a
different data model).

---

## 6. Notifications

- New `access_requests` row (`pending`) → push notification to the linked
  resident(s), deep-linking to the Access inbox live card.
- Visitor code expiring soon / expired → optional reminder, low priority,
  confirm with DavDev whether this is wanted for v1.
- Do not build notification copy/templates in this pass — routing hooks
  only, per the same boundary used in the Amenities instructions.

---

## 7. Admin access control dashboard

Reference: `admin_access_control_stream`

Management/guard-desk surface, separate from the resident-facing tabs in
§2 — reads from `access_events` (§1), not from `visitors`/`access_requests`
directly.

- **Live badge + "Streaming new events" subhead** — the table must update
  in near real time as new `access_events` rows are written, same
  websocket/short-poll requirement already established for the Security
  admin dashboard (`INSTRUCTIONS_SECURITY.md` §7) — don't build a
  page that's merely fresh on load.
- **Pause stream** — freezes the table's live updates (client-side) without
  affecting ingestion; useful when an admin is mid-investigation and
  doesn't want rows shifting under them. Resuming should backfill anything
  missed while paused, not just resume from "now."
- **Manual entry** — lets an admin/guard log an access decision that didn't
  originate from the app (e.g. a plumber let in on the guard's own
  judgment). Creates an `access_events` row with `method = manual`,
  `actor_type = guard` or `manager` (whichever role the logged-in admin
  has), `actor_user_id` set. This is a logging action, not a dispatch
  action — it does not open a physical gate; it does not require gate
  hardware integration to function, since even in `manual` gate-integration
  mode (§5) this is just a record of what the guard already did.
- **Search** — filters by visitor label, plate, or property in one field,
  matching the mockup's single combined search box.
- **Filters** — State (granted/denied/pending/any), Method (any of the
  `access_events.method` enum values), Date range (today/last 7 days/last
  30 days, or similar — confirm exact ranges with DavDev). All filters
  compose with the search box, not mutually exclusive.
- **Table columns**: Time (`occurred_at`), Visitor (`visitor_label`),
  Property (`property_id` address, or "—" when null, e.g. an unmatched
  ANPR hit with no property match), State (badge, same color convention as
  elsewhere: success/danger/warning), By (`actor_type` rendered as
  "Resident: {name}" / "Manager: {name}" / "Auto-list" / "Auto-deny" /
  "Awaiting resident" — resolve the actual name via `actor_user_id` when
  present, don't just show the enum value raw), Method (`method` enum,
  display-cased).
- **Row `⋮` menu** — at minimum: view detail (expands the full
  `access_events` row plus any linked `visitor`/`access_request` record).
  Confirm with DavDev whether additional actions belong here (e.g.
  revoking a `pending` request from the admin side, or flagging an event
  for review) — not specified by the mockup, don't invent beyond "view
  detail" without sign-off.
- **`anpr` method and unmatched plates**: an ANPR (automatic number-plate
  recognition) hit against no known `visitors.vehicle_reg` produces an
  `access_events` row with `visitor_id = null`, `property_id = null`,
  `visitor_label = "Unknown plate ({reg})"`, `state = denied`,
  `actor_type = auto_deny`. This requires an ANPR camera integration at the
  gate — **out of scope to build against a specific vendor in this pass**,
  same constraint as `third_party_api` gate integration in §5. Build the
  `access_events` schema and admin UI to display these rows correctly, but
  don't build the camera/recognition pipeline itself without a confirmed
  vendor.

---

## 8. Open questions to confirm before/during build

1. Is phone number mandatory for all visitor types, or optional for
   walk-ins?
2. What gate hardware (if any) does Soralia Village currently have, and is
   `third_party_api` integration actually in scope for v1, or is `manual`
   mode the real target?
3. Default behavior when an access request expires unanswered — deny, or
   fall back to guard's manual judgment?
4. Multi-resident properties: does an access request fan out to everyone
   linked to the property, or only a primary contact?
5. Does the share screen (§3a) need its own approved mockup before
   implementation, or is the written spec sufficient?
6. Exact date-range options for the admin dashboard filter (today / 7 days
   / 30 days / custom range)?
7. What belongs in the admin stream's per-row `⋮` menu beyond "view
   detail" — e.g. revoke a pending request, flag for review?
8. Is ANPR (automatic plate recognition) actually in scope for any near-term
   tenant, or should `access_events.method = anpr` be schema-only for now
   with no real ingestion path built?

---

## 9. Out of scope for this pass

- Guard house / kiosk-side interface (separate app or console, not this
  resident-facing mobile surface, and not the admin dashboard either —
  that's a management-facing web view, still distinct from a
  guard-operated kiosk at the gate itself).
- Real vendor gate hardware integration (`third_party_api` mode).
- Real ANPR camera/recognition vendor integration.
- Notification copy/templates.
- Recurring-visitor recurrence-rule editing UI beyond basic create (e.g. no
  mockup yet for editing an existing recurring visitor's schedule).
- Admin-side bulk actions (bulk revoke, bulk export) on the access stream.

---

## 10. Acceptance criteria

- [ ] Visitors tab is default landing view, matches `access_control_landing`
      mockup layout and status badge conventions.
- [ ] Access inbox tab shows a live badge count of pending requests.
- [ ] Add new visitor flow supports both walk-in and vehicle types, single
      and recurring visit periods.
- [ ] Quick access code path is materially shorter than the full visitor
      form.
- [ ] Live access request card matches `access_inbox_live_request` mockup,
      including countdown and Allow/Deny state handling.
- [ ] Expired, unanswered requests transition automatically and are
      reflected in History.
- [ ] All tables respect tenant + property-level RLS.
- [ ] `manual` gate integration mode works end-to-end with no external
      dependency before any `third_party_api` work begins.
- [ ] Every write to `visitors`, `access_codes`, or `access_requests` also
      produces a corresponding `access_events` row in the same transaction
      — the two are never allowed to drift.
- [ ] Admin access control dashboard updates in near real time, matches
      `admin_access_control_stream` mockup's filters, search, and table
      layout.
- [ ] `access_events` is management/guard-desk only — never exposed on any
      resident-facing screen.
- [ ] Manual entry logs an event without requiring or assuming a physical
      gate-hardware integration is present.
