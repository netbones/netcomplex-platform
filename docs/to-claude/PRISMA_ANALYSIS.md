---
title: Comprehensive Prisma Schema Analysis
status: current
reviewed: 2026-07-28
tags: [context, handoff]
audience: developer
---

# Comprehensive Prisma Schema Analysis

File: `prisma/schema/schema.prisma` + `prisma/schema/tenant.prisma` (3308 lines across 2 files via `prismaSchemaFolder`)

## 1. Model and Enum Counts

| Category | Count |
| -------- | ----- |
| Models   | 120   |
| Enums    | 84    |

_Up from 108 models / 76 enums in the original flat `prisma/schema.prisma` (2955 lines)._

## 2. All Models with Their Relations

### Auth & Sessions (5 models)

| Model        | Relations (FK arrows point to referenced model) |
| ------------ | ----------------------------------------------- |
| account      | user (Cascade)                                  |
| verification | none                                            |
| passkey      | user (Cascade)                                  |
| session      | user (Cascade)                                  |
| twoFactor    | user (Cascade)                                  |

### User & Identity (8 models)

| Model        | Relations                                                                   |
| ------------ | --------------------------------------------------------------------------- |
| user         | Central hub: ~86 relation back-links (see full list below)                  |
| Profile      | Household (Cascade), user (2 named), Address?, Tenant, ResidentDelegation[] |
| Member       | Organization (Cascade), user (Cascade)                                      |
| Organization | Invitation[], Member[]                                                      |
| Notification | user (Cascade)                                                              |
| UserKey      | user (Cascade)                                                              |
| UserDevice   | user (Cascade)                                                              |

### Seats (3 models)

| Model        | Relations                                       |
| ------------ | ----------------------------------------------- |
| PremiumSeat  | user (Cascade), Address?, PropertyPremiumSeat[] |
| SoloSeat     | user, Address?, Property?                       |
| StandardSeat | Property (Cascade), user (Cascade), Address?    |

### Tenant & Platform (7 models)

| Model             | Relations                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| PlatformModule    | TenantModule[]                                                                                                |
| TenantModule      | PlatformModule, Tenant (Cascade)                                                                              |
| Tenant            | user? ("TenantOwner"), TenantModule[], TenantAchievement[], AssistSession[], TenantSetup, TenantFeatureFlag[] |
| Setting           | none                                                                                                          |
| SubscriptionTier  | ProviderSubscription[]                                                                                        |
| TenantFeatureFlag | Tenant (Cascade)                                                                                              |
| TenantSetup       | Tenant (Cascade), SetupMission[], SetupSetting[]                                                              |

### Directory & Properties (6 models)

| Model               | Relations                                                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Property            | user? ("PropertyOwner"), Address?, Booking[], Household[], MaintenanceRequest[], AgentAccess[], PropertyListing[], ResidentDelegation[], SoloSeat[], StandardSeat[], PropertyPremiumSeat[] |
| Household           | Property (Cascade), Profile[]                                                                                                                                                              |
| PropertyListing     | user (2 named relations), Property (Cascade)                                                                                                                                               |
| PropertyPremiumSeat | Property (Cascade), PremiumSeat (Cascade)                                                                                                                                                  |
| Invitation          | user (Cascade), Organization (Cascade)                                                                                                                                                     |

### Chat & Messaging (3 models)

| Model                   | Relations                              |
| ----------------------- | -------------------------------------- |
| Conversation            | ConversationParticipant[], Message[]   |
| ConversationParticipant | Conversation (Cascade), user (Cascade) |
| Message                 | Conversation (Cascade), user           |

### Content & Community (13 models)

| Model                  | Relations                                                          |
| ---------------------- | ------------------------------------------------------------------ |
| Content                | user?, Group?, ContentLike[], ContentVersion[], ContentAuditLog[]  |
| ContentLike            | Content (Cascade), user (Cascade)                                  |
| ContentVersion         | Content (Cascade), user? (SetNull)                                 |
| ContentAuditLog        | Content (Cascade), user? (SetNull)                                 |
| Group                  | user (Cascade), Content[], GroupMembershipRequest[], GroupMember[] |
| GroupMember            | Group (Cascade), user (Cascade)                                    |
| GroupMembershipRequest | Group (Cascade), user (Cascade)                                    |
| Album                  | user (Cascade)                                                     |
| Resource               | user?, ResourceVersion[], Announcement[]                           |
| ResourceVersion        | Resource (Cascade)                                                 |
| Announcement           | Resource?                                                          |
| Support                | user (2 named: ReceivedSupports / SentSupports)                    |
| MediaUpload            | user (Cascade)                                                     |

### Events & Voting (3 models)

| Model         | Relations                                   |
| ------------- | ------------------------------------------- |
| Event         | EventAttendee[], MeetingProxy[]             |
| EventAttendee | Event (Cascade), user (Cascade)             |
| MeetingProxy  | Event (meetingId), user (3 named relations) |

