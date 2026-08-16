# ADVISORY-038 — Gate Resolution Request (2026-08-15)

Discovery (Phase 0) is complete and Phase 1 schema has shipped. Phases 2–4
are blocked on the five gates below. Please confirm each with a short answer;
defaults are proposed where the advisory already leans one way.

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

---

## G2 — Property lookup UX + uniqueness constraint

**Question:** Confirm exact-match property lookup is acceptable, and that the
`Property` `@@unique([tenantId, street, unit])` constraint (already added,
migration pending) is the right schema guarantee.

**Discovery result:** 0 duplicate `(tenantId, street, unit)` rows in the live
DB, so exact-match is viable today. The constraint prevents future duplicates.

**Proposed:** exact-match only; ambiguous/missing matches route to admin manual
resolution (no fuzzy auto-linking).

---

## G3 — Rejection notification template

**Question:** Should rejection notifications reuse the existing email
infrastructure (`src/shared/api/email/templates.ts`), or is a new template set
wanted?

**Proposed:** reuse `emailNotification` (or add a single `joinRequestRejected`
template alongside `teamInvitation`). No new email service.

---

## G4 — ADVISORY-034 scoping

**Question:** Confirm this advisory is intentionally scoped away from
ADVISORY-034 (Platform Identity Layer). `PropertyJoinRequest`/`Invitation`
continue keying identity off `user.email` uniqueness as today, with no
dependency on `Identity`/`Credential` entities landing first.

**Proposed:** confirmed — no dependency on ADVISORY-034.

---

## G5 — Invitation-acceptance provisioning boundary

**Question:** Does `Invitation` acceptance need to create `StandardSeat`/
`Profile`/`Household` records, or is that a separate existing flow that
`PropertyJoinRequest` promotion must not assume?

**Discovery result:** current acceptance only sets `user.role`/`tenantId`; seat/
profile/household creation is a separate downstream concern.

**Proposed:** Phase 4 (vehicle re-parenting) must not assume acceptance
provisions seats; the provisioning boundary needs an explicit owner.

---

Please reply with `G1: <answer>`, `G2: <answer>`, etc., or mark "accept
proposed defaults" to proceed with all proposed values.
