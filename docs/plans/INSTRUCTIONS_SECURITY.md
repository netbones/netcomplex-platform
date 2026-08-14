# INSTRUCTIONS: Security domain (panic button / emergency response)

## Status (2026-08-13)

| Layer                 | State                                                                               |
| --------------------- | ----------------------------------------------------------------------------------- |
| UI shell (§2, §6, §7) | **Built** — resident panic page, contacts CRUD, admin dashboard                     |
| Schema + APIs         | **Built** — migration applied; panic / tips / contacts / dashboard / alert history  |
| Dispatch (§4)         | **Fails closed** — `SECURITY_DISPATCH_ENABLED` gate; SMS/push adapter **not wired** |
| Legal / seed (§8a)    | **Blocked** — disclaimer placeholder; no Soralia contact seed yet                   |
| Acceptance (§10)      | **Not verified** — criteria below are unchecked; no UAT / QA pass yet               |

**BD tracking**

| ID                     | Scope                                                | Status    |
| ---------------------- | ---------------------------------------------------- | --------- |
| `soralia-village-xpwe` | Shell (UI + APIs, fail-closed dispatch)              | ✅ closed |
| `soralia-village-bxh6` | **v1 go-live** — SMS/push, legal, seed, RLS, §10 UAT | ○ open    |
| `soralia-village-ngjk` | **v1.1** — Call resident, tip photo                  | ○ open    |

**v1 shipped (code):** hold-to-confirm panic UI, anonymous tips (tab only), contacts admin, dashboard with 10s poll, append-only status actions, honest dispatch failure → call fallbacks.

**v1 incomplete (must finish before production go-live):** track in `bxh6` — real SMS + in-app push with delivery confirmation; signed disclaimer; seeded Soralia contacts; geofence/`within_boundary` computation (currently always `null`); RLS policies on security tables (API role-gate only today).

**v1.1:** track in `ngjk` — Call resident on admin cards (§8.8); optional tip photo.

**v2:** Armed-response vendor API adapter (§4 / §8.1) — not filed yet (needs DavDev vendor name).

---

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

**Do not enable production dispatch (§3–§5) until DavDev provides signed
disclaimer copy (§8.5) and seeds real `security_contacts` for Soralia (§8a).
Product decisions in §8 are resolved; vendor API integration remains v2
(§8.1).** The UI shell (§2) is built ahead of that; dispatch fails closed so
residents are not given false confidence that help is coming.

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

**Implementation:** ✅ Prisma `security.prisma` + migration
`20260813160000_add_security_model` applied. Drizzle tables/relations wired.
Enums use Prisma casing (`PANIC`, `INTERNAL_SECURITY`, etc.).

Notes:

- `triggered_by_user_id` is nullable specifically for `anonymous_tip` alerts
  — the reporter's identity is **never shown** to other residents, board,
  or tenant security/admin UI (see §8.3). For abuse prevention and legal
  compliance, the platform **may store** the authenticated user's id
  server-side on anonymous tips, but it is excluded from all tenant-scoped
  API responses and admin surfaces.
  **Status:** ✅ Tips store `triggeredByUserId` server-side; tips API/admin
  tab omit it; resident contacts API returns public fields only.
- `within_boundary` requires a tenant-level geofence polygon (property
  boundary) to compute against. If that geofence doesn't exist yet for a
  tenant, do not block the alert on it — send the alert regardless and log
  `within_boundary = null`. **Never silently drop or delay a panic alert
  because location data is incomplete or ambiguous.**
  **Status:** ⬜ Always written as `null` today — geofence compute is
  **v1 incomplete** (not blocking alerts).
- RLS: `security_alerts` visible to the triggering resident (except
  anonymous ones, per above), plus security/management roles at the tenant
  level. This table is an audit trail with real-world safety and liability
  weight — do not allow deletion, only status transitions.
  **Status:** ⬜ No RLS policies on security tables yet (API
  `requireAuth` / admin permission + module gate only) — **v1 incomplete**,
  same debt pattern as other new domains.
