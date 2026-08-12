# INSTRUCTIONS: Security domain (panic button / emergency response)

## Context

This is a life-safety feature, not a convenience feature — treat it with a
different bar for reliability, failure handling, and legal review than
Amenities or Access Control. A resident triggers a GPS-located panic alert
that must reach a real human (community security and/or armed response) with
minimal latency and no silent failure modes.

Four mockups were approved as the target UI, attached alongside this file:

- `security_panic_screen_v2` — current version of the main screen: panic
  button, anonymous tip-off, call-response shortcuts (10111 / community
  security), disclaimer link, and an overflow (`⋮`) menu. Supersedes the
  earlier flat `security_panic_screen` draft — build against v2.
- `manage_security_contacts` — opened from the overflow menu's "Manage
  security contacts" item. Lists contacts with a default-call-target
  indicator, edit and set-default actions.
- `add_edit_security_contact` — the add/edit form for a single
  `security_contacts` row, opened from the list's "Add" button or a
  contact's edit icon.
- `admin_security_dashboard` — management/security-desk view: stat tiles,
  live incident stream with acknowledge/resolve actions, resolved and
  anonymous-tips tabs, entry point into the contacts flow above.

A reference screen from a comparable vendor was supplied for flow context
only — do not copy branding, colors, or copy; match the existing Netcomplex
design system already used for Amenities and Access Control.

**Do not begin building the panic-trigger and dispatch pipeline (§3–§5)
without DavDev explicitly confirming the security/armed-response provider
integration and reviewing the security disclaimer copy with appropriate
legal input first.** The UI shell (§2) can be built ahead of that, but must
not go live wired to a fake/no-op backend that could give residents false
confidence that help is coming.

---

## 1. Data model

```
security_alerts
  id
  tenant_id
  property_id            fk -> properties.id
  triggered_by_user_id   fk -> users.id (nullable if anonymous — see below)
  alert_type             enum: panic | anonymous_tip
  latitude               numeric (nullable — see §3 on GPS handling)
  longitude               numeric (nullable)
  location_accuracy_m     numeric (nullable)
  within_boundary          boolean (nullable — computed against tenant geofence)
  message                 text (nullable — free text for anonymous tips)
  status                  enum: sent | acknowledged | responding | resolved | failed
  created_at
  acknowledged_at          nullable timestamptz
  acknowledged_by_user_id   nullable fk -> users.id (admin/security staff)
  resolved_at              nullable timestamptz
  resolved_by_user_id       nullable fk -> users.id (admin/security staff)

security_contacts
  id
  tenant_id
  label                  text (e.g. "Community security", "Armed response")
  phone                  text
  contact_type           enum: internal_security | emergency_services | armed_response
  is_default_call_target  boolean
  created_by_user_id      fk -> users.id
  created_at
  updated_at
```

Notes:

- `triggered_by_user_id` is nullable specifically for `anonymous_tip` alerts
  — the whole point of that path is the reporter's identity is not attached
  to the record residents/board can see. Confirm with DavDev whether
  "anonymous" means anonymous to other residents/board only, or fully
  anonymous even from Netbones/Netcomplex operators — this has real privacy
  and liability implications and must be decided before building, not
  inferred.
- `within_boundary` requires a tenant-level geofence polygon (property
  boundary) to compute against. If that geofence doesn't exist yet for a
  tenant, do not block the alert on it — send the alert regardless and log
  `within_boundary = null`. **Never silently drop or delay a panic alert
  because location data is incomplete or ambiguous.**
- RLS: `security_alerts` visible to the triggering resident (except
  anonymous ones, per above), plus security/management roles at the tenant
  level. This table is an audit trail with real-world safety and liability
  weight — do not allow deletion, only status transitions.
- RLS: `security_contacts` is readable by all residents on the tenant (so
  `Call security` and the contacts list work for everyone), but writable
  (create/edit/delete/set-default) only by management or admin roles —
  never by a regular resident. This is enforced both at the API layer and
  restated in the UI (see §6) so residents aren't shown controls they can't
  use.

---

## 2. Screen layout

Reference: `security_panic_screen_v2`

- **Overflow menu (`⋮`)**, top right — opens: "Manage security contacts"
  (§6) and "View alert history" (a filtered view into the resident's own
  `security_alerts` rows, reusing the History pattern already established
  for Amenities/Access Control — no separate mockup needed, follow that
  existing list convention).
