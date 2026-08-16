---
title: ADVISORY-038: Resident Self-Registration — Join Request Wizard and Approval Queue
status: proposed
reviewed: 2026-08-14
tags: [advisory, architecture, identity, ux]
audience: developer
---

# ADVISORY-038: Resident Self-Registration — Join Request Wizard and Approval Queue

**Status:** Proposed
**Priority:** High (revenue-adjacent — blocks onboarding of tenants beyond Soralia Village)
**Related Docs:** IDENTITY_MODEL.md ("Design Decision Pending" — per-profile email vs. Netflix model), UBIQUITOUS_LANGUAGE.md (Seat, Household, Property)
**Related Advisories:** ADVISORY-034 / ADVISORY-034-SUPPLEMENTAL-1 (Platform Identity Layer — explicitly out of scope here, see §9)
**Related ADRs:** ADR-017 (Property-first architecture), ADR-002 (Better Auth)
**Precedent pattern:** `GroupMembershipRequest` (PENDING/APPROVED/REJECTED) + `GroupModerationWidget` — the same shape, applied to property membership instead of group membership

> ⚠️ Advisory numbers are externally managed. This document is provisionally **ADVISORY-038**, confirmed by DavDev against the register on 2026-08-14. Confirm again before treating the filename as canonical if time has passed.

---

## 1. Problem Statement

NetComplex has a working **tenant onboarding** flow (a new HOA gets provisioned onto the platform) and a working **admin-push invitation** flow (`Invitation` model — an admin invites a named resident by email). It has no **self-service resident registration** flow: a person who already knows their community and unit number, but has no admin-issued invitation yet, has no path onto the platform.

This is the one piece of the identity model IDENTITY_MODEL.md flags as genuinely unresolved ("Design Decision Pending": per-profile personal email vs. magic-link/Netflix-style household login), and it is also the last gap standing between the current single-tenant-proven build and being able to onboard additional communities without white-glove admin data entry for every resident.

A comparable product, EstateMate, ships this as a four-step mobile wizard: identity fields → community/property lookup → relationship-to-property selector → optional vehicle capture, submitted as a request that only becomes a working login once an admin has "loaded" the email. That last behavior is the significant part: it is not open self-service (anyone gets an account) and it is not admin-push-only (admin must think of every resident first) — it is **self-service submission gated by admin approval**, a request/approval pattern NetComplex already has one working instance of (`GroupMembershipRequest`) but has never applied to property membership.

---

## 2. Root Cause Analysis

