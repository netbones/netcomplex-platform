---
title: ADVISORY-38 — Addendum to G1 (AMENDED): OWNER_LEASING Access Model, remapped onto actual schema
status: proposed
supersedes: ADVISORY-38_G1_ADDENDUM.md (original, built without schema reference)
tags: [advisory, supplemental, schema-correction]
audience: developer
---

# ADVISORY-38 — Addendum to G1 (AMENDED): OWNER_LEASING Access Model

**Status:** Proposed
**Relates to:** ADVISORY-38, Goal G1
**Supersedes:** `ADVISORY-38_G1_ADDENDUM.md` — the original addendum invented a parallel
schema (`Unit`, `UnitMembership`, `Tenancy`, `ResidencyStatus`, `UnitRole`) and a
Supabase-Auth-style RLS mechanism (`auth.uid()`) that do not exist in this codebase.
It was written in isolation, without reference to `prisma/schema.prisma`,
`tenant.prisma`, `IDENTITY_MODEL.md`, or ADR-017/ADR-019. This document keeps the
original's _product intent_ intact and remaps every mechanism onto the live schema.
**Scope:** Role/permission model, dashboard behavior, RLS policy implications, Prisma schema changes

---

## 0. What changed from the original addendum, and why

| Original addendum                                                                              | Problem                                                                                                                                                                                                                                                                                                                                                                                                        | Amended, mapped onto live schema                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| New `Unit` model                                                                               | Duplicates `Property` (permanent asset) + `Household` (temporal occupancy), which ADR-017 already introduced specifically to separate ownership from occupancy                                                                                                                                                                                                                                                 | Use `Property` + `Household` as-is                                                                                                                                                                     |
| New `UnitMembership` (`userId`, `unitId`, `role`)                                              | Duplicates `StandardSeat` (owner↔Property link) and `Profile` (occupant↔Household link), which already carry this relationship                                                                                                                                                                                                                                                                                 | Use `StandardSeat` for ownership, `Profile` for occupancy                                                                                                                                              |
| New `UnitRole` enum (`OWNER_RESIDENT \| OWNER_LEASING \| TENANT`)                              | Duplicates `ResidencyType` (`FAMILY \| RENTER \| OWNER`) on `Profile` and `OccupancyType` (`OWNER_OCCUPIED \| RENTAL \| VACANT`) on `Household`, plus the fact that "owner" is already structurally distinct from "occupant" via `StandardSeat` vs `Profile`                                                                                                                                                   | Derive OWNER_LEASING as a _state_, not a new enum: `StandardSeat` exists for the user on the `Property` **and** the `Property`'s active `Household.occupancyType = RENTAL`. No new role enum needed.   |
| New `ResidencyStatus` (`ACTIVE \| ARCHIVED`)                                                   | Duplicates `ProfileStatus` (`ACTIVE \| UPGRADED \| REMOVED \| EVICTED \| LEASE_ENDED`) plus `Household.status` (`ACTIVE \| ARCHIVED`)                                                                                                                                                                                                                                                                          | Use `Household.status` + `Profile.status` lifecycle; owner's move-out is a new `Household` record (see §3), not a new status field                                                                     |
| New `Tenancy` model with `ownerUserId` / `tenantUserId` / `status: INVITED \| ACTIVE \| ENDED` | Duplicates two things that already exist: (1) `Invitation` model already has `residentType: OWNER \| RENTER`, `inviterId`, `email`, `street`/`unit`, `status: PENDING \| ACCEPTED \| EXPIRED \| REVOKED`; (2) `Profile.landlordId` (FK to `user`) already exists specifically to record "this occupant's landlord is this user"                                                                                | Use `Invitation` for the invite/pending state, `Profile.landlordId` for the ongoing owner↔tenant link once accepted                                                                                    |
| RLS policies written against `auth.uid()`                                                      | This project uses **Better Auth**, not Supabase Auth. `auth.uid()` does not resolve to anything here. ADR-019's actual mechanism is a privileged owner connection plus `runWithRLS()` doing `SET LOCAL ROLE app_user` + `set_config()` of `app.*` GUCs, called via `getRLSContext()`. Supabase is used for Postgres hosting and Realtime only, not its Auth product (ADR-002 selected Better Auth explicitly). | Rewrite policies against `current_setting('app.user_id')` / `current_setting('app.tenant_id')`-style GUCs consistent with the existing (bug-fixed) `20260604000000_add_rls_policies` migration pattern |
| `User` (capitalized)                                                                           | The actual model is `user` (lowercase) throughout `schema.prisma`                                                                                                                                                                                                                                                                                                                                              | Corrected throughout                                                                                                                                                                                   |
| No tenant-multi-property routing awareness                                                     | `MaintenanceRequest` already has `landlordId` and a `routingType: HOA \| LANDLORD` enum specifically for landlord/tenant maintenance routing — directly relevant to what an `OWNER_LEASING` dashboard should surface                                                                                                                                                                                           | Called out explicitly in §7                                                                                                                                                                            |

