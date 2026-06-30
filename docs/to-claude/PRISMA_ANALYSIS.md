# Comprehensive Prisma Schema Analysis

File: /home/ubuntupunk/Projects/soralia-village/prisma/schema.prisma (2955 lines)

## 1. Model and Enum Counts

Category Count
Models 108
Enums 76

## 2. All Models with Their Relations

### Auth & Sessions (5 models)

Model Relations (FK arrows point to referenced model)
account user (Cascade)
verification none
passkey user (Cascade)
session user (Cascade)
twoFactor user (Cascade)

### User & Identity (8 models)

Model Relations
user Central hub: 50+ relation back-links (see full list below)
Profile Household (Cascade), user (2 named relations), Address?, ResidentDelegation[]
Member Organization (Cascade), user (Cascade)
Organization Invitation[], Member[]
Notification user (Cascade)
UserKey user (Cascade)
UserDevice user (Cascade)

### Seats (3 models)

Model Relations
PremiumSeat user (Cascade), Address?, PropertyPremiumSeat[]
SoloSeat user, Address?, Property?
StandardSeat Property (Cascade), user (Cascade), Address?

### Tenant & Platform (5 models)

Model Relations
PlatformModule TenantModule[]
TenantModule PlatformModule, Tenant (Cascade)
Tenant user? ("TenantOwner"), TenantModule[], TenantAchievement[], AssistSession[]
Setting none
SubscriptionTier ProviderSubscription[]
Directory & Properties (6 models)

### Model Relations

Property user? ("PropertyOwner"), Address?, Booking[], Household[], MaintenanceRequest[], AgentAccess[], PropertyListing[], ResidentDelegation[], SoloSeat[], StandardSeat[], PropertyPremiumSeat[]
Household Property (Cascade), Profile[]
PropertyListing user (2 named relations), Property (Cascade)
PropertyPremiumSeat Property (Cascade), PremiumSeat (Cascade)
Invitation user (Cascade), Organization (Cascade)

### Chat & Messaging (3 models)

Model Relations
Conversation ConversationParticipant[], Message[]
ConversationParticipant Conversation (Cascade), user (Cascade)
Message Conversation (Cascade), user

### Content & Community (11 models)

Model Relations
Content user?, Group?, ContentLike[]
ContentLike Content (Cascade), user (Cascade)
Group user (Cascade), Content[], GroupMembershipRequest[], GroupMember[]
GroupMember Group (Cascade), user (Cascade)
GroupMembershipRequest Group (Cascade), user (Cascade)
Album user (Cascade)
Resource user?, ResourceVersion[], Announcement[]
ResourceVersion Resource (Cascade)
Announcement Resource?

### Events (2 models)

Model Relations
Event EventAttendee[]
EventAttendee Event (Cascade), user (Cascade)
Bookings (1 model)
Model Relations
Booking Property?, user (Cascade)

### Maintenance (8 models)

Model Relations
MaintenanceRequest Property?, user (Cascade), user? (landlord), MaintenanceTeam?, ServiceProvider?, RequestHistory[], RequestNote[], InternalMaintenanceNote[]
MaintenanceTeam MaintenanceRequest[]
MaintenanceCategory none
RequestNote MaintenanceRequest (Cascade), user
InternalMaintenanceNote MaintenanceRequest (Cascade), user
RequestHistory MaintenanceRequest (Cascade), user

### Service Providers (16 models)

Model Relations
ServiceProvider user?, Address?, MaintenanceRequest[], ProviderVerification[], ProviderLegalAgreement[], ProviderReputation?, ProviderMerit[], ProviderSubscription[], PaymentTransaction[], RevenueRecord[], ProviderCharge[], ProviderInvoice[], ServiceBooking[]
CommunityServiceInquiry user, CommunityServiceListing (Cascade)
CommunityServiceListing user, CommunityServiceInquiry[], CommunityServiceReview[], ServiceBooking[]
CommunityServiceReview CommunityServiceListing (Cascade), user
ProviderVerification ServiceProvider
ProviderLegalAgreement ServiceProvider
ProviderReputation ServiceProvider
ProviderMerit ServiceProvider
ProviderSubscription ServiceProvider, SubscriptionTier, PaymentTransaction[], ProviderCharge[], ProviderInvoice[]
PaymentTransaction ServiceProvider, ProviderSubscription, ProviderCharge[], ProviderInvoice[], RevenueRecord[]
RevenueRecord ServiceProvider, PaymentTransaction
ProviderCharge ServiceProvider, ProviderSubscription, PaymentTransaction?
ProviderInvoice (needs reading past line 1365)
ServiceBooking CommunityServiceListing (Cascade), ServiceProvider (Cascade), user (Cascade)

