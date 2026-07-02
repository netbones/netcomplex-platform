# ADVISORY-0255555: Family Services Domain (Milestones + VAS Marketplace Integration)

**Status:** Draft — Pending Decision Gates (revised from v1 per DavDev feedback: elevated from a Profile field addition to a proper domain with a dedicated model and marketplace-attached VAS surface)
**Author:** Architectural Advisor (Claude)
**Requested by:** DavDev
**Related:** ADR-020 (Focus Space Architecture), ADR-021 (Dual-API Governance), ADVISORY-021 (Tenant FK relations — Profile/Household in scope there), UBIQUITOUS_LANGUAGE.md C2 (triple gating system), existing Marketplace domain (`CommunityServiceListing`, `ServiceBooking`, `ServiceProvider`, `marketplace` checkout router)

---

## 1. Problem Statement

Family Services needs to support **multiple opt-in milestone types per person/household** (birthdays, wedding anniversaries, and open-ended custom dates) — not just one field — because consent, sensitivity, and future notification cadence differ per type. It also needs to be the **discovery surface for Value-Added Services** tied to those milestones (e.g. "it's Mom's birthday — send flowers"), fulfilled by third-party `ServiceProvider`s, with the platform taking a transaction fee.

Critically: the commerce mechanics for "third party fulfills, platform takes a fee" **already exist** in this codebase — `ServiceBooking.price` / `ServiceBooking.platformFee`, `ServiceProvider.providerType: COMMUNITY | THIRD_PARTY`, and an existing `marketplace` checkout pipeline (`src/server/routers/marketplace/checkout.ts`, `src/app/api/marketplace/checkout/route.ts`). Family Services' job is to be a **curated entry point** into that existing pipeline, plus the personal-milestone data model that doesn't exist yet — not to build a second commerce/payment stack.

## 2. Root Cause / Gap Analysis

| Need                                                                     | Exists today?                                                                                                      | Gap                                                                                                                          |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Per-type opt-in milestones (birthday vs. wedding anniversary vs. custom) | No                                                                                                                 | **Real gap — build `FamilyMilestone` now**                                                                                   |
| Occupancy/residency anniversary ("N years in Soralia")                   | `Profile.occupantSince`, `Household.moveInDate`                                                                    | None — stays computed, not stored                                                                                            |
| Third-party provider fulfillment                                         | `ServiceProvider.providerType` (`COMMUNITY`/`THIRD_PARTY`)                                                         | None                                                                                                                         |
| Platform transaction fee capture                                         | `ServiceBooking.price` + `ServiceBooking.platformFee`, `ProviderCharge`/`ProviderInvoice`/`RevenueRecord` pipeline | None                                                                                                                         |
| Booking/inquiry UI (add to cart, confirm, pay)                           | `InquireModal`, `BookingBottomSheet`, `CheckoutSummary`, `marketplace/checkout` router                             | None                                                                                                                         |
| Curated "occasion" category for gifting/floral/celebration listings      | `CommunityServiceListing.category` is a free-text `String` (no lookup table, unlike `MaintenanceCategory`)         | **Gap — but a Marketplace-domain gap, not a Family Services one.** Flagged as a coordination point (§9, G4), not solved here |
| Linking a booking back to _why_ it happened (which milestone)            | No FK from `ServiceBooking`/`CommunityServiceInquiry` back to a source event                                       | **Small, real gap — needed for VAS attribution/reporting**                                                                   |

## 3. Recommended Architecture

### 3.1 `FamilyMilestone` model (new — build now)