- **Panic button** — full-width prominent button, danger-colored, always the
  single most visually dominant element on the screen. Tapping it does not
  fire immediately (see §3 confirmation step) — it opens a confirmation
  state, it does not silently dispatch on first tap.
- Caption below the button: static disclaimer text that alerts only work
  within the community boundary — copy to be confirmed with DavDev/legal,
  do not alter the meaning of this sentence without sign-off since it sets
  resident expectations about coverage.
- **Anonymous tip-off** — opens a short form (free text + optional photo,
  no location requirement) that creates a `security_alerts` row with
  `alert_type = anonymous_tip`. This is not urgent-response routed the same
  way as a panic alert — confirm with DavDev whether tips go to
  security's queue or a separate community-management inbox.
- **Call response** — two tap-to-call shortcuts. `Call 10111` dials South
  Africa's national emergency number directly (`tel:10111`), no in-app
  logic needed beyond firing the system dialer. `Call security` dials the
  tenant's `security_contacts` row where `is_default_call_target = true`.
  These are just `tel:` links — they must work with zero dependency on
  backend availability, since network issues are exactly when a resident
  might need to fall back to a plain phone call.
- **Security disclaimer** link at the bottom — static content page/modal,
  copy owned by DavDev/legal, not to be drafted by the agent.

---

## 3. Panic button trigger flow

1. Tap panic button → **confirmation step**, not immediate dispatch. Show a
   brief (2–3 second) countdown or a clear "Hold to confirm" / "Confirm
   alert" interaction — prevents accidental pocket-taps from dispatching a
   false alarm, while staying fast enough not to slow down a real emergency.
   Confirm the exact interaction pattern (countdown vs hold vs tap-twice)
   with DavDev before building — this is a UX decision with real safety
   tradeoffs, not a cosmetic one.
2. On confirm: capture device GPS location. If location permission is
   denied or unavailable, **still send the alert** with
   `latitude/longitude = null` rather than blocking — a panic alert with no
   location is still far more useful than no alert at all.
3. Create `security_alerts` row (`alert_type = panic`, `status = sent`).
4. Dispatch to the configured response channel — see §4. This must happen
   synchronously enough that the resident gets confirmation the alert was
   sent, not just that the local record was created. Do not mark the UI as
   "sent" if the dispatch call to the security provider actually failed —
   surface a clear failure state and prompt the resident to use the
   `Call security` / `Call 10111` fallback immediately.
5. Show a persistent in-app state (not just a toast) while `status` is
   `sent` or `acknowledged` — e.g. "Alert sent — security has been
   notified" with a way to see status update to `responding`/`resolved`.
   Resident should never be left wondering whether the button "worked."

---

## 4. Dispatch integration

**Do not build against a specific armed-response/security vendor API without
DavDev confirming which provider(s) Soralia Village (and future tenants)
actually use.** This varies per estate and is a hard external dependency —
speculative integration code here is wasted work at best and a false-safety
liability at worst.

Build the dispatch layer behind an interface so the initial implementation
can be:

- **v1 (safe default)**: alert creation triggers an SMS/push/call to the
  tenant's configured `security_contacts` (community security desk), not a
  third-party API. This requires no vendor integration and is honest about
  what it does — notifies the humans configured for that estate.
- **v2 (future)**: pluggable adapter per tenant for a real armed-response
  provider's API, once one is confirmed. Schema (`security_contacts.
contact_type`) already anticipates this.

Whichever v1 channel is chosen (SMS gateway, push notification, or a
placed phone call via a telephony provider), it must have its own delivery
confirmation and retry — a fire-and-forget notification with no delivery
guarantee is not acceptable for this feature.

---

## 5. Failure handling (mandatory, not optional polish)

- If the dispatch in §4 fails or times out, the resident-facing UI must
  show this clearly and immediately surface the `Call 10111` / `Call