**Net effect: this addendum requires little to no new schema.** The product intent
(owner keeps unit/billing/security visibility, loses insight into tenant's personal
activity, tenant is a separately-registrable account, dashboard shows a clean
pending-invite state) is almost entirely expressible with fields and models that
already exist. Where a gap remains, it is called out as a small additive change in
§5, consistent with the standing "strictly additive schema changes where possible"
principle — not a new parallel entity set.

---

## 1. Background (unchanged from original)

G1 raised the question: for an owner who leases out their unit, does the owner
retain dashboard access, or is this a legal/billing record only with no login flow
until a tenant registers separately?

**User story driving this addendum:**

> As an owner who previously lived in the village and is now archiving my
> resident profile, I still want to monitor my property and my tenant.

## 2. Decision (unchanged)

An owner who leases out their unit **retains dashboard access and login**. It is
not a record-only status. What changes when an owner leases out their unit is the
**permission scope**, not account existence.

This is expressed as a _derived state_, not a new role field:

- **Ownership** (does this user hold rights over this `Property`?) → `StandardSeat.userId` / `isPrimaryOwner`
- **Current occupancy of the property** (is the owner living there, or is it rented out?) → the `Property`'s currently-`ACTIVE` `Household.occupancyType`
- **Is this owner currently an occupant** (do they have an `ACTIVE` `Profile` in that household)? → derived by querying `Profile` for that `householdId` + `userId`

"OWNER_LEASING" = `StandardSeat` exists for this `(userId, propertyId)` **and** the
property's active `Household.occupancyType = RENTAL`. No enum value needs to change
to represent this; it's a join, computed the same way `SoloSeat`/`StandardSeat`
resolution already works elsewhere in the identity layer.

## 3. Permission scope (unchanged intent, remapped mechanism)

| Capability                                                                      | Owner, occupying (`OWNER_OCCUPIED` household) | Owner, leasing out (`RENTAL` household) | Mechanism                                                                                                                                                                                           |
| ------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Own resident profile (bookings, panic button as self, access QR as self)        | ✅                                            | ❌                                      | Owner's `Profile` in the prior `OWNER_OCCUPIED` `Household` moves to `status: LEASE_ENDED` when that `Household` is archived; no `ACTIVE` `Profile` exists for them in the new `RENTAL` `Household` |
| Property/unit ownership record                                                  | ✅                                            | ✅                                      | `StandardSeat` is keyed to `Property`, not `Household` — persists across occupancy changes by design (ADR-017)                                                                                      |
| Billing/levy statements for unit                                                | ✅                                            | ✅                                      | `StandardSeat` persists; `PaymentTransaction`/billing already resolve off `Property`/owner `userId`, not household                                                                                  |
| Tenant registration status (invited / pending / active)                         | N/A                                           | ✅                                      | `Invitation` (`residentType: RENTER`, `inviterId = owner.userId`, `status`)                                                                                                                         |
| Tenant's personal activity (their bookings, their panic history)                | N/A                                           | ❌ by default                           | No RLS grant on tenant-personal tables for the owner; see §6.2                                                                                                                                      |
| Property-scoped security/access events (gate logs, alarms tied to the property) | ✅                                            | ✅                                      | `SecurityAlert.propertyId`, `AccessEvent.propertyId`, `Visitor.propertyId` — already property-scoped, not person-scoped                                                                             |
| Manage/revoke tenant access credentials                                         | N/A                                           | ✅                                      | Owner or admin acting on the tenant's `Profile`/seat, same as existing household-management flows in `IDENTITY_MODEL.md` ("Standard Seat holder manages ALL profiles")                              |
| Maintenance/violation/arrears notifications for the unit                        | ✅                                            | ✅                                      | `MaintenanceRequest.landlordId` + `MaintenanceRouting` already model exactly this (see §7)                                                                                                          |
| Full estate-wide visibility                                                     | ❌                                            | ❌                                      | Unchanged, out of scope                                                                                                                                                                             |

## 4. Tenant relationship model (remapped)

Tenant registration is a **separate account**, linked to the property via
existing models — not a new `Tenancy` join table.

**Invite flow:**