- RLS: `security_contacts` is readable by all residents on the tenant (so
  `Call security` and the contacts list work for everyone), but writable
  (create/edit/delete/set-default) only by management or admin roles —
  never by a regular resident. This is enforced both at the API layer and
  restated in the UI (see §6) so residents aren't shown controls they can't
  use.
  **Status:** ✅ API + overflow menu role-gated; RLS still outstanding.

---

## 2. Screen layout

Reference: `security_panic_screen_v2` — **✅ built** (`/security`)

- **Overflow menu (`⋮`)**, top right — opens: "Manage security contacts"
  (§6) and "View alert history" (a filtered view into the resident's own
  `security_alerts` rows, reusing the History pattern already established
  for Amenities/Access Control — no separate mockup needed, follow that
  existing list convention).
  **Status:** ✅ Admin-only manage link; history at `/security/history`
  via `GET /api/security/alerts` (panic-only, own rows).
- **Panic button** — full-width prominent button, danger-colored, always the
  single most visually dominant element on the screen. Tapping it does not
  fire immediately (see §3 confirmation step) — it opens a confirmation
  state, it does not silently dispatch on first tap.
  **Status:** ✅ Hold-to-confirm (`HoldPanicButton`, 3s).
- Caption below the button: static disclaimer text that alerts only work
  within the community boundary — copy to be confirmed with DavDev/legal,
  do not alter the meaning of this sentence without sign-off since it sets
  resident expectations about coverage.
  **Status:** ✅ Placeholder copy present; legal sign-off still open (§8a).
- **Anonymous tip-off** — opens a short form (free text + optional photo,
  no location requirement) that creates a `security_alerts` row with
  `alert_type = anonymous_tip`. This is not urgent-response routed the same
  way as a panic alert — tips land in the admin **Anonymous tips** tab only
  (§7, §8.4); no dispatch/SMS in v1.
  **Status:** ✅ Free-text tip form + `POST /api/security/tips`. ⬜ Optional
  photo upload **not built** — defer to **v1.1** unless product re-prioritises.
- **Call response** — two tap-to-call shortcuts. `Call 10111` dials South
  Africa's national emergency number directly (`tel:10111`), no in-app
  logic needed beyond firing the system dialer. `Call security` dials the
  tenant's `security_contacts` row where `is_default_call_target = true`.
  These are just `tel:` links — they must work with zero dependency on
  backend availability, since network issues are exactly when a resident
  might need to fall back to a plain phone call.
  **Status:** ✅ Implemented.
- **Security disclaimer** link at the bottom — static content page/modal,
  copy owned by **DavDev + legal counsel** (§8.5). Agent must not draft
  production disclaimer text; dev/staging may use a visible
  `[PENDING LEGAL SIGN-OFF]` placeholder until signed copy is loaded.
  **Status:** ✅ `/security/disclaimer` with pending placeholder.

---

## 3. Panic button trigger flow

1. Tap panic button → **confirmation step**, not immediate dispatch. Use
   **hold-to-confirm (3 seconds)**: resident presses and holds the panic
   button; a progress ring fills over 3s; releasing early cancels. On
   completion, dispatch proceeds. This pattern minimizes pocket-dial false
   alarms while staying faster than a separate confirmation screen + countdown
   (see §8.2).
   **Status:** ✅
2. On confirm: capture device GPS location. If location permission is
   denied or unavailable, **still send the alert** with
   `latitude/longitude = null` rather than blocking — a panic alert with no
   location is still far more useful than no alert at all.
   **Status:** ✅ Client captures GPS best-effort; API accepts nulls.
3. Create `security_alerts` row (`alert_type = panic`, `status = sent`).
   **Status:** ✅ `POST /api/security/panic`
4. Dispatch to the configured response channel — see §4. This must happen
   synchronously enough that the resident gets confirmation the alert was
   sent, not just that the local record was created. Do not mark the UI as
   "sent" if the dispatch call to the security provider actually failed —
   surface a clear failure state and prompt the resident to use the
   `Call security` / `Call 10111` fallback immediately.
   **Status:** ✅ Failure path marks `FAILED` + UI error/fallbacks.
   SMS/push adapter itself is **not wired** (§4).