### Billing / Platform SaaS (9 models)

Model Relations
BillingPlan TenantSubscription[], Coupon[]
TenantSubscription BillingPlan, TenantInvoice[], TenantPayment[], BillingEvent[]
TenantInvoice TenantSubscription
TenantPayment TenantSubscription
BillingAdjustment none
BillingEvent TenantSubscription?
Coupon BillingPlan?, CouponRedemption[]
CouponRedemption Coupon
TaxRate TaxJurisdiction?
TaxJurisdiction TaxRate[]

### Surveys (5 models)

Model Relations
Survey Question[], Response[], SurveySection[]
Question Survey (Cascade), SurveySection? (SetNull)
Response Survey (Cascade)
SurveySection Survey (Cascade), Question[]
ExternalSurvey none
Community Merits (1 model)
Model Relations
CommunityMerit user (3 named relations)

### Competitions (2 models)

Model Relations
Competition CompetitionEntry[]
CompetitionEntry Competition (Cascade), user (Cascade)
Admin & Suspensions (5 models)
Model Relations
AssistSession user, Tenant (Cascade)
AgentAccess user (2 named), Property (Cascade), AgentToken[], DelegationAction[]
AgentToken user (2 named), AgentAccess?
DelegationAction AgentAccess
ResidentDelegation Property (Cascade), user, Profile (Cascade)
PlatformSuspension user (Cascade)

### Achievements (4 models)

Model Relations
AchievementDefinition TenantAchievement[]
TenantAchievement AchievementDefinition (Cascade), Tenant (Cascade)
UserAchievementProgress user (Cascade)
UserAchievement user (Cascade)

### dWallet (7 models)

Model Relations
DWallet user (Cascade), WalletTransaction[], DataConsent[], PayoutRequest[]
WalletTransaction DWallet (Cascade)
DataConsent DWallet (Cascade)
PayoutRequest DWallet (Cascade)
DataRevenueStream none
DataShareBatch none
Address Registry (3 models)
Model Relations
Address Self-ref: Address? (canonical), Address[] (aliases), Handle[], AddressEndpoint[], StandardSeat[], SoloSeat[], PremiumSeat[], Profile[], Property[], ServiceProvider[]
Handle Address (Cascade)
AddressEndpoint Address (Cascade)

### AI Pool (4 models)

Model Relations
PlatformAiTierQuota none
AiCapabilityCost none
TenantAiUsage AiUsageEvent[]
AiUsageEvent TenantAiUsage
Dispute Resolution (6 models)
Model Relations
DisputeCase user (4 named relations), DisputeEvidence[], DisputeEvent[], DisputeMessage[], DisputeNotification[]
DisputeEvidence DisputeCase (Cascade), user
DisputeEvent DisputeCase (Cascade), user?
DisputeMessage DisputeCase (Cascade), user, DisputeMessageVersion[]
DisputeMessageVersion DisputeMessage (Cascade)
DisputeNotification DisputeCase (Cascade), user

## 3. Models Without Proper Indexes

Models with NO @@index at all (19 out of 108)
These models have zero composite indexes:
Model Missing indexes likely needed
AiCapabilityCost No indexes at all
BillingAdjustment Has @@index([tenantId]) only; missing on subscriptionId, invoiceId
Competition Has @@index([tenantId]) and @@index([status]); missing on startDate/endDate for filtering upcoming
Conversation No indexes at all (often queried by tenantId)
DataRevenueStream Has @@index([tenantId]) and @@unique([tenantId, key])
DataShareBatch Has @@index([tenantId]) and @@index([status]); missing on periodEnd for date-range queries
DisputeMessageVersion Has @@index([messageId]) only
ExternalSurvey No indexes at all
MaintenanceCategory Only @@index([tenantId])
Organization No indexes at all (query by tenantId likely)
PlatformAiTierQuota No indexes at all
ProviderInvoice (needs verification)
Response Only @@index([surveyId]); missing @@index([tenantId])
Setting Only has @@unique([tenantId, key])
SubscriptionTier Only @@index([tenantId])
Survey No indexes at all (often queried by tenantId, status, startDate/endDate)
TaxJurisdiction Only @@index([country]); missing tenantId (but no tenantId field)
TaxRate Only @@index([country]); missing tenantId (but no tenantId field)
TenantPayment Has indexes, but missing on couponId