```prisma
model FamilyMilestone {
  id               String        @id @default(cuid())
  tenantId         String
  profileId        String?       // person-scoped (birthday) — nullable
  householdId      String?       // household-scoped (e.g. "family day") — nullable
  createdByUserId  String        // Standard/Solo Seat holder who added it
  type             MilestoneType // BIRTHDAY | WEDDING_ANNIVERSARY | OTHER
  label            String?       // required when type = OTHER, optional custom name otherwise
  month            Int           // 1-12
  day              Int           // 1-31
  originYear       Int?          // optional — enables "25th anniversary" style counts. NEVER populate for BIRTHDAY (age-disclosure risk under POPIA)
  isPublic         Boolean       @default(false) // community-visible opt-in — off by default
  remindDaysBefore Int           @default(3)     // lead time for personal reminder + VAS CTA surfacing
  deletedAt        DateTime?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  profile   Profile?   @relation(fields: [profileId], references: [id], onDelete: Cascade)
  household Household? @relation(fields: [householdId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([profileId])
  @@index([householdId])
  @@index([tenantId, month, day])
}

enum MilestoneType {
  BIRTHDAY
  WEDDING_ANNIVERSARY
  RELIGOUS_HOLIDAY
  OTHER
}
```

**Two audiences, two visibility rules — this is the core product/privacy distinction:**

- **Private reminder + self-initiated gifting** ("remind me it's Mom's birthday, let me send flowers"): scoped to the household/profile owner, does **not** require `isPublic` — it's not being shown to the community, just to the person who set the reminder.
- **Community celebration surface** ("🎉 It's John's birthday today"): requires `isPublic: true`, opt-in, off by default, settable only by the managing Standard Seat holder or the profile's own Solo Seat. Given `Profile` can represent minors, this is a hard rule, not a UI default.

`originYear` is deliberately gated to non-birthday types at the application/Zod layer — a decision worth making explicit rather than leaving to convention (§9, G2).

Occupancy anniversaries remain **computed**, not stored, from `Profile.occupantSince` / `Household.moveInDate` — no reason to duplicate data the schema already has.

### 3.2 VAS attribution — thin link into the existing Marketplace domain, not a new one

Add one nullable, indexed FK each to the two existing marketplace entry points, purely for attribution/reporting — no new commerce logic:

```prisma
model CommunityServiceInquiry {
  // ...existing fields...
  sourceMilestoneId String?
  sourceMilestone    FamilyMilestone? @relation(fields: [sourceMilestoneId], references: [id])
  @@index([sourceMilestoneId])
}

model ServiceBooking {
  // ...existing fields...
  sourceMilestoneId String?
  sourceMilestone    FamilyMilestone? @relation(fields: [sourceMilestoneId], references: [id])
  @@index([sourceMilestoneId])
}
```

This gives you "% of marketplace revenue attributable to Family Services CTAs" as a reporting query for free, without Family Services owning any part of price, fee, or payment status — those stay exactly where they are on `ServiceBooking`/`ProviderCharge`/`ProviderInvoice`.

**No changes to `PaymentGateway`, `PaymentTransaction`, `ProviderCharge`, `ProviderInvoice`, `RevenueRecord`.** The fee-take mechanism is already correct for this use case; duplicating it would be the actual over-engineering risk here.

### 3.3 FSD placement — composition happens at the widget layer, not inside an entity

**This is the one hard architectural constraint worth flagging explicitly.** FSD entities are siblings — `entities/family-services` must not import from `entities/marketplace` (or vice versa); that's exactly the kind of cross-slice violation Steiger enforces post-Phase 44. The milestone data and the marketplace CTA are composed one layer up:

```
src/entities/family-services/          # NEW — was "celebration" in v1, renamed to match the domain
├── index.ts / index.server.ts
├── model/{types.ts, constants.ts}
├── services/index.ts                  # getUpcomingMilestones(), computeOccupancyAnniversaries()
├── permissions/index.ts               # who may set/view a given milestone
└── ui/MilestoneBadge.tsx              # dumb display component only

src/widgets/dashboard/ui/
└── CelebrationsWidget.tsx             # composes entities/family-services (data)
                                        # + entities/marketplace or features/marketplace (InquireModal/
                                        #   BookingBottomSheet) for the "Send a Gift" CTA
                                        # — this composition is legal at the widget layer
```