5. Show a persistent in-app state (not just a toast) while `status` is
   `sent` or `acknowledged` — e.g. "Alert sent — security has been
   notified" with a way to see status update to `responding`/`resolved`.
   Resident should never be left wondering whether the button "worked."
   **Status:** 🟡 Persistent message on send/fail. Live status progression
   on the panic screen itself is minimal (history page shows later status) —
   polish if needed before go-live.

---

## 4. Dispatch integration

**Do not build against a specific armed-response/security vendor API without
DavDev confirming which provider(s) Soralia Village (and future tenants)
actually use.** This varies per estate and is a hard external dependency —
speculative integration code here is wasted work at best and a false-safety
liability at worst.

Build the dispatch layer behind an interface so the initial implementation
can be:

- **v1 (safe default — ship this)**: alert creation triggers **SMS + in-app
  push** to the tenant's default `internal_security` contact (community
  security desk). Armed-response rows in `security_contacts` are **`tel:`
  shortcuts only** in v1 — no vendor API. Soralia Village seeds its real desk
  numbers manually before go-live; mockup labels like "SecureForce" are
  illustrative, not a vendor integration commitment (see §8.1).
  **Status:** 🟡 Interface exists (`dispatchPanicAlert`); returns failure
  unless `SECURITY_DISPATCH_ENABLED=true`, and even then fails closed until
  SMS/push is wired. **v1 incomplete — go-live blocker.**
- **v2 (future)**: pluggable adapter per tenant for a real armed-response
  provider's API, once DavDev confirms the vendor. Schema (`security_contacts.