| Finding                                                                                          | Evidence                                                                                                                      | Consequence                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No pending/unapproved state exists for property membership                                       | `SeatStatus` enum is `ACTIVE \| ARCHIVED \| COOLING_OFF` — no `PENDING`                                                       | A self-registered person has nowhere to sit while awaiting approval without either prematurely creating a live seat or bypassing approval entirely                                                                                      |
| `Invitation` is admin-initiated only                                                             | `Invitation` model requires `inviterId` (a `user`) and is created via admin-only routes                                       | There is no symmetric "request to be invited" entry point; residents cannot initiate                                                                                                                                                    |
| No `Vehicle` model exists anywhere in the schema                                                 | Full-text review of `schema.prisma`, `amenity.prisma`, `access-control.prisma`                                                | `access-control.prisma`'s `Visitor.vehicleReg` and `AccessEvent.vehicleReg` are free-text strings scoped to visitor management, not a resident-owned vehicle registry — EstateMate's "add your vehicles" step has no landing zone today |
| `Property` has no uniqueness constraint on `(tenantId, street, unit)`                            | `model Property` in `schema.prisma` — indexed on `ownerId`, `addressId`, `tenantId` only, no `@@unique` on the address fields | A property-number lookup (EstateMate's "Property Number" field) cannot reliably resolve to exactly one row today; duplicate property records for the same physical unit are schema-legal                                                |
| The per-profile-email vs. Netflix-model decision is open                                         | IDENTITY_MODEL.md, "Design Decision Pending" section                                                                          | Self-registration cannot be built without picking one — a shared household credential with a name-picker at login does not compose with "I am registering myself as a tenant, separately from the owner"                                |
| Bot-protection primitives already exist and are reusable                                         | SPEC.md §16 — `Honeypot`, Cloudflare Turnstile components already implemented                                                 | A public-facing registration surface is exactly the kind of endpoint these were built for; no new anti-abuse infrastructure is needed                                                                                                   |
| `GroupMembershipRequest` + `GroupModerationWidget` is a working precedent for exactly this shape | `admin-group-moderation` widget (`category: 'core'`, `permissions: ['admin']`) already renders a pending-request queue        | The admin-side UI pattern does not need to be invented, only extended to a new entity                                                                                                                                                   |

**Root cause, stated simply:** the platform has admin-push (`Invitation`) and peer-approval (`GroupMembershipRequest`) patterns, but no self-service-with-gate pattern, and no vehicle or reliable property-lookup data model to support the specific fields EstateMate's flow captures.

---

## 3. Options

| #   | Option                                                                                               | Description                                                                                                                                                                                          | Pros                                                                                                                                                                                                                                                                                              | Cons                                                                                                                                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Do nothing — admin enters every resident manually**                                                | Continue admin-only `Invitation` for all new tenants                                                                                                                                                 | Zero schema/UX work                                                                                                                                                                                                                                                                               | Does not scale past the anchor tenant; every new community onboarding requires an admin to hand-enter every household before residents can log in                                                                 |
| 2   | **Open self-service — account created immediately at submission**                                    | Better Auth account + live seat created at form submit, no gate                                                                                                                                      | Fastest time-to-access for legitimate residents                                                                                                                                                                                                                                                   | No admin control over who joins a private community; directly contradicts the "cannot sign in until admin loads the email" behavior you observed and want to replicate; high abuse surface on a public form       |
| 3   | **`PropertyJoinRequest` intake queue → promotes to existing `Invitation` on approval** (recommended) | New model captures the wizard's four steps as a pending record with no auth account created; admin approval converts it into a normal `Invitation` (reusing the acceptance flow that already exists) | No new auth-timing logic — Better Auth still only ever creates an account at Invitation acceptance, exactly as today; single approval queue widget, same shape as `GroupModerationWidget`; resolves the per-profile-email question implicitly (Invitation acceptance already uses personal email) | Requires the new model, the wizard UI (4 screens), the admin queue widget, and a `Vehicle` model                                                                                                                  |
| 4   | **`PropertyJoinRequest` with immediate Better Auth account + gated seat**                            | Account exists right after submission; dashboard shows "pending approval" until seat activated                                                                                                       | Matches EstateMate's literal login-blocked-until-loaded behavior most closely                                                                                                                                                                                                                     | Requires a new `PENDING` seat/session state, new auth-flow branching, and duplicate-account risk if a request is rejected and resubmitted; strictly more moving parts than Option 3 for the same end-user outcome |

**Recommendation: Option 3.** It produces the same effective behavior the person experienced in EstateMate (submit → wait → later gain access) without inventing a second account-creation code path alongside `Invitation`, and it resolves the "Design Decision Pending" item in IDENTITY_MODEL.md as a side effect: since accounts only ever get created via `Invitation` acceptance, personal-email-per-person is the only login model that was ever really live in this codebase, and this advisory recommends formally closing that decision in IDENTITY_MODEL.md rather than leaving it open.

---

## 4. Architecture: Before / After

### Before

```
                          ┌─────────────────┐
Admin manually creates ──►│  Invitation      │──► accept ──► user + Seat/Profile created
                          │  (inviterId req) │
                          └─────────────────┘

(no entry point for a resident who has not been pre-invited)
```

### After

```
Public wizard (no auth)
   │
   ▼
┌───────────────────────┐        admin approves        ┌──────────────────┐
│  PropertyJoinRequest   │ ─────────────────────────────►│  Invitation       │──► accept ──► user + Seat/Profile
│  status: PENDING       │                                │  (prefilled from  │      (unchanged flow)
│  + staged Vehicle[]    │        admin rejects           │   join request)   │
│                        │ ─────────────────────────────►│  status: REJECTED │
└───────────────────────┘   (requester notified,          └──────────────────┘
                              no account ever created)

Vehicle rows created at join-request time are re-parented to the
resulting Profile/Seat at Invitation acceptance (or discarded on reject).
```

**Relationship-type → seat/household mapping** (mirrors the four EstateMate options against your existing ADR-017 Property/Household split):

| Wizard option                              | Resulting record(s)                                                                            | Notes                                                                                                                                                                                                        |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "I'm the owner and reside in the property" | `StandardSeat` (isPrimaryOwner) + `Household.occupancyType = OWNER_OCCUPIED`                   | Straightforward — owner is also the resident                                                                                                                                                                 |
| "I'm the owner and lease the property"     | `StandardSeat` (isPrimaryOwner) + `Household.occupancyType = RENTAL`                           | Owner does not get a residency `Profile`; the actual occupant registers separately via the next row                                                                                                          |
| "I'm a tenant and rent this property"      | `Profile` (`residencyType = RENTER`) under the property's existing `Household`                 | Requires a `Household` with `occupancyType = RENTAL` to already exist on that `Property` — if none exists, the admin queue must surface this as a discrepancy rather than silently auto-creating a household |
| "I'm an additional user"                   | `Profile` (`householdRole = OCCUPANT` or `FAMILY`) attached to the existing active `Household` | This is a request to join an _existing_ household, not create a new seat                                                                                                                                     |

### New schema (additive only)

```prisma
enum JoinRequestStatus {
  PENDING
  APPROVED
  REJECTED
  WITHDRAWN
}

enum RelationshipType {
  OWNER_RESIDENT
  OWNER_LEASING
  TENANT_RENTER
  ADDITIONAL_USER
}

model PropertyJoinRequest {
  id                String            @id @default(uuid())
  tenantId          String
  propertyId        String?
  propertyNumberRaw String
  relationshipType  RelationshipType
  requestedName     String
  requestedSurname  String?
  requestedEmail    String
  requestedPhone    String?
  rulesAcceptedAt   DateTime?
  status            JoinRequestStatus @default(PENDING)
  reviewedByUserId  String?
  reviewedAt        DateTime?
  rejectionReason   String?
  resultingInvitationId String?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @default(now()) @updatedAt
  deletedAt         DateTime?

  Tenant   Tenant     @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  property Property?  @relation(fields: [propertyId], references: [id])
  vehicles Vehicle[]

  @@index([tenantId, status])
  @@index([propertyId])
  @@index([requestedEmail])
}

model Vehicle {
  id            String    @id @default(uuid())
  tenantId      String
  joinRequestId String?
  profileId     String?
  standardSeatId String?
  make          String?
  model         String?
  color         String?
  registration  String
  createdAt     DateTime  @default(now())
  deletedAt     DateTime?

  Tenant      Tenant                @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  joinRequest PropertyJoinRequest?  @relation(fields: [joinRequestId], references: [id], onDelete: Cascade)
  profile     Profile?              @relation(fields: [profileId], references: [id])
  standardSeat StandardSeat?        @relation(fields: [standardSeatId], references: [id])

  @@index([tenantId])
  @@index([joinRequestId])
  @@index([profileId])
  @@index([registration])
}
```

Both models are purely additive — no changes to `user`, `Invitation`, `StandardSeat`, `Profile`, or Better Auth tables. `Invitation` gains no new required fields; the approval action reads from `PropertyJoinRequest` and calls the existing invitation-creation path with prefilled values.

---

## 5. Pre-Execution Discovery Checklist

```bash
# 1. Confirm no existing self-registration code path already exists under a different name
grep -rln "JoinRequest\|self.registration\|selfRegister" src/ --include="*.ts" --include="*.tsx"

# 2. Confirm the Invitation acceptance flow's exact required inputs, to know what
#    PropertyJoinRequest must capture to prefill it without gaps
grep -rn "inviterId\|acceptInvitation" src/entities/tenant src/server/routers/core/invitations.ts 2>/dev/null

# 3. Confirm GroupModerationWidget's shape as the UI precedent to extend
cat src/widgets/admin/ui/GroupModerationWidget.tsx | head -60

# 4. Confirm bot-protection components are still wired and reusable as-is
grep -rln "Honeypot\|Turnstile" src/shared/ui/

# 5. Confirm whether any duplicate Property rows already exist for the same physical unit
#    (this determines whether property-number lookup can ship as exact-match or needs fuzzy/admin-assisted matching)
```

```sql
-- Run against a read replica / non-prod snapshot only
SELECT "tenantId", "street", "unit", COUNT(*) AS row_count
FROM "Property"
GROUP BY "tenantId", "street", "unit"
HAVING COUNT(*) > 1;

-- Confirm every RENTAL-occupancy household actually has an owner StandardSeat on the same property
-- (needed to validate the TENANT_RENTER branch of the mapping table in §4)
SELECT p.id AS property_id, h.id AS household_id, h."occupancyType"
FROM "Household" h
JOIN "Property" p ON p.id = h."propertyId"
WHERE h."occupancyType" = 'RENTAL'
  AND NOT EXISTS (
    SELECT 1 FROM "StandardSeat" ss WHERE ss."propertyId" = p.id
  );
```

**Discovery deliverable:** a short findings note confirming (a) whether `Property` address duplication is a live problem requiring cleanup before shipping property lookup, (b) the exact field set `Invitation` acceptance needs so `PropertyJoinRequest` → `Invitation` promotion has no missing-data dead end, and (c) that Honeypot/Turnstile can be dropped onto the new public wizard route without modification.

---

## 5b. Discovery Findings (2026-08-15)

Discovery was run against `dev` (code + live DB read-only queries). Findings:

| #   | Discovery item                      | Result                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Existing self-registration path     | **None.** `grep` found only `provider-platform.ts:341` ("self-registration" in a comment), which is the provider-stub path (`createProviderStub`), not resident onboarding. No `JoinRequest`/`selfRegister`/`self-registration` implementation exists.                                                                                                                                      |
| 2   | `Invitation` acceptance inputs      | `CreateInvitationInput` requires `email`, `name`; optional `street`, `unit`, `residencyType` (`FAMILY\|RENTER\|OWNER`), `role`, `organizationId`. `createInvitation` additionally sets `inviterId` (approving admin), `token`, `status=PENDING`, `expiresAt` (7d). **`Invitation` has no `propertyId`** — promotion must map `Property.street`/`unit` into the free-text invitation fields. |
| 3   | `GroupModerationWidget` precedent   | Confirmed present and working (`src/widgets/admin/ui/GroupModerationWidget.tsx`). PENDING/ALL filter, approve/reject buttons, per-tenant scoping.                                                                                                                                                                                                                                           |
| 4   | Bot protection                      | **Reusable as-is.** `Honeypot` + `checkHoneypot` and `TurnstileWidget` + `verifyTurnstile` are exported from `@shared/ui` and `@api/server`. The public signup route already demonstrates the pattern (rate-limit + Turnstile + Better Auth forward).                                                                                                                                       |
| 5   | `Property` duplicate-address risk   | **Live data clean, constraint absent.** Query returned **0** duplicate `(tenantId, street, unit)` rows (6 properties). But `Property` has no `@@unique([tenantId, street, unit])` — only indexes. A uniqueness constraint must be added before shipping exact-match property lookup, otherwise duplicates are schema-legal and can appear later.                                            |
| 6   | RENTAL household without owner seat | **Live data clean, invariant unenforced.** Query returned **0** RENTAL households missing an owner `StandardSeat` (1 RENTAL household; 6 seats, all `isPrimaryOwner`). Nothing in the schema enforces this, so the `TENANT_RENTER` branch must still surface the "no RENTAL household / no owner seat" discrepancy rather than assume it.                                                   |
| 7   | `Vehicle` model                     | **Confirmed absent.** Only `vehicleReg` free-text on `Visitor`, `AccessEvent`, `AccessRequest` in `access-control.prisma`. The proposed `Vehicle` table has no landing zone collision.                                                                                                                                                                                                      |
| 8   | Email templates                     | `teamInvitation` exists and is the promotion path's email. A rejection notification needs either a new template or reuse of `emailNotification`.                                                                                                                                                                                                                                            |

**Discovery deliverable conclusions:**

- (a) Property lookup can ship as **exact-match**, but the `Property` uniqueness constraint must be part of Phase 1 (not deferred), since the current absence of duplicates is data luck, not schema law.
- (b) `PropertyJoinRequest` → `Invitation` promotion needs an explicit **street/unit extraction** step; `Invitation` does not reference `Property` directly.
- (c) `Honeypot`/`Turnstile` can be dropped onto the new public wizard route unchanged.

---

## 6. Phased Execution Plan

### Phase 0 — Discovery (prerequisite)

Run §5 checklist, produce findings note. **Gate: G0**

**Status: COMPLETE (2026-08-15).** See §5b. G0 blocker cleared.

### Phase 1 — Schema (additive only)

Add `PropertyJoinRequest`, `Vehicle`, `JoinRequestStatus`, `RelationshipType` per §4. **Also add a `Property` `@@unique([tenantId, street, unit])` constraint** — discovery confirmed no live duplicates, but the constraint is the schema guarantee exact-match lookup depends on (see §5b). **Gate: G1**

**Status: IN PROGRESS (2026-08-15).** Prisma models + enums + `Property` unique constraint added and `prisma validate` passes; Drizzle regenerated (`property-join-requests`, `vehicles`, `join-request-status-enum`, `relationship-type-enum`); `db.ts` + server barrel exports wired. Migration `20260815000000_add_property_join_request_and_vehicle` created but **not yet applied**. G1 (relationship-type semantics) still open with DavDev.

### Phase 2 — Public wizard (4 screens, no auth required)

1. Identity (name, surname optional, email, phone) + Community/Property lookup (tenant slug typeahead → **exact** property-number match against `Property`) + estate rules acknowledgment link
2. Relationship-type selector (four options per §4 table)
3. Vehicle capture (optional, repeatable, staged against the `PropertyJoinRequest`, not yet linked to any Profile/Seat)
4. Review + submit → creates `PropertyJoinRequest` with `status = PENDING`

Honeypot + Turnstile applied to the submission endpoint per existing bot-protection pattern. **Gate: G2**

### Phase 3 — Admin approval queue

New widget analogous to `GroupModerationWidget`: list of `PENDING` requests scoped by tenant, showing requested relationship type, property match confidence, and staged vehicles. Approve action **extracts `street`/`unit` from the linked `Property`** and calls the existing `createInvitation` path (which has no `propertyId` field); reject action requires a reason and notifies the requester by email (reusing existing email templates infrastructure). **Gate: G3**

### Phase 4 — Invitation acceptance re-parents vehicles

On `Invitation` acceptance, any `Vehicle` rows still attached to the originating `PropertyJoinRequest` are re-parented to the newly created `Profile` or `StandardSeat`. On rejection or withdrawal, vehicles are soft-deleted alongside the request. **Gate: G4**

**Note:** invitation acceptance currently only sets `user.role`/`tenantId`; the seat/profile/household provisioning is a separate downstream concern that this phase must not assume is automatic. Flag the exact acceptance-side provisioning boundary for DavDev before building re-parenting.

### Phase 5 (out of scope here) — IDENTITY_MODEL.md decision closure

Formally update IDENTITY_MODEL.md's "Design Decision Pending" section to record that per-profile personal email is the adopted model, with this advisory as the evidence trail (accounts are only ever created via `Invitation` acceptance, which is already personal-email-scoped). Documentation-only, no gate required beyond DavDev sign-off.

---

## 7. Risk Register

| Risk                                                                                 | Likelihood                    | Impact | Mitigation                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------ | ----------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public registration endpoint abused (bot spam, scraping property numbers)            | Medium                        | Medium | Reuse existing Honeypot + Turnstile components (SPEC.md §16) unmodified; rate-limit via existing `rate-limit.ts` utility. **Confirmed reusable in §5b.**                                                                             |
| Property-number lookup returns ambiguous/duplicate matches                           | Low (live data: 0 duplicates) | Medium | Discovery found no live duplicates, but no schema constraint exists. **Phase 1 must add `Property` `@@unique([tenantId, street, unit])`**; exact-match lookup only after that lands.                                                 |
| `TENANT_RENTER` requests submitted against a property with no `RENTAL` household yet | Medium                        | Low    | Approval queue surfaces this as a flagged discrepancy rather than blocking or silently creating a `Household`; admin decides. Live data currently has 1 RENTAL household and 0 missing owner seats.                                  |
| Vehicle registration numbers are personal data under POPIA                           | Low                           | Medium | `Vehicle` follows the same tenant-scoped, soft-deletable pattern as other PII-adjacent models; no new RLS table needed since it's not in the ADR-019 sensitive-table set, but flag for inclusion if POPIA review says otherwise      |
| Duplicate `PropertyJoinRequest` submissions for the same person/property             | Medium                        | Low    | `@@index([requestedEmail])` supports a pre-submit duplicate check in the API layer; not a hard DB constraint since a legitimately rejected-then-resubmitted request must be allowed                                                  |
| Rejected requests leave orphaned staged vehicles                                     | Low                           | Low    | Phase 4 handles cascade soft-delete on reject/withdraw explicitly                                                                                                                                                                    |
| Promotion produces an `Invitation` missing seat/profile/household provisioning       | Medium                        | High   | `Invitation` acceptance currently only sets `user.role`/`tenantId`; seat/profile/household creation is a separate flow. Phase 3/4 must confirm the provisioning boundary explicitly instead of assuming acceptance provisions seats. |

---

## 8. Done Criteria

- [x] ✅ `PropertyJoinRequest`, `Vehicle`, `JoinRequestStatus`, `RelationshipType` exist in `prisma/schema.prisma`, Drizzle schema regenerated (migration not yet applied)
- [x] ✅ Discovery findings note (§5b) attached, including the `Property` duplicate-address query result (0 duplicates)
- [x] ✅ `Property` gains `@@unique([tenantId, street, unit])` before exact-match property lookup ships (constraint added, migration pending)
- [ ] ⏳ Public wizard live behind Honeypot + Turnstile, no Better Auth account created at any point in the flow
- [ ] ⏳ Admin approval queue widget mirrors `GroupModerationWidget` UX conventions (approve/reject, reason on reject)
- [ ] ⏳ Approval creates a normal `Invitation` indistinguishable from an admin-authored one downstream, with `street`/`unit` extracted from the linked `Property`
- [ ] ⏳ Vehicle re-parenting on acceptance and cascade soft-delete on reject both covered by tests
- [ ] ⏳ Invitation-acceptance provisioning boundary (seat/profile/household) confirmed with DavDev before Phase 4
- [ ] ⏳ IDENTITY_MODEL.md "Design Decision Pending" section updated to record per-profile-email as adopted

---

## 9. Decision Gates

| Gate   | Question for DavDev                                                                                                                                                                                                                                                                  | Blocks               | Resolution (2026-08-15)                                                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **G0** | ~~Confirm advisory number (038) and scope to Phases 1–4~~ **SATISFIED — discovery complete (§5b)**                                                                                                                                                                                   | All execution        | ✅ Satisfied                                                                                                                                                                                  |
| **G1** | Confirm the `RelationshipType` four-way split matches your actual product intent for `OWNER_LEASING` (does the owner get any dashboard access at all, or purely a legal/billing record with no login flow triggered until a tenant separately registers?)                            | Phase 1              | ✅ Resolved — OWNER_LEASING retains dashboard access as a _derived state_ on the live schema (`StandardSeat` + `Household.occupancyType = RENTAL`). See `ADVISORY-38_G1_ADDENDUM_AMENDED.md`. |
| **G2** | Confirm property lookup UX: **exact property-number match only** (discovery found 0 live duplicates), and that Phase 1 adds the `Property` `@@unique([tenantId, street, unit])` constraint as the schema guarantee                                                                   | Phase 2              | ✅ Accepted                                                                                                                                                                                   |
| **G3** | Confirm rejection notifications reuse the existing email templates infrastructure (`src/shared/api/email/templates.ts`) rather than a new template set                                                                                                                               | Phase 3              | ✅ Resolved — new rejection template (not reuse `emailNotification`)                                                                                                                          |
| **G4** | Confirm this advisory is intentionally scoped away from ADVISORY-034 (Platform Identity Layer) — i.e. `PropertyJoinRequest`/`Invitation` continue keying identity off `user.email` uniqueness as they do today, with no dependency on `Identity`/`Credential` entities landing first | Phase 1 (sequencing) | ✅ Accepted — no ADVISORY-034 dependency                                                                                                                                                      |
| **G5** | Confirm the invitation-acceptance provisioning boundary: does acceptance need to create `StandardSeat`/`Profile`/`Household` records, or is that a separate existing flow that `PropertyJoinRequest` promotion must not assume?                                                      | Phase 4              | ✅ Accepted — provisioning boundary must be explicit                                                                                                                                          |
