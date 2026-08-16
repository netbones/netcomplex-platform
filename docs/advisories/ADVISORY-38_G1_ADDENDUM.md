# ADVISORY-38 — Addendum to G1: OWNER_LEASING Access Model

**Status:** Proposed
**Relates to:** ADVISORY-38, Goal G1
**Author:** Netbones Solutions / Netcomplex platform team
**Scope:** Role/permission model, dashboard behavior, RLS policy implications, Prisma schema changes

---

## 1. Background

G1 raised the question: for `OWNER_LEASING`, does the owner retain dashboard
access, or is this a legal/billing record only with no login flow until a
tenant registers separately?

**User story driving this addendum:**

> As an owner who previously lived in the village and is now archiving my
> resident profile, I still want to monitor my property and my tenant.

## 2. Decision

`OWNER_LEASING` **retains dashboard access and login**. It is not a
record-only status. What changes when an owner leases out their unit is the
**permission scope**, not account existence.

This requires separating two axes that were previously conflated under a
single owner status field:

| Axis                 | Enum              | Purpose                                                          |
| -------------------- | ----------------- | ---------------------------------------------------------------- |
| **Residency status** | `ResidencyStatus` | Is this person physically living in the village right now?       |
| **Platform role**    | `UnitRole`        | What can this person do in the system, relative to a given unit? |

An owner can be `ARCHIVED` on residency while remaining `OWNER_LEASING` on
role — these are independent.

## 3. Permission scope for OWNER_LEASING

| Capability                                                                               | OWNER_RESIDENT | OWNER_LEASING | Notes                                            |
| ---------------------------------------------------------------------------------------- | -------------- | ------------- | ------------------------------------------------ |
| Own resident profile (bookings, panic button as self, access QR as self)                 | ✅             | ❌ (archived) | Revoked on residency archive, not on role change |
| Property/unit ownership record                                                           | ✅             | ✅            | Persists regardless of residency                 |
| Billing/levy statements for unit                                                         | ✅             | ✅            | Owner remains financially liable                 |
| Tenant registration status (invited / pending / active)                                  | N/A            | ✅            | Owner-initiated invite flow                      |
| Tenant identity/personal activity (their bookings, their panic history)                  | N/A            | ❌ by default | Privacy/POPIA boundary — see §6                  |
| Unit-scoped security/incident events (access logs, gate events, alarms tied to the unit) | ✅             | ✅            | Property-level, not person-level                 |
| Manage/revoke tenant access credentials                                                  | N/A            | ✅            | Owner or admin only                              |
| Maintenance/violation/arrears notifications for the unit                                 | ✅             | ✅            |                                                  |
| Full estate-wide visibility                                                              | ❌             | ❌            | Out of scope regardless of role                  |

## 4. Tenant relationship model

Tenant registration is a **separate account**, linked to the unit via a
lease/tenancy relation — not a sub-record of the owner's account.

- Owner (or admin) sends an invite tied to a `Unit`.
- Tenant account activation is independent of owner login state.
- Dashboard must render a defined **pre-registration state** for the owner:
  unit shown as leased, tenant shown as "Invited — not yet registered", with
  invite-resend affordance. No blank/error state.

## 5. Prisma schema changes

```prisma
enum ResidencyStatus {
  ACTIVE
  ARCHIVED
}

enum UnitRole {
  OWNER_RESIDENT
  OWNER_LEASING
  TENANT
  // existing roles unchanged (ADMIN, STAFF, etc.)
}

enum TenancyStatus {
  INVITED
  ACTIVE
  ENDED
}

model UnitMembership {
  id              String           @id @default(cuid())
  userId          String
  unitId          String
  role            UnitRole
  residencyStatus ResidencyStatus  @default(ACTIVE)
  createdAt       DateTime         @default(now())
  archivedAt      DateTime?

  user            User             @relation(fields: [userId], references: [id])
  unit            Unit             @relation(fields: [unitId], references: [id])

  @@unique([userId, unitId, role])
  @@index([unitId])
  @@index([userId])
}

model Tenancy {
  id            String         @id @default(cuid())
  unitId        String
  ownerUserId   String         // the OWNER_LEASING user who invited
  tenantUserId  String?        // null until tenant registers
  status        TenancyStatus  @default(INVITED)
  invitedAt     DateTime       @default(now())
  activatedAt   DateTime?
  endedAt       DateTime?

  unit          Unit           @relation(fields: [unitId], references: [id])

  @@index([unitId])
  @@index([tenantUserId])
}
```

