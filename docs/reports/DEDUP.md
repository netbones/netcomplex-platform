---
title: Model Duplication Analysis — Prisma Schema
status: current
reviewed: 2026-07-28
tags: [report, analysis]
audience: developer
---

# Model Duplication Analysis — Prisma Schema

## DUPLICATION #1: Seat Models (PremiumSeat, SoloSeat, StandardSeat)

Files: /home/ubuntupunk/Projects/soralia-village/prisma/schema/schema.prisma lines 344-423
Side-by-Side Field Comparison
Field PremiumSeat (L344) SoloSeat (L372) StandardSeat (L399)
id String @id String @id String @id
tenantId String String String
userId String @unique String String
platformAddress String @unique String @unique String @unique
organizationId String? String? String?
createdAt DateTime @default(now()) DateTime @default(now()) DateTime @default(now())
updatedAt DateTime @updatedAt DateTime @updatedAt DateTime @updatedAt
archivedAt DateTime? DateTime? DateTime?
status SeatStatus @default(ACTIVE) SeatStatus @default(ACTIVE) SeatStatus @default(ACTIVE)
addressId String? String? String?
address Address? (FK) Address? (FK) Address? (FK)
Tenant Tenant @relation (Restrict) Tenant @relation (Restrict) Tenant @relation (Restrict)
user user @relation (Cascade) user @relation (no Cascade) user @relation (Cascade)
isActive Boolean @default(true) -- --
portfolioName String? -- --
subscriptionTier String @default("basic") -- --
maxProperties Int @default(5) -- --
messageRetentionDays Int @default(30) -- --
tier String @default("foundation") -- --
propertyPremiumSeats PropertyPremiumSeat[] -- --
propertyId -- String? String (required)
seatType -- SoloSeatType --
isComplimentary -- Boolean @default(false) --
linkedFromProfileId -- String? --
property -- Property? (optional) Property @relation (Cascade, required)
isPrimaryOwner -- -- Boolean @default(true)
@@unique -- -- [userId, propertyId]
Indexes: All three have @@index([organizationId]), @@index([userId]), @@index([addressId]), @@index([tenantId]). SoloSeat and StandardSeat also have @@index([propertyId]). PremiumSeat does not.
Shared Fields Count: 12 fields plus 3 relations (Tenant, user, Address) — all structurally identical.
Unique-to-PremiumSeat (6 fields + 1 relation):
isActive, portfolioName, subscriptionTier, maxProperties, messageRetentionDays, tier, PropertyPremiumSeat[]
Unique-to-SoloSeat (4 fields + optional property relation):
propertyId?, seatType, isComplimentary, linkedFromProfileId, Property?
Unique-to-StandardSeat (2 fields + required property relation + unique constraint):
propertyId (required), isPrimaryOwner, Property @relation (Cascade, required), @@unique([userId, propertyId])
All Relation References (who points to them):
Parent Model PremiumSeat SoloSeat StandardSeat
Tenant PremiumSeat[] SoloSeat[] StandardSeat[]
Address premiumSeats[] soloSeats[] standardSeats[]
Property via PropertyPremiumSeat junction soloSeat[] standardSeat[]
user premiumSeat? (singular, optional) soloSeat[] standardSeat[]
PropertyPremiumSeat premiumSeat (FK) -- --
Key asymmetry: user.premiumSeat is singular/optional (one PremiumSeat per user max, enforced by @unique on userId), while user.soloSeat and user.standardSeat are arrays (many per user).
Proposed Unified Model:
enum SeatType {
PREMIUM
SOLO
STANDARD
}

model Seat {
id String @id
tenantId String
userId String
seatType SeatType
platformAddress String @unique
organizationId String?
status SeatStatus @default(ACTIVE)
archivedAt DateTime?
addressId String?
address Address? @relation(fields: [addressId], references: [id])
Tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)
user user @relation(fields: [userId], references: [id], onDelete: Cascade)

// --- Premium-only fields ---
portfolioName String?
subscriptionTier String? @default("basic") // nullable on non-premium
maxProperties Int? @default(5) // nullable on non-premium
messageRetentionDays Int? @default(30) // nullable on non-premium
tier String? @default("foundation")
// isActive is redundant with status; drop it

// --- Solo-only fields ---
seatTypeDetail SoloSeatType?
isComplimentary Boolean? @default(false)
linkedFromProfileId String?
propertyId String? // nullable for PremiumSeat which had no direct property FK

// --- Standard-only fields ---
isPrimaryOwner Boolean? @default(true)

// Relations
property Property? @relation(fields: [propertyId], references: [id])
propertyPremiumSeats PropertyPremiumSeat[] // only populated for PREMIUM type