### Bookings (1 model)

| Model   | Relations                 |
| ------- | ------------------------- |
| Booking | Property?, user (Cascade) |

### Maintenance (9 models)

| Model                   | Relations                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| MaintenanceRequest      | Property?, user (Cascade), user? (landlord), MaintenanceTeam?, ServiceProvider?, RequestHistory[], RequestNote[], InternalMaintenanceNote[] |
| MaintenanceTeam         | MaintenanceRequest[], MaintenanceTeamMember[]                                                                                               |
| MaintenanceTeamMember   | MaintenanceTeam (Cascade), user (Cascade)                                                                                                   |
| MaintenanceCategory     | none                                                                                                                                        |
| RequestNote             | MaintenanceRequest (Cascade), user                                                                                                          |
| InternalMaintenanceNote | MaintenanceRequest (Cascade), user                                                                                                          |
| RequestHistory          | MaintenanceRequest (Cascade), user                                                                                                          |

### Service Providers (16 models)

| Model                   | Relations                                                                                                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ServiceProvider         | user?, Address?, MaintenanceRequest[], ProviderVerification[], ProviderLegalAgreement[], ProviderReputation?, ProviderMerit[], ProviderSubscription[], PaymentTransaction[], RevenueRecord[], ProviderCharge[], ProviderInvoice[], ServiceBooking[] |
| CommunityServiceInquiry | user, CommunityServiceListing (Cascade)                                                                                                                                                                                                             |
| CommunityServiceListing | user, CommunityServiceInquiry[], CommunityServiceReview[], ServiceBooking[]                                                                                                                                                                         |
| CommunityServiceReview  | CommunityServiceListing (Cascade), user                                                                                                                                                                                                             |
| ProviderVerification    | ServiceProvider                                                                                                                                                                                                                                     |
| ProviderLegalAgreement  | ServiceProvider                                                                                                                                                                                                                                     |
| ProviderReputation      | ServiceProvider                                                                                                                                                                                                                                     |
| ProviderMerit           | ServiceProvider                                                                                                                                                                                                                                     |
| ProviderSubscription    | ServiceProvider, SubscriptionTier, PaymentTransaction[], ProviderCharge[], ProviderInvoice[]                                                                                                                                                        |
| PaymentTransaction      | ServiceProvider, ProviderSubscription, ProviderCharge[], ProviderInvoice[], RevenueRecord[]                                                                                                                                                         |
| RevenueRecord           | ServiceProvider, PaymentTransaction                                                                                                                                                                                                                 |
| ProviderCharge          | ServiceProvider, ProviderSubscription, PaymentTransaction?                                                                                                                                                                                          |
| ProviderInvoice         | ServiceProvider, ProviderSubscription, PaymentTransaction                                                                                                                                                                                           |
| ServiceBooking          | CommunityServiceListing (Cascade), ServiceProvider (Cascade), user (Cascade)                                                                                                                                                                        |

### Billing / Platform SaaS (9 models)

| Model              | Relations                                                     |
| ------------------ | ------------------------------------------------------------- |
| BillingPlan        | TenantSubscription[], Coupon[]                                |
| TenantSubscription | BillingPlan, TenantInvoice[], TenantPayment[], BillingEvent[] |
| TenantInvoice      | TenantSubscription                                            |
| TenantPayment      | TenantSubscription                                            |
| BillingAdjustment  | none                                                          |
| BillingEvent       | TenantSubscription?                                           |
| Coupon             | BillingPlan?, CouponRedemption[]                              |
| CouponRedemption   | Coupon                                                        |
| TaxRate            | TaxJurisdiction?                                              |
| TaxJurisdiction    | TaxRate[]                                                     |

### Surveys (5 models)

| Model          | Relations                                  |
| -------------- | ------------------------------------------ |
| Survey         | Question[], Response[], SurveySection[]    |
| Question       | Survey (Cascade), SurveySection? (SetNull) |
| Response       | Survey (Cascade)                           |
| SurveySection  | Survey (Cascade), Question[]               |
| ExternalSurvey | none                                       |

### Community Merits (1 model)

| Model          | Relations                |
| -------------- | ------------------------ |
| CommunityMerit | user (3 named relations) |

### Competitions (2 models)

| Model            | Relations                             |
| ---------------- | ------------------------------------- |
| Competition      | CompetitionEntry[]                    |
| CompetitionEntry | Competition (Cascade), user (Cascade) |

### Bursaries (2 models)

| Model        | Relations                |
| ------------ | ------------------------ |
| Bursary      | BursaryField[]           |
| BursaryField | Bursary[] (inverse side) |

### Admin & Suspensions (6 models)

| Model              | Relations                                                            |
| ------------------ | -------------------------------------------------------------------- |
| AssistSession      | user, Tenant (Cascade)                                               |
| AgentAccess        | user (2 named), Property (Cascade), AgentToken[], DelegationAction[] |
| AgentToken         | user (2 named), AgentAccess?                                         |
| DelegationAction   | user, AgentAccess                                                    |
| ResidentDelegation | Property (Cascade), user, Profile (Cascade)                          |
| PlatformSuspension | user (Cascade)                                                       |