contact_type`) already anticipates this.
  **Status:** ⬜ Deferred to **v2**.

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
  **Status:** ✅ Failure message + call buttons remain available.
- Log every `security_alerts` status transition with a timestamp for audit
  purposes — this data may matter for real incident review, insurance, or
  a dispute, consistent with the record-keeping rigor already expected
  elsewhere in DavDev's HOA/CSOS work.
  **Status:** 🟡 Status + actor timestamps on acknowledge/responding/resolve;
  no separate append-only event/audit table yet (acceptable for v1 shell;
  revisit if CSOS needs a full timeline).
- Alerts must never be edited or deleted after creation, only appended to
  via status transitions.
  **Status:** ✅ No edit/delete alert APIs; status PATCH only.

---

## 6. Manage security contacts flow

References: `manage_security_contacts` (list), `add_edit_security_contact`
(form) — **✅ built** (`/admin/security/contacts`)

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
  **Status:** ✅
- Each row shows label, phone, contact type icon, edit icon; non-default
  rows also get a "set as default" (star) action.
  **Status:** ✅ (type shown as label text, not a dedicated icon set)
- Setting a new default must be atomic — flipping one row's
  `is_default_call_target` to `true` must flip any previously-default row
  to `false` in the same transaction. Never allow two contacts to be
  default simultaneously, since `Call security` on the main screen resolves
  to whichever row has that flag set.
  **Status:** ✅ `setDefaultSecurityContact` / `clearDefaultSecurityContact`
- "Add" button opens the form (below) with no pre-filled values.
  **Status:** ✅
- Tapping a row's edit icon opens the same form pre-filled for that row.
  **Status:** ✅

**Add/edit form (`add_edit_security_contact`)**:

- Fields: label (free text), phone (required — this is a `tel:` target, an
  empty or malformed number breaks the main screen's "Call security"
  button, so validate format before save), contact type (radio: internal
  security / armed response / emergency services), and a "set as default"
  checkbox.
  **Status:** ✅ Zod-validated form
- If "set as default" is checked, apply the same atomic single-default
  transaction described above on save.
  **Status:** ✅
- Deleting a contact: if it's the current default, **block the delete** and
  show inline guidance: "Set another contact as default before deleting this
  one." Never leave `Call security` with zero default (see §8.6).
  **Status:** ✅ API 409 + form surfaces error
- Save/Cancel — standard form conventions already used elsewhere in the
  app (e.g. the booking detail flow), no new pattern needed.
  **Status:** ✅

---

## 7. Admin security dashboard

Reference: `admin_security_dashboard` — **✅ built** (`/admin/security`)

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
**Status:** ✅ Panic-only live query; tips stay on their own tab.

**State machine** — enforce these as the only legal transitions, each
writing its own actor + timestamp:

```
sent -> acknowledged   (acknowledged_at, acknowledged_by_user_id)
acknowledged -> responding   (manual admin action — "Mark responding", see §8.7)
responding -> resolved   (resolved_at, resolved_by_user_id)
sent -> failed             (dispatch failure, see §5 — not admin-triggered)
```

Acknowledge and Resolve are deliberately separate actions/buttons, not one
toggle — "someone has seen this" and "this is actually over" are different
facts, and given DavDev's ongoing CSOS/dispute work, the audit trail should
distinguish them rather than collapse to a single timestamp. **`responding`
is a distinct manual step** between acknowledge and resolve (see §8.7).
**Status:** ✅ `PATCH /api/admin/security/alerts/[id]` actions.

**Card actions**:

- `Acknowledge` — sets `acknowledged_at`/`acknowledged_by_user_id`, moves
  card state, does not remove it from the live stream.
  **Status:** ✅
- `Mark responding` — sets status to `responding` (no extra timestamp column
  in v1 — `updated_at` on the row suffices; optional note field deferred).
  Available only after acknowledge.
  **Status:** ✅
- `Mark resolved` — sets `resolved_at`/`resolved_by_user_id`, moves the
  row out of the live stream into Resolved.
  **Status:** ✅
- `View on map` — opens the alert's `latitude`/`longitude` on a map view;
  if null (location unavailable, per §3 step 2), show that explicitly
  rather than a broken/blank map.
  **Status:** ✅ External maps link or "No GPS for map"
- `Call resident` — **deferred to v1.1** (§8.8). Not shown in v1 admin
  dashboard cards. When it ships, join via `triggered_by_user_id` → user
  phone; never for `anonymous_tip` rows.
  **Status:** ⬜ **v1.1**

**Anonymous tips tab** — read-only list of `alert_type = anonymous_tip`
rows, deliberately visually de-emphasized in the mockup (lower-contrast
card) since these are not urgent-response items the way panic alerts are.
Tips are **not** mixed into the live panic stream (§8.4).
**Status:** ✅ Message-only cards; no reporter identity.

**Live-update requirement**: "Live stream" must actually update in near
real time (new alerts appear without a manual refresh, elapsed-time labels
tick, status changes reflect other admins' actions) — this is a websocket
or short-poll requirement, not a page that's merely fresh on load. Flag
this explicitly to whoever scopes the infra work; it's a materially
different requirement than the mostly-static admin views elsewhere in the
platform (e.g. Amenities config).
**Status:** 🟡 10s short-poll implemented. Not websocket; not UAT'd for
latency under load.

**Manage contacts** entry point in the header routes to the same
`manage_security_contacts` / `add_edit_security_contact` flow from §6 —
do not build a second, separate contacts UI for admin. This dashboard is
where defaults actually get set in practice, but the underlying screens
and role gate are shared with §6, not duplicated.
**Status:** ✅ Shared contacts routes.

---

## 8. Decisions (resolved 2026-08-13)

1. **Security / armed-response provider (Soralia v1)** — **No third-party
   vendor API in v1.** Dispatch = SMS + in-app push to the tenant's default
   `internal_security` contact. `armed_response` contacts exist as configured
   `tel:` targets only (`Call security` / contacts list). v2 vendor adapter
   waits on DavDev naming the actual provider. Mockup names (e.g.
   "SecureForce") are placeholders — seed Soralia's real desk numbers before
   go-live.
2. **Panic confirmation UX** — **Hold-to-confirm, 3 seconds.** Press and
   hold the panic button; progress ring fills over 3s; release early =
   cancel. Faster than a two-step tap + countdown screen; safer against
   pocket dials than single-tap or double-tap.
3. **Anonymous tip identity scope** — **Anonymous to residents, board, and
   tenant security/admin UI.** `triggered_by_user_id` is stored server-side
   for authenticated submitters (abuse audit, legal subpoena) but **never
   returned** in tenant-scoped APIs or shown on the Anonymous tips tab.
   Platform break-glass access is out of scope for v1 UI.
4. **Anonymous tip routing** — **Anonymous tips tab only** (admin dashboard).
   Tips do **not** enter the live panic stream and do **not** trigger
   dispatch/SMS in v1. Management triages at lower urgency.
5. **Disclaimer ownership** — **DavDev + legal counsel** sign off before
   production. Link targets a static page/CMS entry; no agent-drafted copy
   ships to residents.
6. **Delete default contact** — **Block delete** when `is_default_call_target
= true`. Error: set another default first. Same "never leave a broken
   primary action" rule as amenity delete-with-bookings (Policy A).
7. **`responding` state** — **Distinct manual admin action.** Flow:
   `Acknowledge` → optional **Mark responding** → **Mark resolved**.
   Acknowledge alone does not auto-advance to `responding`.
8. **Call resident (admin dashboard)** — **Defer to v1.1.** v1 card actions:
   Acknowledge, Mark responding, Mark resolved, View on map only. When v1.1
   ships, join `triggered_by_user_id` → user phone; hide entirely for
   `anonymous_tip` rows.

### 8a. Still requires DavDev before go-live (not open product questions)

These are operational gates, not build blockers for the UI shell:

- **Legal sign-off** on disclaimer copy (§8.5) before enabling dispatch in
  production. ⬜
- **Seed real `security_contacts`** for Soralia (desk numbers, default
  target) before go-live. ⬜
- **Named armed-response vendor** only needed for §4 v2 adapter work. ⬜

### 8b. Version backlog (code follow-ups)

| Version                     | Items                                                                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **v1 incomplete (go-live)** | Wire SMS + push with delivery confirmation; enable only after §8a; seed contacts; optional geofence → `within_boundary`; RLS policies for security tables |
| **v1.1**                    | Call resident on admin cards; optional tip photo upload                                                                                                   |
| **v2**                      | Pluggable armed-response vendor API adapter                                                                                                               |

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
- **Call resident** on admin dashboard cards (v1.1 — §8.8).
- Platform break-glass UI for anonymous-tip submitter identity (stored
  server-side per §8.3 but no operator tooling in v1).
- Optional anonymous-tip **photo** upload (listed in §2; not built — v1.1).

---

## 10. Acceptance criteria

**Not tested.** Boxes stay unchecked until a human/UAT pass against a
tenant with seeded contacts. Implementation claims in §1–§7 are
code-complete markers only — they do **not** mean these criteria passed.

- [ ] Panic button requires an explicit confirmation step before dispatch —
      never fires on a single accidental tap (**hold-to-confirm 3s**, §8.2).
- [ ] Alert is sent even when GPS location is unavailable or denied.
- [ ] UI never claims an alert was sent if the dispatch call actually failed
      — failure state surfaces the call fallbacks immediately.
- [ ] `Call 10111` and `Call security` work independent of backend/network
      availability (plain `tel:` links).
- [ ] Anonymous tip-off never exposes submitter identity in tenant-scoped UI
      or APIs; server-side storage per §8.3 is acceptable.
- [ ] All `security_alerts` rows are append-only (status transitions logged,
      no edit/delete).
- [ ] No vendor-specific dispatch integration in v1 (§8.1); SMS/push to
      default internal security contact only.
      _(Note: SMS/push adapter itself is still unwired — fail-closed is
      intentional until §8a + §4 complete.)_
- [ ] Only management/admin roles can see or use "Manage security contacts";
      regular residents don't see the option in the overflow menu.
- [ ] Exactly one `security_contacts` row per tenant is ever
      `is_default_call_target = true`, enforced atomically on every write.
- [ ] Deleting the default contact is blocked until another default is set
      (§8.6).
- [ ] Admin dashboard's Live stream tab updates in near real time without a
      manual page refresh.
      _(Note: 10s poll is implemented; not load-tested.)_
- [ ] Acknowledge, Mark responding, and Resolve are logged as distinct
      actions with separate actor + timestamp fields (§8.7).
- [ ] Anonymous tips appear only on the Anonymous tips tab, not the live
      panic stream (§8.4).
- [ ] Anonymous tip rows never expose a resident identity anywhere in the
      admin dashboard (including no Call resident in v1, §8.8).