The widget passes `sourceMilestoneId` into the existing `InquireModal`/booking flow as context; it does not re-implement inquiry or checkout.

### 3.4 Module/tier gating — graceful degradation, not a single flag

Family Services spans two existing tiers of concern:

- **Milestone tracking + personal reminders**: no commerce dependency, works at Foundation tier under the `directory` module (extends `Profile`-adjacent data).
- **"Send a Gift" VAS CTA**: depends on the `marketplace` module, which is Growth-tier gated per PRD.md's module table.

Recommend: `canAccess()` (Phase 41 infra, per v1's reasoning — still holds, avoids deepening C2) gates the milestone widget itself; the CTA button conditionally renders only if `marketplace` module is enabled for the tenant. A Foundation-tier tenant sees "🎂 John's birthday is in 3 days" with no CTA; a Growth-tier tenant sees the same plus "Send a Gift 🎁".

## 4. Pre-Execution Discovery Checklist

```bash
# Confirm no existing collision on new model/enum names
grep -n "FamilyMilestone\|MilestoneType" prisma/schema.prisma

# Resolve widget registry path drift (same open item as v1)
find src -name "widgets.ts" -path "*dashboard*"

# Confirm existing marketplace booking/inquiry UI to reuse — do NOT rebuild these
cat src/features/marketplace/ui/InquireModal.tsx | head -30
cat src/entities/marketplace/ui/BookingBottomSheet.tsx | head -30
grep -n "platformFee\|price" prisma/schema.prisma | grep -A2 -B2 ServiceBooking

# Confirm the existing checkout pipeline actually wires ServiceBooking to a real payment gateway today
# (needed before assuming Family Services can just "plug in" — verify, don't assume)
cat src/server/routers/marketplace/checkout.ts
cat src/app/api/marketplace/checkout/route.ts

# Confirm CommunityServiceListing.category is genuinely free-text (no lookup table) before
# proposing a "Celebrations & Gifting" category — this affects G4 below
grep -n "category" prisma/schema.prisma | grep -i communityservicelisting -A1 -B1
grep -rn "MaintenanceCategory" src/entities/maintenance/  # confirm the lookup-table precedent shape

# Confirm Phase 41 canAccess() infra landed (same check as v1)
grep -n "export function canAccess" src/entities/tenant/api/gate/gate.ts

# Confirm current module/tier check pattern for conditional CTA rendering
grep -rn "isModuleEnabled\|assertModuleEnabled" src/entities/tenant/lib/modules/

# Confirm latest migration naming convention
ls prisma/migrations | tail -5
```

## 5. Phased Execution Plan

**Phase 1 — Model + personal surface (this advisory)**

1. Migration: `FamilyMilestone` model + `MilestoneType` enum + `sourceMilestoneId` FKs on `CommunityServiceInquiry`/`ServiceBooking` (all additive, zero backfill).
2. `prisma generate` → Drizzle regen.
3. `src/entities/family-services` slice (types, `getUpcomingMilestones`, `computeOccupancyAnniversaries`, permissions).
4. tRPC procedures (new small router `familyMilestones.ts`, or extend `identity` — **decision gate G3**): create/update/delete own milestone, list upcoming (tenant-scoped, respects `isPublic`).
5. `CelebrationsWidget` (personal reminders + community-visible celebrations), gated via `canAccess()`.
6. Profile-edit UI extension: Standard/Solo Seat holder adds/edits milestones for profiles they manage.

**Phase 2 — VAS CTA integration (separate follow-up advisory once Phase 1 lands)** 7. "Send a Gift" CTA on `CelebrationsWidget`, conditional on `marketplace` module enabled. 8. CTA opens existing `InquireModal`/`BookingBottomSheet` pre-filtered to a curated category, passing `sourceMilestoneId`. 9. Admin reporting: revenue/bookings attributable to Family Services (`sourceMilestoneId IS NOT NULL` query against existing `RevenueRecord`/`ServiceBooking`).

**Phase 3 — Deferred, needs explicit go-ahead**

- Notification/cron for "🎉 today's the day" + "3 days until Mom's birthday, want to send something?" — cron pattern already exists (`ai-pool-rollover`, message pruning); this would follow the same shape.
- Any dedicated "Celebrations & Gifting" `ServiceCategory` lookup table — this is really a Marketplace-domain taxonomy decision (G4) that Family Services would benefit from but shouldn't unilaterally create.

## 6. Risk Register

| Risk                                                                                                    | Likelihood             | Impact                    | Mitigation                                                                                                 |
| ------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Minor's birthday exposed without guardian awareness                                                     | Low                    | High (POPIA/safeguarding) | `isPublic` default `false`; only Standard Seat holder / own Solo Seat can toggle; admin cannot bulk-enable |
| `originYear` leaks age for `BIRTHDAY` type                                                              | Low                    | Medium                    | Zod-layer rule: `originYear` rejected when `type = BIRTHDAY` (G2)                                          |
| VAS CTA assumed to "just work" against checkout but the pipeline has gaps not visible from schema alone | Medium                 | Medium                    | Discovery checklist explicitly verifies `checkout.ts`/`route.ts` before Phase 2 starts — do not assume     |
| `entities/family-services` accidentally imports `entities/marketplace` internals, tripping Steiger      | Medium                 | Low (caught by CI)        | Composition explicitly scoped to widget layer (§3.3); called out for the executing agent                   |
| Family Services becomes a de facto second marketplace if scope creeps                                   | Low (with this design) | High                      | §3.2 explicitly forbids new price/fee/payment fields on `FamilyMilestone`                                  |

## 7. Done Criteria (Phase 1)

- [ ] `FamilyMilestone` migration applied, additive/nullable, zero existing-row impact
- [ ] `sourceMilestoneId` FKs added to `CommunityServiceInquiry`/`ServiceBooking`, nullable, unused until Phase 2
- [ ] Personal reminders work without `isPublic`; community surface respects `isPublic` strictly
- [ ] `originYear` rejected for `BIRTHDAY` type at the API boundary
- [ ] No new fields added to `ServiceBooking`/`ProviderCharge`/`PaymentTransaction` for fee/price — Phase 1 touches attribution only
- [ ] `entities/family-services` has zero imports from `entities/marketplace` (Steiger-clean)

## 8. Decision Gates

- **G1** — Build `FamilyMilestone` now, as a dedicated model (not deferred). _(Resolved per your direction: yes.)_
- **G2** — `originYear` allowed for `WEDDING_ANNIVERSARY`/`OTHER`, forbidden for `BIRTHDAY`, enforced at Zod/tRPC layer not DB layer. _(Recommended: yes — confirm.)_
- **G3** — New standalone `familyMilestones` tRPC router vs. extending `identity`. _(Recommended: new router — this is now a real domain, not a Profile-field extension.)_
- **G4** — Whether `CommunityServiceListing.category` should become a lookup table (`ServiceCategory`, mirroring `MaintenanceCategory`) to properly support a curated "Celebrations & Gifting" category for Phase 2. _(This is a Marketplace-domain decision with impact beyond Family Services — recommend raising as its own small advisory before Phase 2 starts, not deciding inside this one.)_
- **G5** — `canAccess()` (Phase 41) vs. new `PlatformPageFlags` entry for the milestone widget itself. _(Recommended: `canAccess()`, per v1 reasoning — still holds.)_
- **G6** — Phase 2 (VAS CTA) and Phase 3 (notifications/cron) confirmed as separate follow-up advisories once Phase 1 is live, not bundled into this execution. _(Recommended: yes — keeps blast radius contained and lets real usage data inform the Phase 2 design.)_

Phase 1 is scoped tightly enough to execute once G1–G3 and G5 are confirmed; G4 and Phase 2/3 scope are intentionally left for a follow-up once the model is live and you've seen real opt-in data.