### Achievements (4 models)

| Model                   | Relations                                                         |
| ----------------------- | ----------------------------------------------------------------- |
| AchievementDefinition   | TenantAchievement[], UserAchievement[], UserAchievementProgress[] |
| TenantAchievement       | AchievementDefinition (Cascade), Tenant (Cascade)                 |
| UserAchievementProgress | AchievementDefinition (Cascade), user (Cascade)                   |
| UserAchievement         | AchievementDefinition (Cascade), user (Cascade)                   |

### dWallet (7 models)

| Model             | Relations                                                           |
| ----------------- | ------------------------------------------------------------------- |
| DWallet           | user (Cascade), WalletTransaction[], DataConsent[], PayoutRequest[] |
| WalletTransaction | DWallet (Cascade)                                                   |
| DataConsent       | DWallet (Cascade)                                                   |
| PayoutRequest     | DWallet (Cascade)                                                   |
| DataRevenueStream | none                                                                |
| DataShareBatch    | none                                                                |

### Address Registry (3 models)

| Model           | Relations                                                                                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Address         | Self-ref: Address? (canonical), Address[] (aliases), Handle[], AddressEndpoint[], StandardSeat[], SoloSeat[], PremiumSeat[], Profile[], Property[], ServiceProvider[] |
| Handle          | Address (Cascade)                                                                                                                                                     |
| AddressEndpoint | Address (Cascade)                                                                                                                                                     |

### AI Pool (4 models)

| Model               | Relations      |
| ------------------- | -------------- |
| PlatformAiTierQuota | none           |
| AiCapabilityCost    | none           |
| TenantAiUsage       | AiUsageEvent[] |
| AiUsageEvent        | TenantAiUsage  |

### Infrastructure / Outbox (2 models)

| Model            | Relations                   |
| ---------------- | --------------------------- |
| Outbox           | none (transactional outbox) |
| OutboxDeadLetter | none (dead letter queue)    |

### Dispute Resolution (6 models)

| Model                 | Relations                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------ |
| DisputeCase           | user (4 named), DisputeEvidence[], DisputeEvent[], DisputeMessage[], DisputeNotification[] |
| DisputeEvidence       | DisputeCase (Cascade), user                                                                |
| DisputeEvent          | DisputeCase (Cascade), user?                                                               |
| DisputeMessage        | DisputeCase (Cascade), user, DisputeMessageVersion[]                                       |
| DisputeMessageVersion | DisputeMessage (Cascade)                                                                   |
| DisputeNotification   | DisputeCase (Cascade), user                                                                |

## 3. Models Without Proper Indexes

Models with **zero `@@index` declarations** (5 out of 120):

| Model                 | Notes                                                       |
| --------------------- | ----------------------------------------------------------- |
| user                  | Has `@@unique([email])` but no `@@index` for any query path |
| PlatformModule        | No indexes at all                                           |
| AchievementDefinition | No indexes at all                                           |
| PlatformAiTierQuota   | No indexes at all (queried by tier which is `@unique`)      |
| AiCapabilityCost      | No indexes at all                                           |

> **Correction (2026-07-24):** The original analysis incorrectly listed Tenant as lacking `@@index`. Tenant has `@@index([ownerId])` in `tenant.prisma`. The scan only checked `schema.prisma`, missing the separate tenant file. 5 models remain truly zero-index.

### Previously resolved indexes (from S4-2, S5-7):

| Model          | Old state                   | Resolution                      |
| -------------- | --------------------------- | ------------------------------- |
| Conversation   | No indexes at all           | `@@index([tenantId])` added     |
| Survey         | No indexes at all           | `@@index([tenantId, status])`   |
| ExternalSurvey | No indexes at all           | `@@index([tenantId, isActive])` |
| Event          | Missing chronological index | `@@index([date])` added         |
| Content        | Missing tenant-scoped index | `@@index([tenantId])` added     |

## 4. Tenant FK Coverage (Large Improvement)

**Status: All non-Better-Auth tenant-scoped models now have `@relation` to Tenant.**

After ADVISORY-024 (Batches A-D, 86 models), every tenant-scoped model except Better Auth's internal tables has a proper `@relation(fields: [tenantId], references: [id], onDelete: Restrict)`.

### Remaining models with `tenantId` but no `@relation` (intentional):

| Model            | Reason                                                   |
| ---------------- | -------------------------------------------------------- |
| account          | Better Auth internal — not tenant-scoped                 |
| verification     | Better Auth internal — not tenant-scoped                 |
| passkey          | Better Auth internal — not tenant-scoped                 |
| session          | Better Auth internal — not tenant-scoped                 |
| twoFactor        | Better Auth internal — not tenant-scoped                 |
| user             | Better Auth — cross-tenant identity                      |
| Outbox           | Transactional outbox — deliberate no FK to avoid locking |
| OutboxDeadLetter | Dead letter queue — same reasoning as Outbox             |