1. Owner (via their dashboard) creates an `Invitation` with `residentType = RENTER`, `organizationId`, `inviterId = owner.userId`, `email`, `street`/`unit` matching the `Property`.
2. Dashboard renders the pending state directly off `Invitation.status = PENDING`: property shown as leased, tenant shown as "Invited — not yet registered," with a resend affordance calling the existing invitation resend path. No blank/error state — this requires no schema change, only a dashboard query against `Invitation` filtered by the owner's property.
3. On acceptance, standard invitation-acceptance flow creates the tenant's `user` (if new) and a `Profile` on the property's `Household`, with:
   - `residencyType = RENTER`
   - `landlordId = owner.userId` (this field already exists on `Profile` for exactly this relationship)
   - `householdRole = OCCUPANT`
   - `status = ACTIVE`
4. Tenant account activation is independent of owner login state — this was already true; nothing in the existing model requires the owner to be logged in for a tenant's `Invitation` to be accepted.

No new `Tenancy` model is required. If a future need arises to track lease dates
independent of `Household.moveInDate`/`moveOutDate` (e.g., lease renewal terms,
rent amount), that would be a small additive model — but it is **not** needed to
satisfy the access-control decision in this addendum, and should not be introduced
here.

## 5. Prisma schema changes

**None required for the access-control decision itself.** The permission model in
§3 is fully expressible with `StandardSeat`, `Household`, `Profile`,
`ResidencyType`, `OccupancyType`, `ProfileStatus`, `Invitation`, and
`Profile.landlordId` — all of which already exist in `prisma/schema.prisma`.

If, during implementation, it proves genuinely useful to have a cheap boolean for
"is this property currently leased" without joining through `Household` each time,
that would be a candidate for a small denormalized/additive field — e.g.
`Property.isLeasedOut Boolean @default(false)`, kept in sync via the same
mechanism that flips `Household.occupancyType`. This is optional, additive, and
should be raised as its own small ticket rather than assumed here.

**No changes to `user`, `Property`, `Household`, `Profile`, `StandardSeat`, or
`Invitation` schemas are proposed by this addendum.**

## 6. RLS policy implications (Supabase/Postgres via ADR-019's actual mechanism)

Corrected to use the project's real RLS pattern: privileged owner connection by
default, `runWithRLS()` doing `SET LOCAL ROLE app_user` plus `set_config()` of
`app.*` GUCs, consumed via `getRLSContext()`. **Not** `auth.uid()` — that is a
Supabase Auth construct and this project authenticates via Better Auth (ADR-002).
Confirm current GUC names against `docs/STEERING/RLS.md` and the
`20260604000000_add_rls_policies` migration before finalizing; the names below
follow that migration's stated convention (`app.user_role`, `is_platform_admin()`
helper, idempotent `DROP POLICY IF EXISTS` + `WITH CHECK`).

### 6.1 Property-scoped data (billing, access logs, incidents)

```sql
-- Owners (occupying or leasing) can read property-scoped records for properties they hold via StandardSeat
DROP POLICY IF EXISTS "owner_can_read_property_events" ON "AccessEvent";
CREATE POLICY "owner_can_read_property_events"
ON "AccessEvent"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "StandardSeat" ss
    WHERE ss."propertyId" = "AccessEvent"."propertyId"
      AND ss."userId" = current_setting('app.user_id', true)::text
      AND ss."archivedAt" IS NULL
      AND ss."status" = 'ACTIVE'
  )
)
WITH CHECK (
  "tenantId" = current_setting('app.tenant_id', true)::text
);
```

Note: this policy does **not** check `Household.occupancyType` — property-level
data access is a function of holding an active `StandardSeat`, not physical
presence, matching the original addendum's stated intent in §6.1.

### 6.2 Tenant personal data (bookings, panic history, own profile)

```sql
-- Residents (including tenants) read only their own personal records
DROP POLICY IF EXISTS "resident_reads_own_bookings" ON "Booking";
CREATE POLICY "resident_reads_own_bookings"
ON "Booking"
FOR SELECT
USING (
  "userId" = current_setting('app.user_id', true)::text
  AND "tenantId" = current_setting('app.tenant_id', true)::text
);

-- Owners in OWNER_LEASING state are explicitly NOT granted a matching
-- select policy against tenant-personal tables (Booking, SecurityAlert
-- triggered-by-user, panic history, etc.)
-- Absence of policy = deny, per default-deny RLS posture (ADR-019).
```