security` buttons as the fallback — do not fail silently or show a
  generic error.
- Log every `security_alerts` status transition with a timestamp for audit
  purposes — this data may matter for real incident review, insurance, or
  a dispute, consistent with the record-keeping rigor already expected
  elsewhere in DavDev's HOA/CSOS work.
- Alerts must never be edited or deleted after creation, only appended to
  via status transitions.

---

## 6. Manage security contacts flow

References: `manage_security_contacts` (list), `add_edit_security_contact`
(form)

This is the setup/admin path behind the overflow menu — infrequent, so it's
kept off the main panic screen entirely (see §2). Build access-gated: only
management/admin roles reach this flow (§1 RLS note); a regular resident
should not see "Manage security contacts" in their overflow menu at all,
not just have the buttons disabled — don't show controls a role can't use.

**List screen (`manage_security_contacts`)**:

- Default call target shown as its own highlighted row at the top (accent
  border + "Default" badge), separate from the "Other contacts" list below
  it, matching the mockup — this reflects that exactly one
  `security_contacts` row per tenant should have
  `is_default_call_target = true` at any time.
- Each row shows label, phone, contact type icon, edit icon; non-default
  rows also get a "set as default" (star) action.
- Setting a new default must be atomic — flipping one row's
  `is_default_call_target` to `true` must flip any previously-default row
  to `false` in the same transaction. Never allow two contacts to be
  default simultaneously, since `Call security` on the main screen resolves
  to whichever row has that flag set.
- "Add" button opens the form (below) with no pre-filled values.
- Tapping a row's edit icon opens the same form pre-filled for that row.

**Add/edit form (`add_edit_security_contact`)**:

- Fields: label (free text), phone (required — this is a `tel:` target, an
  empty or malformed number breaks the main screen's "Call security"
  button, so validate format before save), contact type (radio: internal
  security / armed response / emergency services), and a "set as default"
  checkbox.
- If "set as default" is checked, apply the same atomic single-default
  transaction described above on save.
- Deleting a contact: if it's the current default, block the delete (or
  require picking a new default first) rather than silently leaving
  `Call security` pointed at nothing — confirm the exact UX for this edge
  case with DavDev, but the underlying rule (never leave zero or the wrong
  default set) is not optional.
- Save/Cancel — standard form conventions already used elsewhere in the
  app (e.g. the booking detail flow), no new pattern needed.

---

## 7. Admin security dashboard

Reference: `admin_security_dashboard`

Separate surface from the resident-facing panic screen — built for
management/security-desk roles (same role gate as §6). Shows stat tiles
(active now, today, avg response time, month total — computed from
`security_alerts`, not hardcoded) and a tabbed incident view: **Live
stream** (default), **Resolved**, **Anonymous tips**.

**Live stream** — every `security_alerts` row with
`status in (sent, acknowledged, responding)`, most recent first. Each card
shows alert type, resident name (or "Anonymous tip-off" with no name, per
§1's identity rule), elapsed time since `created_at`, location line
(`property_id` address, plus "within boundary" / "outside boundary" /
blank if `within_boundary` is null per §1), and who's acknowledged it if
anyone has.

**State machine** — enforce these as the only legal transitions, each
writing its own actor + timestamp:

```
sent -> acknowledged   (acknowledged_at, acknowledged_by_user_id)
acknowledged -> responding   (optional intermediate state — confirm with
                               DavDev whether this is a distinct admin
                               action or implied by acknowledgement)