### Models without `tenantId` at all (non-tenant-scoped):

AchievementDefinition, AddressEndpoint, AiCapabilityCost, ContentAuditLog, ContentVersion, CompetitionEntry, DisputeMessageVersion, Handle, InternalMaintenanceNote, PlatformAiTierQuota, PlatformModule, RequestHistory, RequestNote, ResourceVersion, SetupMission, SetupSetting, TaxJurisdiction, TaxRate, UserDevice, UserKey

## 5. N+1 Query Risks Based on Relation Patterns

### High Risk

| Pattern                                  | Models involved                                                                                                                                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| user model with ~86 back-links           | Any query on user that eagerly includes all relations will explode. The user model has ~86 relation fields pointing at it. Typical ORMs that eager-load by default will trigger 86+ joins or subqueries. |
| Property → many children                 | Booking[], Household[], MaintenanceRequest[], AgentAccess[], PropertyListing[], ResidentDelegation[], SoloSeat[], StandardSeat[], PropertyPremiumSeat[] — 9 child collections.                           |
| ServiceProvider → many children          | 13 child collections. Any query eager-loading them all will be catastrophic.                                                                                                                             |
| MaintenanceRequest → 3 child collections | histories[], notes[], internalNotes[]                                                                                                                                                                    |
| Conversation → Message[]                 | Classic N+1: fetching a list of conversations then fetching messages per conversation. Mitigated by the `@@index([conversationId, createdAt])` on Message.                                               |

### Medium Risk

| Pattern                                                                               | Detail                                                                                                                  |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Survey → Question[], Response[], Section[]                                            | 3 child collections. Querying a list of surveys with sections, then questions per section is a 3-level N+1 pattern.     |
| DisputeCase → 4 child collections                                                     | Evidence, events, messages, notifications.                                                                              |
| Address → 8 child consumers                                                           | Has handles[], endpoints[], standardSeats[], soloSeats[], premiumSeats[], profiles[], properties[], serviceProviders[]. |
| BillingPlan → TenantSubscription[] → TenantInvoice[], TenantPayment[], BillingEvent[] | Three-level nested N+1.                                                                                                 |
| Competition → CompetitionEntry[]                                                      | Typical listing N+1.                                                                                                    |
| DWallet → WalletTransaction[], DataConsent[], PayoutRequest[]                         | 3 child collections.                                                                                                    |

### Mitigation recommendations:

- All child collections should be fetched with `include` explicitly scoped or loaded separately via TanStack Query on the client side (which appears to be the pattern based on the tech stack).
- The Message model's `@@index([conversationId, createdAt])` mitigates the most common chat N+1.

## 6. Duplication Between Models

| Pair                                       | Overlap                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| user vs Profile                            | Both have avatar, isPublic, showEmail, showPhone. There is conceptual overlap between a system-level user and a household profile/occupant.                                                                                                                                                                               |
| PremiumSeat / SoloSeat / StandardSeat      | Three nearly identical seat models with shared fields: tenantId, userId, platformAddress, organizationId, status, archivedAt, createdAt, updatedAt, addressId, FK to Address. Polymorphism via separate models rather than a single Seat model. ⚠️ **See discussion below** — this is deliberate per `IDENTITY_MODEL.md`. |
| RequestNote / InternalMaintenanceNote      | Both store notes on a MaintenanceRequest with userId, content, createdAt. The only difference is `isInternal` boolean in RequestNote. These could be unified with a single type field.                                                                                                                                    |
| CommunityServiceListing vs PropertyListing | Both are listings with tenantId, status, isPublished, isFeatured, organizationId, createdAt, updatedAt, deletedAt, price fields, description. Could share a base listing interface/table.                                                                                                                                 |
| TenantInvoice vs ProviderInvoice           | Nearly identical structure but domain-correct separation (platform-bills-tenant vs platform-settles-with-provider). ⚠️ **Not true duplication** — see discussion below. Share a Zod schema for `items: Json` instead of consolidating tables.                                                                             |
| TenantPayment vs PaymentTransaction        | Both track payments with tenantId, amount, currency, platformFee, processorFee, netAmount, gateway, externalRef. ⚠️ **Not true duplication** — they represent billing-in vs billing-out. A shared Zod schema for the common shape is the right fix, not table consolidation.                                              |
| Notification vs DisputeNotification        | Both store notifications with userId, read, createdAt.                                                                                                                                                                                                                                                                    |
| user duplicate relation names              | `profile_profile_landlordIdTouser` and `profile_profile_userIdTouser` reference the same Profile model with two different FK roles, forcing verbose auto-generated relation names.                                                                                                                                        |
| Outbox / OutboxDeadLetter                  | Nearly identical structure — the dead letter queue is just an outbox entry that failed.                                                                                                                                                                                                                                   |