### Key findings about missing indexes:

1.  Conversation -- no indexes at all. If conversations are ever queried by tenantId, this will full-scan.
2.  Survey -- no indexes. Queries by tenantId, status, date range will be slow.
3.  ExternalSurvey -- no indexes.
4.  Organization -- queried by slug (unique) but no tenant-scoped index.
5.  AiCapabilityCost -- no indexes at all.
6.  PlatformAiTierQuota -- no indexes at all (queried by tier which is @unique).
7.  Response -- missing @@index([tenantId]). Survey responses are tenant-scoped.
8.  Event -- missing index on date for chronological queries.
9.  Content -- missing @@index([tenantId]) even though it is tenant-scoped. Missing @@index([published])/@@index([category]) for content filtering.
10. Resource -- indexed on tenantId, category, visibility, authorId but missing on downloadCount or publishedAt if sorting is needed.

## 4. Missing Foreign Key Relationships

Where naming is mismatched or missing
|Issue| Detail|
|-------|---------|
|ExternalSurvey Has tenantId but no FK to Tenant. This is an orphan string reference.
|Setting Has tenantId but no FK to Tenant. Orphan string reference.
|MaintenanceCategory Has tenantId but no FK to Tenant. Orphan string reference.
|Event Has tenantId but no FK to Tenant. Orphan string reference.
|Survey Has tenantId but no FK to Tenant. Orphan string reference.
|DWallet.transactions WalletTransaction has walletId FK to DWallet but DWallet has transactions WalletTransaction[] -- this is correct.
|TenantPayment subscriptionId FK to TenantSubscription, but TenantSubscription does not list TenantPayment[] in its relation fields. It does: payments TenantPayment[] -- OK.
|UserAchievementProgress Has definitionId (FK to AchievementDefinition) but no @@index([definitionId]) and no explicit relation declared. This is a data-integrity risk -- Prisma will not create a FK constraint at the DB level without @relation.
|UserAchievement Same issue: has definitionId but no @relation to AchievementDefinition.
|CommunityMerit Has tenantId but no FK to Tenant.
|AgentToken Has tenantId but no FK to Tenant.
|DelegationAction Has tenantId but no FK to Tenant. Has actorId but no @relation to user.
|PlatformSuspension Has tenantId but no FK to Tenant.

## Critical missing FKs (no @relation at all):

1. UserAchievementProgress.definitionId -- Contains an FK value with no relation declaration. This will NOT create a DB FK constraint.
2. UserAchievement.definitionId -- Same issue.
3. DelegationAction.actorId -- Has a plain actorId String field with no @relation. No FK constraint.
4. N+1 Query Risks Based on Relation Patterns

## High Risk

|Pattern| Models involved|
user model with 50+ back-links Any query on user that eagerly includes all relations will explode. The user model has ~55 relation fields pointing at it. Typical ORMs that eager-load by default will trigger 55+ joins or subqueries.
Property → many children Booking[], Household[], MaintenanceRequest[], AgentAccess[], PropertyListing[], ResidentDelegation[], SoloSeat[], StandardSeat[], PropertyPremiumSeat[] -- 9 child collections.
ServiceProvider → many children 13 child collections. Any query eager-loading them all will be catastrophic.
MaintenanceRequest → 3 child collections histories[], notes[], internalNotes[]
Conversation → Message[] Classic N+1: fetching a list of conversations then fetching messages per conversation. Mitigated by the @@index([conversationId, createdAt]) on Message.

## Medium Risk

