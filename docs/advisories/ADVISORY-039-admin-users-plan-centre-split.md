---
title: ADVISORY-039: Split Admin Users Management from Self-Service Billing & Plan Centre
status: proposed
reviewed: 2026-08-14
tags: [advisory, architecture, admin, billing]
audience: developer
---

# ADVISORY-039: Split Admin Users Management from Self-Service Billing & Plan Centre

**Status:** Execution-ready (Discovery ✅, all gates G0–G5 resolved ✅)
**Priority:** Medium-High (scope-of-power correctness; not blocking but actively risky as-is)
**Related Advisories:** ADVISORY-038 (Resident Self-Registration — this advisory's Amendment A resolves ADVISORY-038 Gate placement)
**Related Docs:** IDENTITY_MODEL.md (Seat pricing: Solo Seat liberation fee, Premium Seat volume pricing, complimentary board allocation), UBIQUITOUS_LANGUAGE.md (Role, Seat)
**Source:** DavDev screenshots of `/admin/users`, 2026-08-14

---

## Amendment B — Complimentary seat path is schema-only, not UI-wired

The discovery checklist (§5 item 3) surfaced that `isComplimentary` exists as a DB column on `soloSeats` (`src/db/schema/solo-seats.ts:12`, `notNull default false`) and is read by `SoloSeatWidget.tsx` to render a "Complimentary Board Seat" badge, but **no admin UI path sets it today**. `AllocateSeatModal.tsx` does not expose the field and `AllocateSeatFormData` (`src/entities/user/model/types.ts:86`) does not declare it. Every seat the admin currently allocates is `isComplimentary: false` at the DB layer.

**Phase 3 must therefore include:**

1. Adding `isComplimentary` to `AllocateSeatFormData` and the solo-seat allocate zod schema (`src/server/routers/core/soloSeats.ts:41`).
2. The new "Grant complimentary seat" action explicitly setting the flag, with a confirmation step that surfaces the IDENTITY_MODEL.md rule (board/committee only, five-seat allocation).
3. The standard paid-seat allocation path leaving `isComplimentary: false` (default).

This is bigger than the advisory's §6 Phase 3 originally assumed — the path does not exist to preserve, it has to be built.

## Amendment C — `Public Profile` toggle has no resident write surface today

The discovery checklist (§5 item 4) found that `PrivacySection.tsx` covers `Show Email` and `Show Phone` but **does not cover the third `Public Profile` toggle** listed in §1 of this advisory. There is no resident-facing write path for that flag today.

**Gate G4-preliminary decision required before Phase 4 begins:**

- (a) Extend `PrivacySection.tsx` to include the public-profile toggle, then remove the admin write path; OR
- (b) Rescope the advisory — confirm with DavDev that "Public Profile" is a different concept (e.g., a directory listing opt-out living elsewhere) and only the two existing toggles are in scope; OR
- (c) Keep a narrowly-scoped admin override for `Public Profile` only and remove only the email/phone write paths.

Default assumption for planning: **(a)** unless DavDev confirms otherwise at Gate G4.

---

## Amendment A to ADVISORY-038 (Phase 3 placement)

The admin Users overview already renders a `Pending` stat card, currently static at `0` with no wired data source. `PropertyJoinRequest` queue items (ADVISORY-038 §6 Phase 3) should populate this card directly, and the queue itself should render as a `status = Pending` filter within the existing Users table rather than a separate page — the roster is already the right domain, it's the row-level UI inside it that needs to change (this advisory).

---

## 1. Problem Statement

The current `/admin/users` page (`UserTable.tsx` + expandable `UserEditRow.tsx`) lets an admin, in one inline expandable row, simultaneously: edit identity/contact fields, allocate or remove a Solo Seat, toggle profile/email/phone visibility, change role, and delete the user outright — all behind one `Save` button and one trash icon, with no distinction between "administrative correction" and "financial/plan action."

This conflates three things that have different owners:

1. **Roster & access** — who is a member, what role/status they hold, whether they've been invited. This is legitimately the admin's job.
2. **Seat/plan allocation** — Solo Seat, Premium Seat. Per IDENTITY_MODEL.md these are **priced upgrades** (a liberation fee, volume pricing), not administrative toggles, except for the explicitly complimentary board/committee allocation (five free Premium Seats).
3. **Personal visibility settings** (`Public Profile`, `Show Email`, `Show Phone`) — these describe what a resident is comfortable sharing publicly. There's no reason an admin needs a write path to another person's privacy preference as a side effect of editing their name.

The admin's actual job — per your framing — is knowing who the users are and what status they hold, and issuing invites. It is not managing plans or exercising one-click deletion power over a financial/privacy surface disguised as a contact-info edit form.

---

## 2. Root Cause Analysis

| Finding                                                                                                     | Evidence                                                                                                                  | Consequence                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One expandable row mixes four concern types with one `Save`                                                 | `src/widgets/admin/ui/users/UserEditRow.tsx`                                                                              | No UI signal distinguishes "I fixed a typo in this person's name" from "I just changed their billing tier" — both look identical: edit fields, click Save                                                                                                       |
| `Allocate Solo Seat` is a raw admin button with no billing hook visible                                     | `src/widgets/admin/ui/users/AllocateSeatModal.tsx`, `RemoveSeatModal.tsx`                                                 | Per IDENTITY_MODEL.md, Solo Seat carries a liberation fee — an admin button that allocates it with no price/plan context either bypasses billing silently, or is only ever used for the legitimate complimentary board case, and the UI does not tell you which |
| Visibility toggles (`Public Profile`, `Show Email`, `Show Phone`) live in the same form as role/seat fields | Screenshot; `UserEditRow.tsx`                                                                                             | A resident's own privacy preference is editable by an admin with no audit distinction from an administrative correction                                                                                                                                         |
| A single trash-can delete sits inline per row alongside non-destructive fields                              | Screenshot; `DeleteUserModal.tsx` exists per tree, confirmation behavior unverified                                       | Destructive action is visually equal-weight to routine edits; needs confirmation-friction verification as part of discovery, not assumed present                                                                                                                |
| No permission boundary separates "manage roster" from "manage billing/seats"                                | `src/entities/tenant/api/permissions.ts` — `ROLE_PERMISSIONS` map, single `ADMIN` role gates all of the above identically | Even if UI is split, without a distinct permission scope the split is cosmetic; a tenant that wants a support-desk role with roster-only access has no way to grant it today                                                                                    |
| Overview `Pending` stat card has no data source                                                             | Screenshot 2 — `Pending: 0`, static                                                                                       | Confirms the roster page was already designed with a pending-state concept in mind (see Amendment A) — this advisory and ADVISORY-038 are addressing two ends of the same UI gap                                                                                |

**Root cause, stated simply:** the Users domain was built as a single CRUD table over the `user`/Seat models with no separation between administrative roster management and priced/personal self-service actions, because until now nothing forced that distinction — self-registration (ADVISORY-038) and this review are the first things to expose it.

---

## 3. Options

| #   | Option                                                                                                  | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Pros                                                                                                                                                                                             | Cons                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Do nothing**                                                                                          | Keep the single expandable-row form                                                                                                                                                                                                                                                                                                                                                                                                                                              | No work                                                                                                                                                                                          | Risk compounds as tenant count grows — more admins, more accidental seat/plan changes, no audit trail distinguishing them        |
| 2   | **Split UI only, same permission scope**                                                                | Two visually separate tabs/panels (Roster, Plan & Seats) but both still gated by the single `ADMIN` role                                                                                                                                                                                                                                                                                                                                                                         | Fast, low schema risk, immediately fixes the "everything looks the same weight" problem                                                                                                          | Does not solve the permission-boundary gap; a compromised or careless admin session still has full seat/billing power            |
| 3   | **Split UI + split permission scope + move visibility settings to resident self-service** (recommended) | Roster page keeps identity/role/status/invite only. New `Plan & Seats` view for seat allocation, gated by a distinct permission (e.g. `manage:billing` vs `manage:roster`) with the existing complimentary-board-seat path preserved as an explicit "Grant complimentary seat" action, not a bare "Allocate." Visibility toggles move to the resident's own profile settings (already exists — `features/settings` widgets) and are removed from admin's write surface entirely. | Matches the actual ownership boundaries; audit-friendly (seat/billing actions are now a distinguishable permission and event type); privacy settings only ever change at the resident's own hand | Requires a new `ROLE_PERMISSIONS` entry, moving existing modal logic, and a short migration of any admin muscle-memory workflows |

**Recommendation: Option 3.**

---

## 4. Architecture: Before / After

### Before

```
/admin/users
  └─ UserTable
       └─ UserEditRow (expand)
            ├─ identity fields (name, email, phone)      ┐
            ├─ role dropdown                              │  all one form,
            ├─ Allocate/Remove Solo Seat                  │  one permission,
            ├─ Public Profile / Show Email / Show Phone   │  one Save,
            └─ delete (trash icon)                        ┘  one audit trail (or none)
```

### After

```
/admin/users  (Roster & Access — admin, "manage:roster")
  └─ UserTable
       └─ UserRosterRow (expand)
            ├─ identity fields (name, email, phone) — corrections only
            ├─ role dropdown (RESIDENT/BOARD/COMMITTEE/etc.)
            ├─ status (Active/Suspended) + join-request Pending filter (Amendment A)
            └─ Invite / Resend invite

/admin/users/plan-centre  (Plan & Seats — admin, "manage:billing", narrower role set)
  └─ SeatAllocationTable
       ├─ Grant complimentary seat (board/committee path, explicit, logged)
       ├─ View seat/billing status (read-only for standard admin, write for billing-scoped admin)
       └─ Deep link to the tenant's own billing dashboard for paid-seat changes

Resident self-service (existing settings surface, unchanged ownership)
  └─ Profile Settings
       └─ Public Profile / Show Email / Show Phone
            (admin write path to these fields removed entirely)
```

---

## 5. Pre-Execution Discovery Checklist

```bash
# 1. Confirm current permission model has no existing billing/roster split
grep -n "ADMIN" src/entities/tenant/api/permissions.ts

# 2. Confirm DeleteUserModal's actual confirmation behavior (don't assume a friction step exists)
cat src/widgets/admin/ui/users/DeleteUserModal.tsx

# 3. Confirm where the complimentary board/committee seat allocation currently happens,
#    to make sure it is preserved (not just removed) when Allocate Solo Seat is split out
grep -rn "isComplimentary" src/widgets/admin/ui/users/ src/entities/

# 4. Confirm the resident-facing settings surface already covers visibility toggles end-to-end
cat src/widgets/settings/ui/PrivacySection.tsx

# 5. Confirm whether any audit log already distinguishes seat/billing actions from roster edits
grep -rln "audit-log" src/shared/api/ | xargs grep -ln "Seat\|Solo\|Premium"
```

### 5.1 Discovery Results (2026-08-14, Gate G0 ✅)

| #   | Check                                 | Result                                                                                                                                                                                                                                                                                                                             | Action                                                                                                                                                     |
| --- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Permission split exists?              | **No.** Real source is `src/shared/lib/permissions.ts` (the advisory's `src/entities/tenant/api/permissions.ts` does not exist). 15 boolean flags per role. Only `users: boolean` covers roster; no flag for billing/seats/plans. `ADMIN` has all true; `MANAGER` has `users: true` but no `admin` flag.                           | Phase 1 additively introduces `manage:roster` + `manage:billing`. Open question: does `MANAGER` retain seat allocation? (see Gate G1)                      |
| 2   | Delete friction adequate?             | **Yes.** `DeleteUserModal.tsx:48` disables the confirm button until `confirmText === user.name`. Standard type-to-confirm.                                                                                                                                                                                                         | None — already satisfies deliverable (a)                                                                                                                   |
| 3   | Complimentary seat path preserved?    | **Partial / structurally broken.** DB column exists (`src/db/schema/solo-seats.ts:12`), `SoloSeatWidget` renders the badge — but `AllocateSeatModal.tsx` and `AllocateSeatFormData` do not expose `isComplimentary` at all. Every admin-allocated seat today is `isComplimentary: false`.                                          | **Amendment B:** Phase 3 must add the field, wire the schema, and make "Grant complimentary seat" an explicit, logged action distinct from paid allocation |
| 4   | Privacy settings substitute exists?   | **Partial.** `PrivacySection.tsx` covers `Show Email` and `Show Phone` only — does **not** cover the third `Public Profile` toggle listed in §1 of this advisory. No resident write surface for it exists today.                                                                                                                   | **Amendment C:** Gate G4-preliminary decision required before Phase 4                                                                                      |
| 5   | Audit log distinguishes seat actions? | **No, but reusable.** `writeAuditLog` (`src/shared/api/audit-log.ts`) is used across user/suspend/settings/merit/content routes. No seat-related audit action exists today. Splitting the PATCH `/api/users/[id]` route off gives a natural place to add `seat.allocated` / `seat.removed` / `seat.granted_complimentary` actions. | Phase 3 adds the new audit actions — no schema change needed                                                                                               |

**Discovery deliverable (revised):** ✅ G0 gate passed. Two amendments (B, C) added above. Remaining gates (G1–G5) unchanged.

---

## 6. Phased Execution Plan

### Phase 0 — Discovery

Run §5 checklist, produce findings note. **Gate: G0**

### Phase 1 — Permission scope

Add `manage:roster` and `manage:billing` as distinct entries in `ROLE_PERMISSIONS`. **Both default to `true` for `ADMIN`** (no behavior change for existing admins). **`MANAGER` receives `manage:roster: true` but `manage:billing: false`** — per Gate G1 resolution, MANAGER loses seat-allocation power and becomes the narrower support-desk role Option 3 envisions (consistent with MANAGER already lacking the `admin` flag). `manage:billing` stays `true` only for `ADMIN`. **Gate: G1 ✅**

### Phase 2 — Roster page reduction

Remove seat-allocation and visibility-toggle fields from `UserEditRow`; keep identity correction, role, status, invite/resend only. **Gate: G2 ✅** (status/role editing stays on the Roster & Access page — no separate access-control surface)

### Phase 3 — Plan & Seats view (see Amendment B)

New page gated by `manage:billing`. **Must add `isComplimentary` to `AllocateSeatFormData` and the zod schema (`src/server/routers/core/soloSeats.ts:41`)** — this field does not exist in the API today (see §5.1 finding 3). Seat allocation actions split into "Grant complimentary seat" (explicit, logged, board/committee only per IDENTITY_MODEL.md's five-seat allocation) versus a read-only view of paid seats with a deep link to tenant billing. Add new audit actions `seat.allocated`, `seat.removed`, `seat.granted_complimentary` (reuse `writeAuditLog` — no schema change). **Gate: G3 ✅** (Plan & Seats links out to `dashboard/tenant/billing` for paid-seat changes; no inline edit/embed)

### Phase 4 — Visibility settings ownership (Gate G4-preliminary required: see Amendment C)

Confirm `PrivacySection.tsx` (resident self-service) is the sole write path for `Public Profile`/`Show Email`/`Show Phone`. **Per Gate G4-preliminary ✅: extend `PrivacySection.tsx` to add a `Public Profile` toggle** (currently covers only Show Email / Show Phone — §5.1 finding 4), then remove all three fields from the admin roster form. No admin override retained. **Gate: G4 ✅** (no legitimate admin-assisted scenario identified; if one surfaces post-launch, add a narrow override rather than block)

### Phase 5 — Amendment A wiring

Wire the `Pending` stat card and a `status = Pending` roster filter to `PropertyJoinRequest` per ADVISORY-038 Phase 3, now that the roster page has a defined scope to receive it. **Gate: G5 (depends on ADVISORY-038 Phase 1–2 landing first)**

---

## 7. Risk Register

| Risk                                                                                                                                                                    | Likelihood | Impact | Mitigation                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Splitting permission scope breaks an existing single-admin tenant workflow that relies on doing everything from one screen                                              | Medium     | Low    | Both new permissions default to granted-together on `ADMIN`; only introduces the _option_ of narrower support-desk roles, doesn't force separation on existing tenants                                         |
| Complimentary seat path gets lost in the split (accidentally requires billing integration where none should exist)                                                      | Low        | Medium | Discovery item 3 explicitly locates and preserves the `isComplimentary` code path before Phase 3 begins                                                                                                        |
| Removing admin's visibility-toggle write path breaks a real support scenario (resident asks admin to fix their privacy setting because they can't access it themselves) | Low        | Low    | Confirm in discovery that `PrivacySection.tsx` is reachable by every seat type before removing the admin fallback; if a genuine gap exists, keep a narrowly-scoped admin override rather than blocking Phase 4 |
| Two admin pages instead of one adds navigation overhead for small tenants with one admin                                                                                | Medium     | Low    | Acceptable trade-off given the audit/scope-of-power problem being solved; Soralia Village's single admin gains a two-click path, not a blocker                                                                 |

---

## 8. Done Criteria

- [x] G0 — Discovery complete (§5.1)
- [ ] ⏳ `manage:roster` and `manage:billing` exist as distinct `ROLE_PERMISSIONS` entries
- [ ] ⏳ `UserEditRow` no longer exposes seat allocation or visibility toggles
- [ ] ⏳ New Plan & Seats view exists, complimentary-seat grant is an explicit logged action distinct from paid-seat display
- [ ] ⏳ `AllocateSeatFormData` and zod schema carry `isComplimentary`; "Grant complimentary seat" action sets it (Amendment B)
- [ ] ⏳ `PrivacySection.tsx` confirmed as sole write path for visibility settings (Amendment C / Gate G4-preliminary resolved)
- [ ] ⏳ `Pending` stat card on `/admin/users` reflects live `PropertyJoinRequest` count (Amendment A / ADVISORY-038 Phase 3)
- [ ] ⏳ Audit actions `seat.allocated`, `seat.removed`, `seat.granted_complimentary` logged distinctly from `user.updated`

## 9. Decision Gates

| Gate          | Question for DavDev                                                                                                                                                                                                                     | Blocks         | Status    |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | --------- |
| **G0**        | Confirm advisory number (039) against the register                                                                                                                                                                                      | All execution  | ✅ Passed |
| **G1**        | Confirm `manage:roster` / `manage:billing` split; does `MANAGER` retain seat power? → **Resolved: ADMIN gets both; MANAGER gets `manage:roster` only (loses billing); this creates the support-desk role**                              | Phase 1        | ✅ Passed |
| **G2**        | Confirm status/role editing stays on the roster page rather than also moving to a separate "access control" surface → **Resolved: stays on Roster & Access page**                                                                       | Phase 2        | ✅ Passed |
| **G3**        | Link out to tenant billing, or embed read-only inline? → **Resolved: link out to `dashboard/tenant/billing`; Plan & Seats is read-only summary + deep link**                                                                            | Phase 3        | ✅ Passed |
| **G4-prelim** | Resolves Amendment C: extend `PrivacySection.tsx`, rescope, or keep admin override for `Public Profile`? → **Resolved: extend `PrivacySection.tsx` with a Public Profile toggle; remove all three from admin**                          | Phase 4 begins | ✅ Passed |
| **G4**        | Confirm no legitimate admin-assisted privacy-edit scenario exists before the admin write path is fully removed → **Resolved: none identified; if one surfaces post-launch, add narrow override rather than block**                      | Phase 4        | ✅ Passed |
| **G5**        | Confirm sequencing: this advisory's Phase 5 should not begin before ADVISORY-038 Phases 1–2 (schema + wizard) land, since it depends on `PropertyJoinRequest` existing → **Resolved: Phase 5 gated on ADVISORY-038 Phases 1–2 landing** | Phase 5        | ✅ Passed |

**All gates resolved 2026-08-14. Advisory is execution-ready (Option 3).**