### Clarification: Seat duplication is deliberate

Per `IDENTITY_MODEL.md`, a polymorphic `Seat` model with a `SeatType` discriminator was **deliberately rejected**. The reasoning: seat type is inherently known by which table the record lives in — no cross-table discriminator required. The three models represent different domain concepts:

| Seat         | Semantics                                                                 |
| ------------ | ------------------------------------------------------------------------- |
| StandardSeat | Property ownership, required, 1-per-household, tied to a Property         |
| SoloSeat     | Liberation from household constraints, optional upgrade, tied to Profile  |
| PremiumSeat  | Portfolio consolidation across multiple properties, investor pricing tier |

These differences are load-bearing in the product model (PRD persona table, Seat Comparison Matrix, upgrade-path diagrams). The cardinality asymmetry flagged in the analysis (`user.premiumSeat` singular vs `user.soloSeat[]`/`user.standardSeat[]` arrays) is intentional — a user can have multiple Standard/Solo Seats but exactly zero or one Premium Seat.

**Options for seat duplication (evaluated in `SCHEMA_DISCUSS.md`):**

| Option                                  | Approach                                                                                                            | Trade-off                                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| A — Leave as-is                         | Accept the overlap as the cost of type-safety-by-table                                                              | Zero migration risk. Ongoing manual sync when adding shared fields (e.g. `archivedAt`/`status` had to be added 3×) |
| B — Prisma inheritance                  | Ruled out — Prisma has no table inheritance                                                                         | N/A                                                                                                                |
| C — Extract base `Seat` table           | `Seat { shared fields + kind }` + `StandardSeatDetail` / `SoloSeatDetail` / `PremiumSeatDetail` holding only deltas | Real migration rewiring FKs, but ends drift-on-every-shared-field problem permanently                              |
| D — Codegen/lint guard (✅ recommended) | Steiger/ESLint rule fails CI if the 3 models' shared-field set diverges                                             | No migration; addresses _future_ drift without touching settled architecture                                       |

**`SCHEMA_DISCUSS.md` recommendation: D.** The settled architecture decision in `IDENTITY_MODEL.md` should not be re-litigated. A lint guard prevents silent divergence without reopening the consolidated table debate.

**Human note (2026-07-24):** Inclined toward **C** (extract base table) — feels like the more structurally sound fix long-term. Not yet decided; this conversation is captured for future reference.

### Clarification: Invoice/Payment duplication is domain-correct

`TenantInvoice`/`TenantPayment` represent **platform billing the tenant** (subtotal, taxAmount, downloadReady — tax-inclusive SaaS billing). `ProviderInvoice`/`PaymentTransaction` represent **platform settling with marketplace providers** (platformFee, processorFee, netAmount — revenue-split accounting). These are billing-out vs billing-in, not accidental duplication.

The overlap (`invoiceNumber`, `items`, `total`, `currency`, `status`, `paidAt`, `pdfUrl`) is exactly what you'd expect from two invoice-shaped tables in different subdomains. **Actionable fix:** extract a shared Zod schema/validator for the `items: Json` field so they can't independently drift in shape, but do not consolidate tables.

### Shared patterns that could be abstracted:

- `tenantId` + `createdAt` + `updatedAt` + `deletedAt` appears on ~50 models
- `platformAddress` appears on PremiumSeat, SoloSeat, StandardSeat, and Property
- `organizationId` appears on ~15 models

## 7. Soft-Delete Patterns (`deletedAt` fields)

**Policy:** See `docs/STEERING/SOFT_DELETE.md`.

Models with `deletedAt` (~66 of 120):

AchievementDefinition, AgentAccess, AgentProfile, Album, Announcement, Booking, Bursary, BursaryField, CommunityMerit, CommunityServiceInquiry, CommunityServiceListing, CommunityServiceReview, Competition, CompetitionEntry, Content, ContentLike, Conversation, ConversationParticipant, DisputeCase, DisputeEvent, DisputeEvidence, DisputeMessage, DisputeMessageVersion, DisputeNotification, Event, EventAttendee, ExternalSurvey, Group, GroupMember, GroupMembershipRequest, Household, InternalMaintenanceNote, Invitation, MaintenanceCategory, MaintenanceRequest, MaintenanceTeam, Member, Message, Notification, PaymentTransaction, PlatformSuspension, Profile, Property, PropertyListing, ProviderCharge, ProviderInvoice, ProviderLegalAgreement, ProviderMerit, ProviderReputation, ProviderSubscription, ProviderVerification, Question, RequestNote, Resource, ResourceVersion, Response, RevenueRecord, ServiceBooking, ServiceProvider, Setting, Survey, SurveySection, TenantPayment, TenantSetup

Models without `deletedAt`:

account, verification, passkey, session, twoFactor, user, Organization, PlatformModule, TenantModule, Tenant, PropertyPremiumSeat (junction), ConversationParticipant (actually has it — listed above), EventAttendee (has it — listed above), MaintenanceTeamMember, RequestHistory, Outbox, OutboxDeadLetter, SubscriptionTier, BillingPlan, TenantSubscription, TenantInvoice, BillingAdjustment, BillingEvent, Coupon, CouponRedemption, TaxRate, TaxJurisdiction, TenantAchievement, UserAchievementProgress, UserAchievement, DWallet, WalletTransaction, DataConsent, PayoutRequest, DataRevenueStream, DataShareBatch, Address, Handle, AddressEndpoint, PlatformAiTierQuota, AiCapabilityCost, TenantAiUsage, AiUsageEvent, ContentVersion, ContentAuditLog, MediaUpload, AgentToken, DelegationAction, ResidentDelegation, MeetingProxy, Support, PremiumSeat, SoloSeat, StandardSeat, SetupMission, SetupSetting, TenantFeatureFlag, DisputeEvent, DisputeMessageVersion, DisputeNotification

### Inconsistencies in soft-delete:

- Inconsistent application: Some parent models have `deletedAt` but their children don't. Example: MaintenanceRequest has `deletedAt` but RequestHistory does not (though RequestNote and InternalMaintenanceNote do).
- Property has `deletedAt` but StandardSeat (which FK references Property with Cascade) does not. StandardSeat has `status: ARCHIVED` which is a semantic soft-delete via status enum.
- No `deletedAt` on user — the central user model cannot be soft-deleted. This is a deliberate choice (users are suspension-managed via banned, banReason, banExpires, PlatformSuspension).
- New models Bursary/BursaryField, ContentVersion, MediaUpload do not have `deletedAt`.

## 8. Denormalized Data That Could Cause Inconsistency

| Model                   | Field(s)                                                                                                     | Risk                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| AgentProfile            | totalListings, activeListings, salesCompleted, avgSalePrice, rating, reviewCount                             | Computed aggregates. If they drift from source-of-truth, display is wrong.            |
| CommunityServiceListing | rating, reviewCount                                                                                          | Cached aggregates — must be recomputed on review add/modify/delete.                   |
| PropertyListing         | isPublished, isFeatured                                                                                      | Denormalized from status. Overlap between status enum and booleans.                   |
| TenantSubscription      | status, tierManualOverride                                                                                   | Overlaps with TenantSubscriptionStatus enum; tierManualOverride duplicates plan.tier. |
| Competition             | entryCount                                                                                                   | Should equal COUNT(CompetitionEntry WHERE competitionId = X).                         |
| Tenant                  | pageCount                                                                                                    | Should equal COUNT(page) — may exist in external CMS.                                 |
| Coupon                  | currentRedemptions                                                                                           | Should equal COUNT(CouponRedemption).                                                 |
| DWallet                 | balance, lifetimeEarned, lifetimePaid                                                                        | Should equal SUM(WalletTransaction.amount). Drift risk on system failure.             |
| WalletTransaction       | balanceBefore, balanceAfter                                                                                  | Snapshot at transaction time. Inconsistent if replayed out of order.                  |
| UserAchievementProgress | count                                                                                                        | Should be derived from event stream.                                                  |
| Content                 | viewCount                                                                                                    | Incremented by analytics — prone to drift vs. actual page views.                      |
| Resource                | downloadCount                                                                                                | Similar to viewCount.                                                                 |
| ProviderReputation      | totalScore, responseTimeScore, qualityScore, reviewScore, complianceScore, engagementScore, lastCalculatedAt | Composite scores — expensive to recalculate, prone to staleness.                      |
| MaintenanceRequest      | ticketNumber (String)                                                                                        | Manually generated ticket number; no uniqueness constraint. Could collide.            |

### Remediation approach (per `SCHEMA_DISCUSS.md`)

The `Outbox`/`OutboxDeadLetter` models already exist for durable domain-event side effects. None of the ~13 denormalized fields currently route through it. The recommended split-by-consequence approach:

| Option                                                        | Approach                                                                                                          | Fits which fields                                                                                                                                              |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — Status quo                                                | Direct increment/decrement at write time, no reconciliation                                                       | Current state — accumulating drift risk                                                                                                                        |
| B — Outbox-driven recompute ✅ (recommended for money/limits) | Every write emits an Outbox event; dispatcher recomputes aggregate from source-of-truth (idempotent, replay-safe) | DWallet.balance/lifetimeEarned/lifetimePaid, Competition.entryCount, Coupon.currentRedemptions, CommunityServiceListing.rating/reviewCount                     |
| C — Scheduled cron reconciliation                             | Periodic cron recomputes and corrects drift, logs discrepancies                                                   | Content.viewCount, Resource.downloadCount, ProviderReputation composite scores, AgentProfile aggregates — analytics-adjacent, tolerant of eventual consistency |
| D — On-the-fly `SELECT COUNT`/`SUM`                           | Drop denormalized field, compute at read time                                                                     | Tenant.pageCount — cheap query, low read frequency, no reason to denormalize                                                                                   |