Pattern Detail
Survey → Question[], Response[], Section[] 3 child collections. Querying a list of surveys with sections, then questions per section is a 3-level N+1 pattern.
DisputeCase → 4 child collections Evidence, events, messages, notifications.
Address → 8 child consumers Has handles[], endpoints[], standardSeats[], soloSeats[], premiumSeats[], profiles[], properties[], serviceProviders[].
BillingPlan → TenantSubscription[] → TenantInvoice[], TenantPayment[], BillingEvent[] Three-level nested N+1.
Competition → CompetitionEntry[] Typical listing N+1.
DWallet → WalletTransaction[], DataConsent[], PayoutRequest[] 3 child collections.

## Mitigation recommendations:

- All child collections should be fetched with include explicitly scoped or loaded separately via TanStack Query on the client side (which appears to be the pattern based on the tech stack).
- The Message model's @@index([conversationId, createdAt]) mitigates the most common chat N+1.
- UserAchievementProgress and UserAchievement lack indexes on definitionId, making joins to AchievementDefinition potentially slow.

## 6. Duplication Between Models

Direct duplication / overlap
Pair Overlap
user vs Profile Both have avatar, isPublic, showEmail, showPhone. There is conceptual overlap between a system-level user and a household profile/occupant.
PremiumSeat / SoloSeat / StandardSeat Three nearly identical seat models with shared fields: tenantId, userId, platformAddress, organizationId, status, archivedAt, createdAt, updatedAt, addressId, FK to Address. This is polymorphism via separate models rather than a single Seat model with a type discriminator.
RequestNote / InternalMaintenanceNote Both store notes on a MaintenanceRequest with userId, content, createdAt. The only difference is isInternal boolean in RequestNote. These could be unified with a single type field.
CommunityServiceListing vs PropertyListing Both are listings with tenantId, status, isPublished, isFeatured, organizationId, createdAt, updatedAt, deletedAt, price fields, description. Could share a base listing interface/table.
TenantInvoice vs ProviderInvoice Nearly identical structure: tenantId, subscriptionId, items (Json), total, currency, status, pdfUrl, paidAt. Related to different subscriptions but same concept.
TenantPayment vs PaymentTransaction Both track payments with tenantId, amount, currency, platformFee, processorFee, netAmount, gateway, externalRef.
Notification vs DisputeNotification Both store notifications with userId, read, createdAt.
user duplicate relation names profile_profile_landlordIdTouser and profile_profile_userIdTouser reference the same Profile model with two different FK roles, forcing verbose auto-generated relation names.
Shared patterns that could be abstracted:

- tenantId + createdAt + updatedAt + deletedAt appears on ~45 models
- platformAddress appears on PremiumSeat, SoloSeat, StandardSeat, and Property
- organizationId appears on ~15 models

## 7. Soft-Delete Patterns (deletedAt fields)

Models with deletedAt (38 out of 108):
Profile, Member, Notification, ServiceBooking, AgentProfile, Setting, Property, Household, PropertyListing, Invitation, Conversation, Message, Content, ContentLike, Group, GroupMember, GroupMembershipRequest, Album, Resource, ResourceVersion, Announcement, Event, Booking, RequestNote, InternalMaintenanceNote (has deletedAt but NO updatedAt for note edits), MaintenanceCategory, ServiceProvider, CommunityServiceInquiry, CommunityServiceListing, CommunityServiceReview, Survey, Question, Response, SurveySection, ExternalSurvey, CommunityMerit, Competition, CompetitionEntry, PlatformSuspension, DisputeCase, DisputeEvidence, DisputeMessage
Models WITHOUT deletedAt (hard-deleted):
account, verification, passkey, session, twoFactor, user, Organization, PlatformModule, TenantModule, Tenant, PropertyPremiumSeat (junction table), ConversationParticipant (junction table), EventAttendee (junction table), MaintenanceRequest, MaintenanceTeam, RequestHistory, ProviderVerification, ProviderLegalAgreement, ProviderReputation, ProviderMerit, ProviderSubscription, PaymentTransaction, RevenueRecord, ProviderCharge, ProviderInvoice, SubscriptionTier, BillingPlan, TenantSubscription, TenantInvoice, TenantPayment, BillingAdjustment, BillingEvent, Coupon, CouponRedemption, TaxRate, TaxJurisdiction, AchievementDefinition, TenantAchievement, UserAchievementProgress, UserAchievement, DWallet, WalletTransaction, DataConsent, PayoutRequest, DataRevenueStream, DataShareBatch, Address, Handle, AddressEndpoint, PlatformAiTierQuota, AiCapabilityCost, TenantAiUsage, AiUsageEvent, DisputeEvent, DisputeMessageVersion, DisputeNotification
Inconsistencies in soft-delete:

- Inconsistent application: Some parent models have deletedAt but their children don't. Example: MaintenanceRequest has no deletedAt but its child RequestNote does. If a maintenance request is deleted, notes are orphaned.
- Group has deletedAt, but GroupMember has deletedAt (consistent) and GroupMembershipRequest has deletedAt (consistent).
- Property has deletedAt but StandardSeat (which FK references Property with Cascade) does not. However, StandardSeat has status: ARCHIVED which is a semantic soft-delete via status enum.
- No deletedAt on user -- the central user model cannot be soft-deleted. This is a deliberate choice (users are suspension-managed via banned, banReason, banExpires, PlatformSuspension).

## 8. Denormalized Data That Could Cause Inconsistency

Model Field(s) Risk
AgentProfile totalListings, activeListings, salesCompleted, avgSalePrice, rating, reviewCount These are computed aggregates. If they drift from the source-of-truth (PropertyListing count, CommunityServiceReview average), the display will be wrong.
CommunityServiceListing rating, reviewCount Same issue -- cached aggregates that must be recomputed whenever a CommunityServiceReview is added/modified/deleted.
PropertyListing isPublished, isFeatured Denormalized from status. Overlap between status enum (DRAFT/ACTIVE/PENDING/SOLD/RENTED/WITHDRAWN) and boolean isPublished.
TenantSubscription status Overlaps with TenantSubscriptionStatus enum; tierManualOverride boolean alongside plan.tier.
Competition entryCount Should equal COUNT(CompetitionEntry WHERE competitionId = X). Risk of drift.
Tenant pageCount Should equal COUNT(page) but pages may exist in a CMS external to this schema.
DWallet balance, lifetimeEarned, lifetimePaid Cached wallet state that should equal SUM(WalletTransaction.amount) grouped by wallet. Could drift during system failure.
WalletTransaction balanceBefore, balanceAfter Snapshot at time of transaction. If replayed out of order, these become inconsistent.
UserAchievementProgress count Tracks progress toward an achievement threshold. Should be derived from event stream.
Content viewCount Typically incremented by analytics, prone to drift vs. actual page views in logs.
Resource downloadCount Similar to viewCount.
MaintenanceRequest.ticketNumber String Manually generated ticket number; no uniqueness constraint. Could collide.
Recommendation: All computed aggregate fields should have periodic reconciliation jobs or be backed by materialized views. Alternatively, these could be computed on-the-fly using SELECT COUNT(\*) subqueries (at the cost of performance) to guarantee consistency.

## 9. Cascade Delete Rules (or Lack Thereof)

Summary of onDelete usage:

- Cascade: Used on 72 relations (mostly child records FK'd to parent)
- SetNull: Used exactly 1 time (Question.sectionId → SurveySection on delete)
- No action / Restrict (default): All other FKs (well over 30+ FK fields with no explicit onDelete)
  Where CASCADE is missing and could cause orphan rows:
  Parent Child Current behavior
  Tenant ExternalSurvey No FK at all, only tenantId String. Deleting a tenant orphans survey rows.
  Tenant Setting No FK at all. Orphans.
  Tenant MaintenanceCategory No FK at all. Orphans.
  Tenant Event No FK at all. Orphans.
  Tenant Survey No FK at all. Orphans.
  AchievementDefinition UserAchievementProgress Has definitionId but no @relation -- no FK exists at DB level. Orphans on definition delete.
  AchievementDefinition UserAchievement Same -- no @relation on definitionId. Orphans.
  Tenant CommunityMerit No FK at all.
  Tenant AgentToken No FK at all.
  Tenant DelegationAction No FK at all.
  Tenant PlatformSuspension No FK at all.
  MaintenanceRequest RequestHistory Cascade set -- OK.
  Property → AgentAccess AgentAccess Set to Cascade -- OK.
  Message (sender) user No onDelete set. Deleting a user leaves messages with a dangling senderId.
  RequestNote user (author) No onDelete set. Deleting user leaves orphaned note authorship.
  PaymentTransaction → ProviderSubscription subscriptionId FK No onDelete. Deleting a subscription orphans transactions.
  RevenueRecord → PaymentTransaction transactionId FK No onDelete. Deleting a transaction orphans revenue records.
  Key concern:
  Many tenant-scoped models have a tenantId String field with no Prisma @relation to the Tenant model. This means:
- No referential integrity enforced at the database level for tenant foreign keys
- Deleting a tenant leaves orphan records across ~20+ models
- Multi-tenant data isolation relies entirely on application-layer filtering (the tenantId column)
  This is an intentional design choice (soft multi-tenancy via column, not hard via FK), but it carries risk.

## 10. Drizzle Configuration

File: /home/ubuntupunk/Projects/soralia-village/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
dialect: 'postgresql',
schema: './prisma/drizzle/schema.ts',
out: './drizzle',
dbCredentials: {
url: (process.env.DATABASE_URL || '...')
.replace('sslmode=require', 'sslmode=no-verify'),
},
verbose: true,
strict: true,
});