responding -> resolved   (resolved_at, resolved_by_user_id)
sent -> failed             (dispatch failure, see §5 — not admin-triggered)
```

Acknowledge and Resolve are deliberately separate actions/buttons, not one
toggle — "someone has seen this" and "this is actually over" are different
facts, and given DavDev's ongoing CSOS/dispute work, the audit trail should
distinguish them rather than collapse to a single timestamp. Confirm this
two-step model with DavDev before building if there's a simpler existing
convention elsewhere in the app worth reusing instead.

**Card actions**:

- `Acknowledge` — sets `acknowledged_at`/`acknowledged_by_user_id`, moves
  card state, does not remove it from the live stream.
- `Mark resolved` — sets `resolved_at`/`resolved_by_user_id`, moves the
  row out of the live stream into Resolved.
- `View on map` — opens the alert's `latitude`/`longitude` on a map view;
  if null (location unavailable, per §3 step 2), show that explicitly
  rather than a broken/blank map.
- `Call resident` — **not currently supported by the schema as written**.
  Requires joining to the triggering resident's phone number (via
  `users`/`property_id`), which is fine for non-anonymous alerts but must
  never resolve to anything for `anonymous_tip` rows — don't let this
  button leak an identity that §1 explicitly keeps anonymous. Confirm with
  DavDev whether this action ships in v1 or is deferred; if it ships, add
  the necessary join/lookup, not a new column on `security_alerts`.

**Anonymous tips tab** — read-only list of `alert_type = anonymous_tip`
rows, deliberately visually de-emphasized in the mockup (lower-contrast
card) since these are not urgent-response items the way panic alerts are.
Routing/triage of tips (§8 open question 4) still needs to be confirmed —
this tab is just the display, not the resolution of that open question.

**Live-update requirement**: "Live stream" must actually update in near
real time (new alerts appear without a manual refresh, elapsed-time labels
tick, status changes reflect other admins' actions) — this is a websocket
or short-poll requirement, not a page that's merely fresh on load. Flag
this explicitly to whoever scopes the infra work; it's a materially
different requirement than the mostly-static admin views elsewhere in the
platform (e.g. Amenities config).

**Manage contacts** entry point in the header routes to the same
`manage_security_contacts` / `add_edit_security_contact` flow from §6 —
do not build a second, separate contacts UI for admin. This dashboard is
where defaults actually get set in practice, but the underlying screens
and role gate are shared with §6, not duplicated.

---

## 8. Open questions to confirm before/during build

1. Which security/armed-response provider(s) does Soralia Village (and any
   other early tenant) actually use today? Determines whether v1 dispatch
   (§4) is SMS-to-guard-desk or something else.
2. Confirmation interaction on the panic button — countdown, hold-to-confirm,
   or double-tap? Needs a UX + safety-tradeoff decision, not an assumption.
3. Is "anonymous" tip-off anonymous to the board/security only, or also to
   Netbones/Netcomplex as the platform operator? Affects what's stored in
   `triggered_by_user_id`.
4. Where does anonymous tip-off content route — security's live queue, or a
   separate community-management inbox reviewed less urgently?
5. Who owns and signs off on the security disclaimer copy before it ships?
6. What should happen when management tries to delete the current default
   security contact — block outright, or force picking a replacement
   default first?
7. Does the admin dashboard need a distinct `responding` state as a manual
   admin action, or is it implied automatically once `acknowledged`?
8. Does "Call resident" ship in v1 of the admin dashboard, and if so, what's
   the correct data join to reach their phone number without touching
   anonymous-tip identity protections?

---

## 9. Out of scope for this pass

- Any specific third-party armed-response API integration (§4 v2).
- Geofence/boundary polygon editor for tenants (assume manual seed or
  none — `within_boundary` degrades gracefully to null).
- Full incident review/reporting/export dashboard beyond the live
  stream + resolved/tips tabs shown in the mockup.
- Push notification templates/copy.
- Bulk-import of security contacts (single add/edit only, per mockup).
- Live map clustering or multi-alert map view (single-alert "View on map"
  only for this pass).

---

## 10. Acceptance criteria

- [ ] Panic button requires an explicit confirmation step before dispatch —
      never fires on a single accidental tap.
- [ ] Alert is sent even when GPS location is unavailable or denied.
- [ ] UI never claims an alert was sent if the dispatch call actually failed
      — failure state surfaces the call fallbacks immediately.
- [ ] `Call 10111` and `Call security` work independent of backend/network
      availability (plain `tel:` links).
- [ ] Anonymous tip-off never stores `triggered_by_user_id` for that alert
      type.
- [ ] All `security_alerts` rows are append-only (status transitions logged,
      no edit/delete).
- [ ] No vendor-specific dispatch integration is built before DavDev
      confirms the actual provider.
- [ ] Only management/admin roles can see or use "Manage security contacts";
      regular residents don't see the option in the overflow menu.
- [ ] Exactly one `security_contacts` row per tenant is ever
      `is_default_call_target = true`, enforced atomically on every write.
- [ ] Deleting or unsetting the default contact cannot silently leave
      `Call security` pointed at nothing.
- [ ] Admin dashboard's Live stream tab updates in near real time without a
      manual page refresh.
- [ ] Acknowledge and Resolve are logged as distinct actions with separate
      actor + timestamp fields, never collapsed into one status flip.
- [ ] Anonymous tip-off rows never expose a resident identity anywhere in
      the admin dashboard, including via the "Call resident" action.