// Constraints: mirror original
@@unique([userId, propertyId]) // was StandardSeat-only, now applies to all
@@index([propertyId])
@@index([organizationId])
@@index([userId])
@@index([addressId])
@@index([tenantId])
}
The PropertyPremiumSeat junction table would remain as-is, linking Property <-> Seat for PREMIUM type rows. Application-level checks would enforce that propertyPremiumSeats only contains entries when seatType = PREMIUM.
Migration Complexity Estimate: HIGH (6-8 hours + data migration)

- Requires a new Seat table, a data migration script to INSERT from all three source tables (mapping type-specific fields), and a SeatType enum.
- All references in 5 parent models (Tenant, Address, Property, user, PropertyPremiumSeat) need updating.
- PropertyPremiumSeat junction table's FK changes from premiumSeatId -> seatId with a constraint check.
- The user model's premiumSeat? (singular) and soloSeat[]/standardSeat[] (plural) consolidate to a single seats[], which breaks the optional-singular access pattern.
- Downstream code using user.premiumSeat?.xxx would need to change to user.seats.find(s => s.seatType === 'PREMIUM')?.xxx.
- Prisma migration creates table, but you must backfill; zero-downtime requires dual-writing or a cutover window.
- Prisma views are not available, so read paths during migration would use a union view or app-level routing.

## DUPLICATION #2: TenantInvoice vs ProviderInvoice

Files: TenantInvoice at schema.prisma lines 1501-1523, ProviderInvoice at lines 1420-1446
Side-by-Side Field Comparison
Field TenantInvoice ProviderInvoice
id String @id @default(cuid()) String @id @default(cuid())
tenantId String String
Tenant Tenant @relation (Restrict) Tenant @relation (Restrict)
subscriptionId String String
invoiceNumber String String
items Json @default("[]") Json (no default)
total Decimal @default(0) @db.Decimal(10,2) Decimal @db.Decimal(10,2)
currency String @default("ZAR") String @default("ZAR")
status InvoiceStatus @default(PENDING) InvoiceStatus @default(PENDING)
paidAt DateTime? DateTime?
pdfUrl String? String?
createdAt DateTime @default(now()) DateTime @default(now())
updatedAt DateTime @updatedAt DateTime @updatedAt
subscription TenantSubscription @relation ProviderSubscription @relation
providerId -- String
transactionId String? (optional) String (required)
subtotal Decimal @default(0) --
taxAmount Decimal @default(0) --
downloadReady Boolean @default(false) --
platformFee -- Decimal @db.Decimal(10,2)
processorFee -- Decimal @db.Decimal(10,2)
netAmount -- Decimal @db.Decimal(10,2)
deletedAt -- DateTime?
provider -- ServiceProvider @relation
transaction -- PaymentTransaction @relation
Indexes [tenantId], [subscriptionId] [tenantId], [providerId]
Shared Fields Count: 13 fields (id, tenantId, subscriptionId, invoiceNumber, items, total, currency, status, paidAt, pdfUrl, createdAt, updatedAt, Tenant relation) — structurally identical or near-identical.
Unique to TenantInvoice (3 fields):
subtotal, taxAmount, downloadReady
Unique to ProviderInvoice (6 fields + 3 relations + soft-delete):
providerId, platformFee, processorFee, netAmount, deletedAt, ServiceProvider @relation, PaymentTransaction @relation, transactionId (required)
All Relation References:
Parent Model TenantInvoice ProviderInvoice
Tenant TenantInvoice[] ProviderInvoice[]
TenantSubscription invoices[] --
ServiceProvider -- invoices[]
ProviderSubscription -- invoices[]
PaymentTransaction -- invoices[]
Proposed Unified Model:
enum InvoiceDomain {
TENANT_BILLING
PROVIDER_BILLING
}

model Invoice {
id String @id @default(cuid())
tenantId String
domain InvoiceDomain  
 subscriptionId String // polymorphic: either TenantSubscription or ProviderSubscription
transactionId String?

// Financial core (shared)
items Json @default("[]")
total Decimal @default(0) @db.Decimal(10, 2)
currency String @default("ZAR")
status InvoiceStatus @default(PENDING)
paidAt DateTime?
pdfUrl String?

// TenantInvoice-specific
subtotal Decimal? @default(0) @db.Decimal(10, 2)
taxAmount Decimal? @default(0) @db.Decimal(10, 2)
downloadReady Boolean? @default(false)

// ProviderInvoice-specific
providerId String?
platformFee Decimal? @default(0) @db.Decimal(10, 2)
processorFee Decimal? @default(0) @db.Decimal(10, 2)
netAmount Decimal? @default(0) @db.Decimal(10, 2)

// Soft delete
deletedAt DateTime?

// Relations
Tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)
provider ServiceProvider? @relation(fields: [providerId], references: [id])
transaction PaymentTransaction? @relation(fields: [transactionId], references: [id])