**🚩 Urgent:** `DWallet.balance` drifting from `WalletTransaction` sum is real money (POPIA/audit-log standing requirement applies 5-year retention). Worth its own gate before the others.

_Note: The existing analysis draft recommended a generic "periodic reconciliation" approach. The above refinement from `SCHEMA_DISCUSS.md` splits by consequence and leverages the Outbox infrastructure you already have._

## 9. Cascade Delete Rules (or Lack Thereof)

Summary of onDelete usage:

- **Cascade:** Used on ~80 relations (mostly child records FK'd to parent)
- **SetNull:** Used on ContentVersion.userId, ContentAuditLog.userId (user deletion anonymizes audit trails) and Question.sectionId → SurveySection
- **Restrict (default):** Most tenant-scoped `@relation` declarations use `onDelete: Restrict` per ADVISORY-024
- **No action / Restrict (default):** All other FKs (Better Auth models, some legacy relations)

| Parent                                 | Child                                | Behavior                                             |
| -------------------------------------- | ------------------------------------ | ---------------------------------------------------- |
| Tenant                                 | All tenant-scoped models             | Restrict (cannot delete tenant while children exist) |
| user                                   | account, session, passkey, twoFactor | Cascade (deleting user cleans up auth)               |
| user                                   | Message (sender)                     | No onDelete — dangling senderId risk                 |
| user                                   | RequestNote, RequestHistory          | No onDelete — orphaned authorship                    |
| ServiceProvider → ProviderSubscription | subscriptionId FK                    | Restrict                                             |
| PaymentTransaction → RevenueRecord     | transactionId FK                     | No onDelete — orphans on transaction delete          |
| Outbox                                 | none (no FK to any parent)           | Standalone table — never cascade-deleted             |

**Key concern:** Tenant deletion is now blocked by `Restrict` on all ~86 tenant-scoped `@relation` declarations. This means tenant cleanup must be a deliberate, multi-step process (remove all children first, then the tenant row). This is safer than the previous state (no FK at all, string-based tenantId), but adds complexity to tenant decommissioning workflows.

## 10. Drizzle Configuration

File: `/home/ubuntupunk/Projects/soralia-village/drizzle.config.ts`

```ts
import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/*.ts',
  out: './drizzle',
  dbCredentials: {
    url: (process.env.DATABASE_URL || '...').replace('sslmode=require', 'sslmode=no-verify'),
  },
  verbose: true,
  strict: true,
});
```

### Findings:

1. **Schema source**: `./src/db/schema/*.ts` — this path exists (was previously misconfigured as `./prisma/drizzle/schema.ts` which did not exist). ✅ **RESOLVED per ADVISORY-024.**
2. **Output directory**: `./drizzle` — exists with `meta/_journal.json` containing zero entries. No migration SQL files exist. Drizzle Kit migration pipeline is configured but unused.
3. **SSL configuration**: `DATABASE_URL` has `sslmode=require` replaced with `no-verify`. Dev-only concern. Production should validate certificates.
4. **Strict mode**: Enabled — Drizzle Kit will error on schema drift.

### Drizzle Journal

File: `/home/ubuntupunk/Projects/soralia-village/drizzle/meta/_journal.json`

```json
{ "version": "7", "dialect": "postgresql", "entries": [] }
```

**Implication**: The database schema is managed entirely through Prisma Migrate. Drizzle types (`src/db/schema/*.ts`) are generated from the Prisma schema and used in application queries, but Drizzle Kit's own migration pipeline is not active.

## 11. Consolidated Summary of Critical Findings

| Severity | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 HIGH   | ~~drizzle.config.ts pointed to non-existent `./prisma/drizzle/schema.ts`~~ → ✅ RESOLVED: Config now points to `./src/db/schema/*.ts` (ADVISORY-024)                                                                                                                                                                                                                                                                                               |
| 2 HIGH   | ~~UserAchievementProgress.definitionId / UserAchievement.definitionId had no `@relation`~~ → FALSE POSITIVE (relations always existed)                                                                                                                                                                                                                                                                                                             |
| 3 HIGH   | ~~DelegationAction.actorId no FK relation~~ → ✅ RESOLVED per S4-1                                                                                                                                                                                                                                                                                                                                                                                 |
| 4 MEDIUM | ~~6 models with zero indexes (Conversation, Survey, ExternalSurvey, Organization, AiCapabilityCost, PlatformAiTierQuota)~~ → 3 resolved (Conversation, Survey, ExternalSurvey). **5 models currently zero-index:** Organization, AchievementDefinition, AiCapabilityCost, PlatformAiTierQuota, PlatformModule. Tenant was incorrectly included in earlier versions — it has `@@index([ownerId])` in `tenant.prisma`. user has `@@unique([email])`. |
| 5 MEDIUM | ~~~20 tenant-scoped models had tenantId String with no FK~~ → ✅ FULLY RESOLVED per ADVISORY-024. All ~86 tenant-scoped models have `@relation(fields: [tenantId], references: [id], onDelete: Restrict)`.                                                                                                                                                                                                                                         |
| 6 MEDIUM | 3 seat models (PremiumSeat, SoloSeat, StandardSeat) share ~10 fields — polymorphism via separate tables adds maintenance burden.                                                                                                                                                                                                                                                                                                                   |
| 7 MEDIUM | TenantInvoice / ProviderInvoice near-duplicates. TenantPayment / PaymentTransaction near-duplicates.                                                                                                                                                                                                                                                                                                                                               |
| 8 MEDIUM | ~13 models have computed/denormalized fields that could drift from source-of-truth.                                                                                                                                                                                                                                                                                                                                                                |
| 9 LOW    | user model has ~86 relation back-links. Mitigated by never using `include:` on Tenant queries.                                                                                                                                                                                                                                                                                                                                                     |
| 10 LOW   | ~~Soft-delete applied inconsistently~~ → ✅ PARTIALLY RESOLVED: Policy defined in `docs/STEERING/SOFT_DELETE.md`. ~66 of 120 models have `deletedAt`. Some new models (ContentVersion, Bursary/BursaryField, MediaUpload) lack it.                                                                                                                                                                                                                 |

## 12. Reconciliation: Post-Audit Changes

### Resolved since original analysis

| Ref          | Issue                                                 | Fix                                                                                                       |
| ------------ | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| S4-1         | `DelegationAction.actorId` no FK relation             | Added `@relation` + back-link                                                                             |
| S4-2         | Missing indexes: Conversation, Survey, ExternalSurvey | Added `@@index` declarations                                                                              |
| S4-3         | Missing `SurveySection` back-link on Survey           | Added `sections SurveySection[]` relation                                                                 |
| S5-7         | Missing indexes: Content, Event                       | Added `@@index` declarations                                                                              |
| ADVISORY-024 | ~86 tenant-scoped models with orphan `tenantId`       | All non-Better-Auth models now have `@relation(fields: [tenantId], references: [id], onDelete: Restrict)` |
| 2pxb / owuh  | Soft-delete policy + parent-child orphans             | Policy in `SOFT_DELETE.md`; 15 orphans received `deletedAt`                                               |

### New in current schema (not in original analysis)

| Change                                   | Detail                                                                                                                                                                                               |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prismaSchemaFolder`                     | Split into `schema.prisma` (120 models) + `tenant.prisma` (Tenant model)                                                                                                                             |
| Schema grew to 3308 lines                | +353 lines from original 2955                                                                                                                                                                        |
| 12 new models                            | Bursary, BursaryField, ContentVersion, ContentAuditLog, MaintenanceTeamMember, MediaUpload, MeetingProxy, Outbox, OutboxDeadLetter, Support, TenantFeatureFlag, TenantSetup                          |
| 8 new enums                              | Now 84 total (was 76)                                                                                                                                                                                |
| All tenant FKs resolved                  | Zero orphan `tenantId` fields outside Better Auth                                                                                                                                                    |
| 5 models without `@@index`               | Down from 19. PlatformModule, AchievementDefinition, PlatformAiTierQuota, AiCapabilityCost, Organization. Tenant was in earlier versions but has `@@index([ownerId])`. user has `@@unique([email])`. |
| Approximately 66 models with `deletedAt` | Up from 62. New models Bursary/BursaryField have it; ContentVersion, MediaUpload don't.                                                                                                              |

### Remaining open items

- Model duplication [soralia-village-sioz] — see §6 for clarification: seat duplication is deliberate per `IDENTITY_MODEL.md`; invoice/payment duplication is domain-correct.
- Denormalized aggregates drift risk [soralia-village-g8c3] — see §8 for split-by-consequence approach. DWallet.balance flagged as urgent (real money, POPIA).
- notDeleted() adoption [soralia-village-h9o4]

### Discussion record: `SCHEMA_DISCUSS.md` (2026-07-24)

The document `SCHEMA_DISCUSS.md` contains a peer-review conversation that refined several findings in this analysis:

| Topic                          | Previous framing                   | Clarification                                                                                                                    |
| ------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Seat model duplication §6      | "Polymorphism via separate models" | Deliberate design per `IDENTITY_MODEL.md`. Option D (codegen/lint guard) recommended; Option C (base table) under consideration. |
| Invoice/payment duplication §6 | "Near-duplicate" / "same concept"  | Domain-correct separation (billing-out vs billing-in). Share a Zod schema for `items: Json`; do not consolidate tables.          |
| Denormalized aggregates §8     | Generic "periodic reconciliation"  | Split by consequence: Outbox-driven recompute for money/limits, cron for display counters, remove `Tenant.pageCount`.            |

**Human note (2026-07-24):** Inclined toward Option C for seat models (extract base `Seat` table). Not yet decided on direction or final recommendation. This conversation is captured here for future reference when these items are revisited.