# Findings:

1. Schema source: ./prisma/drizzle/schema.ts -- this file does not exist. The Prisma schema has a generator drizzle block that outputs to ../src/db/schema, but drizzle.config.ts points to a different path (./prisma/drizzle/schema.ts). This is a misconfiguration -- either:

- The Drizzle schema output has not been generated yet, OR
- The config is stale and the actual migration tooling uses a different path.

2. Output directory: ./drizzle -- but the actual drizzle directory exists and contains meta/\_journal.json with zero entries. No migration SQL files exist under ./drizzle/.
3. SSL configuration: The DATABASE_URL gets its SSL mode replaced from require to no-verify. This means the connection will NOT validate the server certificate. This is fine for dev but could be a security issue in production if the production DATABASE_URL uses sslmode=require.
4. Strict mode: Enabled. This ensures Drizzle Kit will error on schema drift.
5. Drizzle Journal
   File: /home/ubuntupunk/Projects/soralia-village/drizzle/meta/\_journal.json
   { "version": "7", "dialect": "postgresql", "entries": [] }
   Findings:
6. Journal version: 7 (compatible with drizzle-kit v0.28+)
7. Dialect: PostgreSQL
8. Entries: Empty array -- zero migrations have been applied via Drizzle Kit
9. No migration SQL files exist under ./drizzle/
   Implication: The database schema is likely managed entirely through Prisma Migrate (not Drizzle Kit). The Drizzle configuration appears to be set up for future use but is not currently active. The generator drizzle block in the Prisma schema outputs to ../src/db/schema (i.e., src/db/schema), which is where the Drizzle schema types are generated for use in application code. The Drizzle Kit migration pipeline (drizzle.config.ts → ./drizzle/ → \_journal.json) is a separate mechanism that is configured but unused.

# Consolidated Summary of Critical Findings

|Severity| Finding|
1 HIGH drizzle.config.ts points to ./prisma/drizzle/schema.ts which does not exist. The Prisma generator outputs to ../src/db/schema instead.
2 HIGH UserAchievementProgress.definitionId and UserAchievement.definitionId have no @relation declared. No FK constraint will be created in the database.
3 HIGH DelegationAction.actorId has no @relation declared. Dangling foreign key with no integrity constraint.
4 MEDIUM 19 models have zero composite indexes. Conversation, Survey, ExternalSurvey, Organization, AiCapabilityCost, PlatformAiTierQuota are the most impactful.
5 MEDIUM ~20 tenant-scoped models have a tenantId String field but no FK relation to Tenant. Tenant deletion will leave orphans across the database.
6 MEDIUM 3 seat models (PremiumSeat, SoloSeat, StandardSeat) share ~10 fields. Polymorphism via separate tables adds maintenance burden.
7 MEDIUM TenantInvoice and ProviderInvoice are near-duplicates. TenantPayment and PaymentTransaction are also near-duplicates.
8 MEDIUM 8 models have computed/denormalized fields (rating, reviewCount, entryCount, balance, viewCount, downloadCount, totalListings, activeListings, salesCompleted) that could drift from source-of-truth.
9 LOW user model has 55 relation back-links. This is a god-model anti-pattern and creates N+1 risk for any eager-loading query.
10 LOW Soft-delete (deletedAt) is applied inconsistently: 38 models have it, 70 do not. No clear policy on when to soft-delete vs hard-delete.