Key modeling notes:

- `UnitMembership` replaces any single `ownerStatus` field previously living
  directly on `User` or `Unit` — a user can hold multiple memberships across
  units (e.g., owner of Unit A, tenant of Unit B, in theory).
- `residencyStatus` archiving does **not** cascade-delete or deactivate the
  `UnitMembership` row — it's a soft state, not a role removal.
- `Tenancy.tenantUserId` is nullable to represent the pending-invite state
  cleanly, per §4.

## 6. RLS policy implications (Supabase / Postgres)

Three policy groups need updating. Assume `auth.uid()` resolves to `User.id`
and helper functions already exist per your `add_rls.sql` conventions.

### 6.1 Unit-level data (billing, access logs, incidents)

```sql
-- Owners (resident or leasing) can read unit-scoped records for units they hold
create policy "owner_leasing_can_read_unit_data"
on unit_events
for select
using (
  exists (
    select 1 from "UnitMembership" um
    where um."unitId" = unit_events.unit_id
      and um."userId" = auth.uid()
      and um.role in ('OWNER_RESIDENT', 'OWNER_LEASING')
      and um."archivedAt" is null
  )
);
```

Note: this policy does **not** check `residencyStatus` — unit-level data
access is a function of role, not physical presence.

### 6.2 Tenant personal data (bookings, panic history, own profile)

```sql
-- Tenants can only read their own personal records
create policy "tenant_reads_own_data"
on bookings
for select
using (
  exists (
    select 1 from "Tenancy" t
    where t."tenantUserId" = auth.uid()
      and t."unitId" = bookings.unit_id
      and t.status = 'ACTIVE'
  )
  and bookings.user_id = auth.uid()
);

-- OWNER_LEASING is explicitly NOT granted a matching select policy here.
-- Absence of policy = deny, per default-deny RLS posture.
```

If/when the product decision in §6-open-question below is resolved to allow
owner visibility into specific tenant activity categories (e.g., access
events but not booking details), add a narrowly scoped policy per data type
rather than a blanket tenant-data grant.

### 6.3 Tenancy record itself

```sql
-- Owner can see and manage tenancy invites for their own units
create policy "owner_manages_own_tenancy"
on "Tenancy"
for all
using (
  exists (
    select 1 from "UnitMembership" um
    where um."unitId" = "Tenancy"."unitId"
      and um."userId" = auth.uid()
      and um.role = 'OWNER_LEASING'
      and um."archivedAt" is null
  )
);
```

## 7. Widget registry / dashboard implications

Per `WIDGET_SPEC.md` v2.0 conventions, `OWNER_LEASING` needs its own
`WidgetManifest` entries (or a shared manifest gated by role capability
flags) distinct from `OWNER_RESIDENT`:

- Remove: `MyBookingsWidget`, `MyPanicButtonWidget`, `MyAccessQRWidget`
- Retain/add: `UnitBillingWidget`, `TenancyStatusWidget`,
  `UnitSecurityEventsWidget` (property-scoped), `TenantInviteWidget`

`WidgetRegistry` resolution should key off `UnitMembership.role`, not off a
single `user.type` field, to support the multi-role-per-user case cleanly.

## 8. Open question carried forward from prior answer

Should `OWNER_LEASING` see the tenant's own activity (their panic button
history, their individual bookings) or only property-level events (access
logs tied to the unit, security incidents, billing)?

**Recommendation:** default to property-level + security-relevant events
only, excluding tenant personal usage patterns, unless:

1. The lease agreement between owner and tenant explicitly authorizes this
   monitoring, and
2. There's a documented POPIA lawful basis (likely legitimate interest,
   but needs a proper assessment given the power imbalance in a
   landlord-tenant relationship).

This should be resolved as its own decision item before `TenantUnitEvents`
RLS policies are finalized — recommend tracking as ADVISORY-39 or a follow-up
item under G1 rather than deciding it implicitly via schema defaults.

---

**Next steps:**

- [ ] Confirm decision in §8 with product/legal before finalizing RLS on tenant personal data
- [ ] Migrate any existing single-field owner status data into `UnitMembership`
- [ ] Update `WIDGET_SPEC.md` with `OWNER_LEASING` manifest entries
- [ ] Add integration tests for residency-archive-without-role-loss scenario
