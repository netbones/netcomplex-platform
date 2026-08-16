# ADVISORY-038 — Gate Resolution Request (2026-08-15)

Discovery (Phase 0) is complete and Phase 1 schema has shipped. Phases 2–4
are blocked on the five gates below. Please confirm each with a short answer;
defaults are proposed where the advisory already leans one way.

**Resolution status (2026-08-15):**

| Gate | Resolution                                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------- |
| G1   | **RESOLVED** — OWNER_LEASING retains dashboard access; derived state on live schema. See `ADVISORY-38_G1_ADDENDUM_AMENDED.md`         |
| G2   | **ACCEPTED** — exact-match lookup + `Property @@unique([tenantId, street, unit])`                                                     |
| G3   | **RESOLVED** — new rejection template (not reuse `emailNotification`)                                                                 |
| G4   | **ACCEPTED** — no ADVISORY-034 (`Identity`/`Credential`) dependency; `PropertyJoinRequest`/`Invitation` key off `user.email` as today |
| G5   | **ACCEPTED** — provisioning boundary must be explicit                                                                                 |

---

## G1 — `RelationshipType` four-way split

**Question:** Does the four-way split match product intent, specifically for
`OWNER_LEASING`?

| Value             | Meaning                                      | Resulting record(s)                                                                                |
| ----------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `OWNER_RESIDENT`  | Owner resides in the property                | `StandardSeat` (primary) + `Household.occupancyType = OWNER_OCCUPIED`                              |
| `OWNER_LEASING`   | Owner leases the property out                | `StandardSeat` (primary) + `Household.occupancyType = RENTAL`; no resident `Profile` for the owner |
| `TENANT_RENTER`   | Tenant renting the property                  | `Profile` (`RENTER`) under the existing RENTAL `Household`                                         |
| `ADDITIONAL_USER` | Additional occupant of an existing household | `Profile` (`OCCUPANT`/`FAMILY`) attached to the active `Household`                                 |

**Need to confirm:** for `OWNER_LEASING`, does the owner get any dashboard
access, or is it a legal/billing record only with no login flow until a tenant
registers separately?

owner dashboard access see @docs/advisories/ADVISORY-38_G1_ADDENDUM_AMENDED.md

> **Implementation note (superseded):** the original G1 addendum proposed
> `UnitMembership`/`Tenancy`/`Unit`, but `ADVISORY-38_G1_ADDENDUM_AMENDED.md`
> remaps this onto the live schema: OWNER_LEASING is a _derived state_
> (`StandardSeat` + `Household.occupancyType = RENTAL`), not a new enum or
> parallel entity set. The amended addendum is authoritative.

---

## G2 — Property lookup UX + uniqueness constraint

**Question:** Confirm exact-match property lookup is acceptable, and that the
`Property` `@@unique([tenantId, street, unit])` constraint (already added,
migration pending) is the right schema guarantee.

**Discovery result:** 0 duplicate `(tenantId, street, unit)` rows in the live
DB, so exact-match is viable today. The constraint prevents future duplicates.

**Proposed:** exact-match only; ambiguous/missing matches route to admin manual
resolution (no fuzzy auto-linking).

Accepted

---

## G3 — Rejection notification template

**Question:** Should rejection notifications reuse the existing email
infrastructure (`src/shared/api/email/templates.ts`), or is a new template set
wanted?

**Proposed:** reuse `emailNotification` (or add a single `joinRequestRejected`
template alongside `teamInvitation`). No new email service.

New template

---

## G4 — ADVISORY-034 scoping

**Question:** Confirm this advisory is intentionally scoped away from
ADVISORY-034 (Platform Identity Layer). `PropertyJoinRequest`/`Invitation`
continue keying identity off `user.email` uniqueness as today, with no
dependency on `Identity`/`Credential` entities landing first.

**Proposed:** confirmed — no dependency on ADVISORY-034.

accepted

---

## G5 — Invitation-acceptance provisioning boundary

**Question:** Does `Invitation` acceptance need to create `StandardSeat`/
`Profile`/`Household` records, or is that a separate existing flow that
`PropertyJoinRequest` promotion must not assume?

**Discovery result:** current acceptance only sets `user.role`/`tenantId`; seat/
profile/household creation is a separate downstream concern.

**Proposed:** Phase 4 (vehicle re-parenting) must not assume acceptance
provisions seats; the provisioning boundary needs an explicit owner.

accepted

---

Please reply with `G1: <answer>`, `G2: <answer>`, etc., or mark "accept
proposed defaults" to proceed with all proposed values.