@@index([tenantId])
@@index([providerId])
@@index([subscriptionId])
}
This uses nullable provider-specific fields plus the domain discriminator. Application logic enforces that tenant invoices have subtotal/taxAmount/downloadReady set while provider invoices have providerId/platformFee/processorFee/netAmount set.
Alternatively, the platform-related fields (platformFee, processorFee, netAmount) could stay in PaymentTransaction since ProviderInvoice already has a transaction FK, making them derivable via join. This would shrink the overlap.
Migration Complexity Estimate: MEDIUM (4-6 hours + data migration)

- New Invoice table, data migration from both source tables.
- Two subscription FK targets (TenantSubscription vs ProviderSubscription) cannot be expressed as a single FK in PostgreSQL — you must either drop the FK or use a polymorphic approach (no FK enforcement). This is the hardest problem.
- Alternatives: (a) keep two separate FKs (tenantSubscriptionId? and providerSubscriptionId?), both nullable, with app-level domain enforcement; or (b) use a check constraint ensuring exactly one is set.
- The domain discriminator column plus a CHECK constraint (domain = 'TENANT_BILLING' AND subtotal IS NOT NULL) OR (domain = 'PROVIDER_BILLING' AND providerId IS NOT NULL) enforces shape.
- Update 3 parent back-links (Tenant, TenantSubscription, ServiceProvider/ProviderSubscription).
- No existing child models reference either invoice type, minimizing cascading changes.
  DUPLICATION #3: TenantPayment vs PaymentTransaction
  Files: TenantPayment at schema.prisma lines 1525-1546, PaymentTransaction at lines 1345-1371
  Side-by-Side Field Comparison
  Field TenantPayment PaymentTransaction
  id String @id @default(cuid()) String @id @default(cuid())
  tenantId String String
  Tenant Tenant @relation (Restrict) Tenant @relation (Restrict)
  subscriptionId String String
  amount Decimal @db.Decimal(10,2) Decimal @db.Decimal(10,2)
  currency String @default("ZAR") String @default("ZAR")
  platformFee Decimal @default(0) Decimal @db.Decimal(10,2)
  processorFee Decimal @default(0) Decimal @db.Decimal(10,2)
  netAmount Decimal @default(0) Decimal @db.Decimal(10,2)
  status TransactionStatus @default(PENDING) TransactionStatus @default(PENDING)
  gateway PaymentGateway PaymentGateway
  externalRef String? String?
  invoiceUrl String? String?
  createdAt DateTime @default(now()) DateTime @default(now())
  subscription TenantSubscription @relation ProviderSubscription @relation
  couponId String? --
  providerId -- String
  deletedAt -- DateTime?
  provider -- ServiceProvider @relation
  charges[] -- ProviderCharge[]
  invoices[] -- ProviderInvoice[]
  revenue[] -- RevenueRecord[]
  Indexes [tenantId], [subscriptionId], [externalRef] [tenantId], [providerId], [subscriptionId]
  Shared Fields Count: 14 fields — this is the most extreme duplication. id, tenantId, subscriptionId, amount, currency, platformFee, processorFee, netAmount, status, gateway, externalRef, invoiceUrl, createdAt are all identical in name, type, and default.
  Unique to TenantPayment (1 field):
  couponId String?
  Unique to PaymentTransaction (1 field + 1 relation + 3 child collections + soft-delete):
  providerId, deletedAt, ServiceProvider @relation, ProviderCharge[], ProviderInvoice[], RevenueRecord[]
  All Relation References:
  Parent Model TenantPayment PaymentTransaction
  Tenant TenantPayment[] PaymentTransaction[]
  TenantSubscription payments[] --
  ServiceProvider -- transactions[]
  ProviderSubscription -- transactions[]
  ProviderCharge -- FK transactionId
  ProviderInvoice -- FK transactionId
  RevenueRecord -- FK transactionId
  Proposed Unified Model:
  enum TransactionDomain {
  TENANT_PAYMENT
  PROVIDER_PAYMENT
  }