If/when the open product question in §8 is resolved to allow owner visibility into
specific tenant activity categories, add a narrowly scoped policy per data type
(e.g., `AccessEvent` yes, `Booking` no) rather than a blanket grant — same
recommendation as the original addendum, mechanism corrected.

### 6.3 Invitation record (replaces §6.3 "Tenancy record" in the original)

```sql
-- Owner can see and manage their own outstanding invitations for their property
DROP POLICY IF EXISTS "owner_manages_own_invitations" ON "Invitation";
CREATE POLICY "owner_manages_own_invitations"
ON "Invitation"
FOR ALL
USING (
  "inviterId" = current_setting('app.user_id', true)::text
  AND "tenantId" = current_setting('app.tenant_id', true)::text
)
WITH CHECK (
  "inviterId" = current_setting('app.user_id', true)::text
  AND "tenantId" = current_setting('app.tenant_id', true)::text
);
```

`Invitation` is not currently in the ADR-019 RLS scope (6 sensitive tables + the 9
Phase 43 tables). If this policy is adopted, it should be added to the tracked RLS
scope list (BD `t78` / M6+) rather than applied ad hoc, per ADR-019's phased
adoption principle.

## 7. Existing landlord/tenant maintenance routing — already built, should be reused

Worth surfacing explicitly since it was missing from the original addendum
entirely: `MaintenanceRequest` already has:

- `landlordId String?` (FK to `user`, relation `MaintenanceRequest_landlord`)
- `routingType MaintenanceRouting @default(HOA)` — enum `HOA | LANDLORD`

This is precisely the "owner-leasing sees maintenance for their unit" capability
described in §3's requirements row, already modeled. The `OWNER_LEASING` dashboard
work in this addendum should route maintenance requests for leased properties
through this existing field rather than inventing new maintenance visibility
rules.

## 8. Widget registry / dashboard implications (remapped)

Per the actual widget registry (`widgets.ts`, `WidgetManifest`, `featureFlag`,
`permissions` fields — not a separate `WIDGET_SPEC.md` convention), an
OWNER_LEASING dashboard state needs widget visibility gated off the **derived
state** in §2, not a new role field:

- Suppress: personal-activity widgets (bookings, panic/security-as-self, access
  QR-as-self) when the owner has no `ACTIVE` `Profile` in the property's current
  `Household`
- Retain/add: a billing/ownership widget (already exists via `PropertiesWidget` /
  provider billing patterns), a new lightweight "Tenancy status" widget reading
  `Invitation` + tenant `Profile.landlordId`, and property-scoped security events
  (existing `SecurityAlert`/`AccessEvent` widgets, already property-scoped)

Widget resolution should key off the `StandardSeat` + active-`Household`-lookup
described in §2, consistent with how `SoloSeat`/`StandardSeat` resolution already
works elsewhere, rather than a new `UnitMembership.role` field.

## 9. Open question carried forward unchanged

Should an owner in the leasing state see the tenant's own activity (their panic
button history, their individual bookings) or only property-level events (access
logs tied to the property, security incidents, billing)?

**Recommendation (unchanged from original):** default to property-level +
security-relevant events only, excluding tenant personal usage patterns, unless:

1. The lease agreement between owner and tenant explicitly authorizes this
   monitoring, and
2. There's a documented POPIA lawful basis (likely legitimate interest, but needs
   a proper assessment given the power imbalance in a landlord-tenant
   relationship).

This should be resolved as its own decision item before the §6.2-style policies
are finalized for any additional tenant-personal tables — recommend tracking as
its own advisory or a follow-up item under G1, not decided implicitly via schema
defaults.

---

**Next steps:**

- [ ] Confirm with DavDev that no new `Unit`/`UnitMembership`/`Tenancy` schema is
      wanted, and that the derived-state approach in §2 is acceptable (this is the
      key decision this amendment is asking to be re-gated on)
- [ ] Confirm decision in §9 with product/legal before finalizing RLS on any
      additional tenant-personal tables
- [ ] If adopted, add `Invitation` to the tracked RLS scope list (currently
      outside ADR-019's 15-table scope) rather than applying policy ad hoc
- [ ] Confirm exact GUC names (`app.user_id`, `app.tenant_id`, `app.user_role`)
      against `docs/STEERING/RLS.md` before implementing §6 — placeholders above
      follow the migration's documented convention but were not re-verified
      against the live migration file as part of this amendment
- [ ] Wire OWNER_LEASING maintenance visibility through the existing
      `MaintenanceRequest.landlordId` / `MaintenanceRouting` fields (§7) instead of
      building new routing
- [ ] Update widget registry (`widgets.ts`) with the derived-state gating in §8,
      not a new role enum