model Transaction {
id String @id @default(cuid())
tenantId String
domain TransactionDomain
subscriptionId String // polymorphic FK target

// Payment core (identical across both)
amount Decimal @db.Decimal(10, 2)
currency String @default("ZAR")
platformFee Decimal @default(0) @db.Decimal(10, 2)
processorFee Decimal @default(0) @db.Decimal(10, 2)
netAmount Decimal @default(0) @db.Decimal(10, 2)
status TransactionStatus @default(PENDING)
gateway PaymentGateway
externalRef String?
invoiceUrl String?

// TenantPayment-specific
couponId String?

// Provider-payment specific
providerId String?

// Soft delete
deletedAt DateTime?

// Relations
Tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)
provider ServiceProvider? @relation(fields: [providerId], references: [id])

// Child relations (provider-side only)
charges ProviderCharge[]
invoices ProviderInvoice[]
revenue RevenueRecord[]

@@index([tenantId])
@@index([providerId])
@@index([subscriptionId])
@@index([externalRef])
}
Same polymorphic FK problem as with invoices: the subscriptionId points to either TenantSubscription or ProviderSubscription. A pure relational solution keeps two nullable FK columns:
tenantSubscriptionId String?
providerSubscriptionId String?
tenantSubscription TenantSubscription? @relation(fields: [tenantSubscriptionId], references: [id])
providerSubscription ProviderSubscription? @relation(fields: [providerSubscriptionId], references: [id])
With a CHECK constraint: (domain = 'TENANT_PAYMENT' AND tenantSubscriptionId IS NOT NULL AND providerSubscriptionId IS NULL) OR (domain = 'PROVIDER_PAYMENT' AND providerSubscriptionId IS NOT NULL AND tenantSubscriptionId IS NULL).
Migration Complexity Estimate: HIGH (6-8 hours + data migration)

- This model has the most downstream impact. PaymentTransaction is referenced by 3 child models: ProviderCharge, ProviderInvoice, and RevenueRecord — each holds a transactionId FK. All three FK targets must be updated.

- The Transaction rename from PaymentTransaction means every FK column in 3 tables must be renamed or point to the new table.

- Data migration from both TenantPayment and PaymentTransaction into a single table, merging ~14 overlapping columns.

- Three child collections charges[], invoices[], revenue[] are gated by domain (only provider transactions have them). You'd add application-level checks or nullable back-links.

- ProviderCharge, ProviderInvoice, RevenueRecord all have existing FKs to PaymentTransaction — those must be re-pointed to Transaction and the tenantPaymentId would no longer exist.

- Delete/update behavior for the child FK relations: currently PaymentTransaction FKs have no explicit onDelete (see PRISMA_ANALYSIS.md finding #9), meaning they are implicitly NoAction — deleting a transaction would fail if children exist. The unified model could add onDelete: Cascade or SetNull.

## Summary of All Repetitive Fields Across the Schema

As noted in docs/to-claude/PRISMA_ANALYSIS.md finding #6, the following field clusters repeat pervasively:
Repeating Pattern Models That Have It
tenantId + createdAt + updatedAt + optional deletedAt ~45 models
platformAddress (unique string) PremiumSeat, SoloSeat, StandardSeat, Property
organizationId (nullable string) ~15 models
PRISMA_ANALYSIS.md Findings #6 and #7 (confirmed)
Finding #6 — Seat model duplication: The analysis correctly identifies all three seat models as "polymorphism via separate models." The shared 12-field core is confirmed. The analysis mentions isActive on PremiumSeat as redundant with status — still true.
Finding #7 — Invoice/Payment duplication: The analysis calls TenantInvoice/ProviderInvoice and TenantPayment/PaymentTransaction "near-duplicates." This is confirmed with the detail above. The analysis also notes that TenantPayment is missing an index on couponId — still missing. PaymentTransaction has deletedAt while TenantPayment does not, which is a soft-delete policy gap the analysis flags in finding #10.

## Overall Recommendations

| Action                                                  | Priority   | Benefit                                                     | Complexity |
| ------------------------------------------------------- | ---------- | ----------------------------------------------------------- | ---------- |
| Consolidate 3 seats -> 1 Seat (discriminator)           | Medium     | Removes 2 tables, ~36 fields of duplication                 | HIGH       |
| Consolidate 2 invoices -> 1 Invoice (discriminator)     | Low-Medium | Removes 1 table, cleaner financial lineage                  | MEDIUM     |
| Consolidate 2 payments -> 1 Transaction (discriminator) | Low-Medium | Removes 1 table, fixes FK chain to charges/invoices/revenue | HIGH       |

The seat consolidation gives the highest duplication-reduction ratio (3 tables into 1, 12 shared fields). The payment/invoice consolidations are complicated by the polymorphic subscriptionId FK issue and by PaymentTransaction being a parent to 3 child models, but they would fix the current inability to query a unified financial ledger across tenant and provider billing domains.
