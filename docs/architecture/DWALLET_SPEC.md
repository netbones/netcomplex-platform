---
title: dWallet — Functional Specification & Agent Instructions
status: current
reviewed: 2026-07-28
tags: [architecture, design]
audience: developer
---

# dWallet — Functional Specification & Agent Instructions

> **Document type:** Feature Specification + Agent Handoff  
> **Module key:** `dWallet`  
> **Status:** Pre-implementation — ready for Phase planning  
> **Legal basis:** Schedule G of SaaS License Agreement (Soralia Village v10)  
> **Compliance:** POPIA, LGPD principles, 31st Human Right framing  
> **Last updated:** 2026-06-06

---

## Part 1 — Functional Specification

---

### 1. Purpose & Scope

The dWallet is a data-subject-centric privacy and monetisation module. It gives each resident:

- full visibility into what personal data is collected and used
- granular, revocable consent over each revenue-generating data use
- a real-time ledger of monetary rewards earned from the Resident Data Share programme
- self-service data export and deletion rights

The dWallet is a **tenant-level module** (`dWallet`) unlocked at the **PREMIUM** tier and above. It integrates with the existing Module/TenantModule gating system and appears as a new `PlatformModule` with key `dWallet`.

It is **not** a financial payment processor. It is a ledger and consent management layer. Actual disbursements (EFT, PayFast, etc.) are out of scope for Phase 1 but the data model must support them cleanly.

---

### 2. Domain Model

#### 2.1 New Prisma Models

The following models are additive — no existing tables are altered.

```prisma
// ── dWallet ──────────────────────────────────────────────────────────────
// One wallet per user per tenant. Created on opt-in or on first consent action.

model DWallet {
  id              String          @id @default(cuid())
  tenantId        String
  userId          String
  balance         Decimal         @default(0) @db.Decimal(12, 2)
  currency        String          @default("ZAR")
  lifetimeEarned  Decimal         @default(0) @db.Decimal(12, 2)
  lifetimePaid    Decimal         @default(0) @db.Decimal(12, 2)
  status          WalletStatus    @default(ACTIVE)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  user            user            @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions    WalletTransaction[]
  consents        DataConsent[]
  payoutRequests  PayoutRequest[]

  @@unique([tenantId, userId])
  @@index([tenantId])
  @@index([userId])
  @@index([status])
}

// ── WalletTransaction ────────────────────────────────────────────────────
// Immutable append-only ledger. Every credit and debit is a row.
//
// Design note (BILLING.md Domain 3 alignment): WalletTransaction serves as
// the double-entry ledger entries. Balance is never mutated directly via
// `wallet.balance += amount` — it is derived from SUM(transactions.amount).
// Each row records balanceBefore (debit side) and balanceAfter (credit side),
// where balanceAfter = balanceBefore + amount. Corrections are new ADJUSTMENT
// rows, never in-place mutation of existing transactions. DWallet.balance is
// a cached computation that must always equal SUM(WalletTransaction.amount).

model WalletTransaction {
  id              String              @id @default(cuid())
  tenantId        String
  walletId        String
  type            TransactionType
  amount          Decimal             @db.Decimal(12, 2)
  currency        String              @default("ZAR")
  description     String
  referenceId     String?             // External batch ID or payout ID
  referenceType   String?             // "data_share_batch" | "payout" | "rollover" | "adjustment"
  balanceBefore   Decimal             @db.Decimal(12, 2)
  balanceAfter    Decimal             @db.Decimal(12, 2)
  sourceType      TransactionSource   @default(RESIDENT_DATA_SHARE)  // Value Ledger: distinguishes between future value sources (Phase 45 Merits, Phase 104 AI, etc.)
  createdAt       DateTime            @default(now())

  wallet          DWallet             @relation(fields: [walletId], references: [id], onDelete: Cascade)

  @@index([walletId])
  @@index([tenantId])
  @@index([referenceId])
  @@index([createdAt])
}

// ── DataConsent ──────────────────────────────────────────────────────────
// One row per consent decision per stream. History is preserved via new rows
// (append-only per stream for audit trail; latest row = current state).

model DataConsent {
  id              String          @id @default(cuid())
  tenantId        String
  walletId        String
  userId          String
  streamKey       String          // e.g. "anonymised_analytics", "market_research"
  granted         Boolean
  ipAddress       String?
  userAgent       String?
  grantedAt       DateTime?
  revokedAt       DateTime?
  createdAt       DateTime        @default(now())

  wallet          DWallet         @relation(fields: [walletId], references: [id], onDelete: Cascade)

  @@index([walletId])
  @@index([tenantId, streamKey])
  @@index([userId])
}

// ── PayoutRequest ────────────────────────────────────────────────────────
// Resident-initiated payout request. Admin processes externally and marks complete.

model PayoutRequest {
  id              String          @id @default(cuid())
  tenantId        String
  walletId        String
  userId          String
  amount          Decimal         @db.Decimal(12, 2)
  currency        String          @default("ZAR")
  status          PayoutStatus    @default(PENDING)
  method          String?         // "bank_transfer" | "community_fund" (Phase 2)
  bankReference   String?
  processedAt     DateTime?
  processedBy     String?         // userId of admin who actioned
  notes           String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  wallet          DWallet         @relation(fields: [walletId], references: [id], onDelete: Cascade)

  @@index([walletId])
  @@index([tenantId])
  @@index([status])
}

// ── DataRevenueStream ────────────────────────────────────────────────────
// Tenant-level configuration of which revenue streams exist and their share %.

model DataRevenueStream {
  id              String          @id @default(cuid())
  tenantId        String
  key             String          // matches DataConsent.streamKey
  label           String
  description     String?
  residentSharePct Decimal        @db.Decimal(5, 2)  // e.g. 30.00 = 30%
  isActive        Boolean         @default(true)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@unique([tenantId, key])
  @@index([tenantId])
}

// ── DataShareBatch ───────────────────────────────────────────────────────
// Monthly distribution run. One batch per tenant per period.
// Admin triggers; system distributes pro-rata to opted-in wallets.

model DataShareBatch {
  id              String          @id @default(cuid())
  tenantId        String
  periodStart     DateTime
  periodEnd       DateTime
  streamKey       String
  totalRevenue    Decimal         @db.Decimal(12, 2)
  residentPool    Decimal         @db.Decimal(12, 2)  // totalRevenue * residentSharePct
  participantCount Int
  status          BatchStatus     @default(PENDING)
  processedAt     DateTime?
  processedBy     String?
  createdAt       DateTime        @default(now())

  @@index([tenantId])
  @@index([status])
}

// ── Enums ────────────────────────────────────────────────────────────────

enum WalletStatus {
  ACTIVE
  FROZEN        // admin-frozen, no debits/credits
  CLOSED        // on account deletion
}

enum TransactionType {
  CREDIT        // reward received
  DEBIT         // payout disbursed
  ROLLOVER      // unclaimed balance moved to Community Benefit Fund
  ADJUSTMENT    // admin correction with audit note
}

// Value Ledger: distinguishes between future value sources.
// Only RESIDENT_DATA_SHARE is active in Phase 47 — other enum values
// are forward-compatible slots for Phase 45 (Merits), Phase 104 (AI Billing),
// and future marketplace/referral/volunteer credits.
enum TransactionSource {
  RESIDENT_DATA_SHARE
  COMMUNITY_MERITS
  REFERRAL_REWARD
  VOLUNTEER_CREDIT
  AI_CREDIT
  MARKETPLACE_CREDIT
}

enum PayoutStatus {
  PENDING
  PROCESSING
  COMPLETED
  REJECTED
  CANCELLED
}

enum BatchStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

#### 2.2 Existing Schema — No Changes

No existing models are altered. `user` gets a new reverse relation `dWallet DWallet?` added via Prisma relation, but this is non-breaking.

---

### 3. Revenue Streams (Initial Set)

These are configured per-tenant via `DataRevenueStream`. The seed data for Soralia Village, derived from Schedule F Table 2 of the SaaS agreement, is:

| Key                      | Label                       | Resident Share % |
| ------------------------ | --------------------------- | ---------------- |
| `anonymised_analytics`   | Anonymised Usage Analytics  | 30%              |
| `market_research`        | Market Research Surveys     | 40%              |
| `community_benchmarking` | Community Benchmarking Data | 20%              |
| `service_matching`       | Service Provider Matching   | 35%              |

Exact percentages must be confirmed against Schedule F Table 2 before seeding production. The schema supports any value.

---

### 4. Consent Model

- Consent is **explicit, granular, and per-stream** — one `DataConsent` row per stream per decision.
- Consent state is the **most recent row** for a given `(walletId, streamKey)` pair.
- All historical consent rows are retained for 5 years (Schedule G4).
- A resident who has not yet granted consent for a stream is treated as **opted-out** (no implicit consent).
- Revoking consent **stops future credit accumulation** for that stream immediately. Past credits are not reversed.
- Consent changes generate an audit log entry via the existing Pino observability layer.

---

### 5. Reward Distribution Flow

```
Monthly (cron or admin-triggered):
  1. For each active DataRevenueStream on the tenant:
     a. Admin enters totalRevenue for the period
     b. System creates a DataShareBatch record
     c. System counts opted-in users (DataConsent.granted = true for stream)
     d. residentPool = totalRevenue × residentSharePct
     e. perResidentAmount = residentPool / participantCount
     f. For each opted-in user:
        - Credit their DWallet (WalletTransaction CREDIT)
        - balance += perResidentAmount
        - lifetimeEarned += perResidentAmount
     g. Batch status → COMPLETED

Minimum payout threshold: R50
  - PayoutRequest is accepted only if wallet.balance >= 50.00

Rollover rule (Schedule G3):
  - 12 months after credit, unclaimed balances are swept to Community Benefit Fund
  - Creates a WalletTransaction ROLLOVER, zeroes affected balance
  - Implemented as a monthly cron checking transaction age
```

---

### 6. Data Export & Deletion (POPIA / LGPD)

#### One-click Export

- Resident can request a JSON or CSV export from their dWallet dashboard.
- Export includes: all `DataConsent` rows, all `WalletTransaction` rows, all `PayoutRequest` rows, current balance, wallet metadata.
- Export is generated server-side and delivered as a signed download URL (via existing Supabase Storage).
- Export request is logged.

#### Deletion Request

- Resident submits a deletion request via dWallet.
- This triggers the existing POPIA right-to-erasure workflow (to be specified separately).
- Wallet is moved to `CLOSED` status.
- Balance is swept to Community Benefit Fund before closure (with ROLLOVER transaction).
- `DataConsent` rows are anonymised in place (userId nulled, `deletedForPrivacy: true` flag) — rows are not deleted to preserve the audit trail integrity required by Schedule G4.

---

### 7. HOA Admin Dashboard

The HOA admin (role: `ADMIN` or `BOARD`) gets read-only access to:

- Total opted-in residents per stream (counts, not names)
- Total rewards distributed this period / year-to-date
- Pending payout requests (list with amounts, no personal data beyond name for processing)
- Community Benefit Fund running total
- Batch history (all `DataShareBatch` records for the tenant)
- Ability to trigger a new distribution batch
- Ability to mark a `PayoutRequest` as COMPLETED or REJECTED (with notes)

Individual wallet balances and consent history are **never shown** to HOA admins. Only the resident and authorised NetComplex platform staff (via `AssistSession` with `scope: "dWallet"`) can see individual wallet data.

---

### 8. Navigation & UI Placement

Following Navigation Governance (NAVIGATION_GOVERNANCE.md):

| Surface            | Placement                                      | Notes                                      |
| ------------------ | ---------------------------------------------- | ------------------------------------------ |
| Resident dWallet   | Dashboard → My Space → "My Wallet" menu item   | Workspace-scoped, not public nav           |
| Resident widget    | Dashboard widget: `dwallet-summary`            | Shows balance, last reward, consent status |
| HOA Admin view     | Admin Dashboard → System tab → "Data & Wallet" | Role-gated: ADMIN / BOARD only             |
| Mobile burger menu | My Space section → My Wallet                   | Below Maintenance                          |

The dWallet does **not** get a top-level public navigation item. It is a workspace feature, not a discovery feature.

---

### 9. Widget Registration

Two new widgets are registered in `widgets.ts`:

```ts
// Resident summary widget
registry.register({
  id: 'dwallet-summary',
  version: '1.0.0',
  name: 'My Data Wallet',
  description: 'Current balance, recent rewards, and consent status',
  category: 'core',
  icon: Wallet,
  featureFlag: 'dWallet',
  component: lazy(() =>
    import('../ui/DWalletSummaryWidget').then(m => ({ default: m.DWalletSummaryWidget }))
  ),
  loader: () => import('../ui/DWalletSummaryWidget'),
  defaultSize: { width: 2, height: 2 },
  minSize: { width: 1, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

// Admin distribution widget
registry.register({
  id: 'admin-dwallet',
  version: '1.0.0',
  name: 'Data Wallet Admin',
  description: 'Reward distribution, payout management, and compliance overview',
  category: 'core',
  icon: Wallet,
  featureFlag: 'dWallet',
  permissions: ['admin', 'board'],
  component: lazy(() =>
    import('../../admin/ui/DWalletAdminWidget').then(m => ({ default: m.DWalletAdminWidget }))
  ),
  loader: () => import('../../admin/ui/DWalletAdminWidget'),
  defaultSize: { width: 4, height: 3 },
  minSize: { width: 3, height: 2 },
  dragHandleClassName: 'widget-drag-handle',
});
```

---

### 10. API Routes

All routes follow the existing `apiSuccess()` / `apiError()` envelope convention.

#### Resident Routes (`/api/v1/tenant/dwallet/`)

| Method | Path                   | Description                                      |
| ------ | ---------------------- | ------------------------------------------------ |
| GET    | `/`                    | Get own wallet (balance, status, lifetime stats) |
| GET    | `/transactions`        | Paginated transaction ledger                     |
| GET    | `/consents`            | All consent records (current state per stream)   |
| POST   | `/consents/:streamKey` | Grant or revoke consent for a stream             |
| POST   | `/payout`              | Request a payout (min R50 enforced)              |
| GET    | `/payout`              | List own payout requests                         |
| POST   | `/export`              | Trigger data export (JSON or CSV)                |
| POST   | `/deletion-request`    | Submit right-to-erasure request                  |
| GET    | `/streams`             | List active revenue streams with descriptions    |
| GET    | `/statement`           | Annual statement download (PDF, via pdf skill)   |

#### Admin Routes (`/api/admin/dwallet/`)

| Method | Path           | Description                                 |
| ------ | -------------- | ------------------------------------------- |
| GET    | `/stats`       | Aggregated stats (counts, totals, no PII)   |
| GET    | `/batches`     | List all DataShareBatch records             |
| POST   | `/batches`     | Create and run a distribution batch         |
| GET    | `/payouts`     | List all PayoutRequest records              |
| PATCH  | `/payouts/:id` | Mark payout COMPLETED or REJECTED           |
| GET    | `/streams`     | List/manage DataRevenueStream config        |
| POST   | `/streams`     | Create a new revenue stream                 |
| PATCH  | `/streams/:id` | Update stream (label, description, share %) |

---

### 11. Feature Gate Integration

The dWallet integrates with the consolidated gate system (Phase 41, C2 resolution):

```ts
// Module key
'dWallet'; // added to PlatformModule seed, minTier: PREMIUM

// Feature keys (FeatureRegistry additions)
'page.dWallet';
'feature.dWallet.consent';
'feature.dWallet.payout';
'feature.dWallet.export';
'widget.dWallet.summary';
'widget.dWallet.admin';
```

---

### 12. Audit & Compliance

- All consent changes write to Pino structured log with `{ event: 'consent_change', userId, streamKey, granted, ip }`.
- All wallet transactions are immutable — no UPDATE or DELETE ever touches `WalletTransaction`.
- All payout state changes are logged with `processedBy`.
- `DataConsent` rows are retained for minimum 5 years (Schedule G4). A soft-delete-only policy applies.
- Annual statement generation must be available for download on demand.
- On tenant termination (Schedule G6): all wallet balances and export tooling must be transferable within 30 days. The export endpoint serves this purpose; a platform-admin bulk export route will be added in Phase 2.

---

### 13. What's Out of Scope (Phase 1)

- Actual EFT/bank disbursement integration (amounts are tracked, payment is manual)
- Community Benefit Fund as a separate ledger model (tracked as a counter in `Tenant.featureFlags` for now)
- Third-party payment gateway (PayFast, Peach Payments)
- Push notifications on reward receipt (flagged for Phase 2 via Notification model)
- Multi-currency support (ZAR only in Phase 1)

---

## Part 2 — Agent Instructions

---

### Agent Context

You are implementing the **dWallet module** for the NetComplex / Soralia Village platform. This is a legally-required feature (Schedule G of the SaaS agreement) with compliance obligations under POPIA and LGPD. Treat data integrity, audit trails, and consent immutability as hard constraints — not optional.

Read these documents before writing any code:

- `AGENTS.md` — workflow, quality gates, push requirements
- `docs/STEERING/ADR.md` — architectural decisions (especially ADR-004 FSD structure)
- `docs/GATE_PLAN.md` — feature gate consolidation (Phase 41); use `canAccess()` not legacy guards
- `docs/HOLISTIC.md` — system-wide risk map and coupling points
- `UBIQUITOUS_LANGUAGE.md` — canonical terminology
- `NAVIGATION_GOVERNANCE.md` — where UI elements are placed

---

### Implementation Order

Follow this sequence. Do not skip phases. Each plan should be a GSD phase.

#### Phase A — Schema & Migration

**Goal:** All DB models exist and are migrated.

1. Add the 6 new models (`DWallet`, `WalletTransaction`, `DataConsent`, `PayoutRequest`, `DataRevenueStream`, `DataShareBatch`, and 5 new enums) to `prisma/schema.prisma` exactly as specified in Section 2.1 above.
2. Add the reverse relation `dWallet DWallet?` to the `user` model.
3. Run `npx prisma migrate dev --name add_dwallet_module` to generate the migration.
4. Run `npx prisma generate` to regenerate the Drizzle schema (the generator picks it up automatically).
5. Verify the generated Drizzle files appear in `src/db/schema/` with correct naming convention (kebab-case, matching existing files).
6. Add a seed entry to `prisma/seed/modules.ts` for the `dWallet` PlatformModule (`key: 'dWallet'`, `minTier: PREMIUM`, `defaultEnabled: false`).
7. Add seed entries for the 4 initial `DataRevenueStream` rows scoped to the Soralia tenant — percentages as specified in Section 3. Mark these with a `TODO: confirm against Schedule F Table 2` comment.

**Quality gate:** `npx prisma validate` must pass. `npm run typecheck` must pass after Drizzle generation.

---

#### Phase B — API Layer

**Goal:** All REST routes exist, are auth-guarded, and return correct envelopes.

1. Create resident route handlers under `src/app/api/v1/tenant/dwallet/`. Mirror the structure of an existing multi-route tenant domain (e.g., `src/app/api/v1/tenant/resources/`).
2. Create admin route handlers under `src/app/api/admin/dwallet/`.
3. Every route must:
   - Use `getSessionAndRole()` from `src/shared/api/auth-utils.ts` for auth
   - Use `withTenant()` for tenant context
   - Return `apiSuccess()` / `apiError()` from `src/shared/api/api-response.ts`
   - Include `export const maxDuration = 8`
   - Validate all inputs with Zod schemas (define in `src/entities/dwallet/schema.ts`)
4. The `POST /consents/:streamKey` route is the most critical. It must:
   - Accept `{ granted: boolean }` body
   - Create a new `DataConsent` row (never update existing rows)
   - Log to Pino: `logger.info({ event: 'consent_change', userId, streamKey, granted, tenantId, ip: req.headers['x-forwarded-for'] })`
   - Return the new consent state
5. The `POST /payout` route must:
   - Reject if `wallet.balance < 50.00` with `apiError(400, 'BELOW_MINIMUM_THRESHOLD')`
   - Create a `PayoutRequest` record with status PENDING
   - NOT modify the balance yet (balance is debited only when admin marks COMPLETED)
6. The `PATCH /admin/dwallet/payouts/:id` route must:
   - When marking COMPLETED: create a `WalletTransaction` DEBIT, subtract from balance, update `lifetimePaid`
   - When marking REJECTED: no balance change
   - Always set `processedAt` and `processedBy`
7. The distribution batch endpoint (`POST /admin/dwallet/batches`) must:
   - Accept `{ streamKey, periodStart, periodEnd, totalRevenue }`
   - Compute `residentPool = totalRevenue × stream.residentSharePct / 100`
   - Count opted-in users via `DataConsent` where `granted = true` and `streamKey` matches (latest consent row per user)
   - Pro-rata divide and write one `WalletTransaction CREDIT` per opted-in wallet
   - Use a DB transaction (Drizzle `.transaction()`) — if any credit fails, the entire batch rolls back
   - Set batch status to COMPLETED on success, FAILED on error with an error message stored in a `notes` field (add this field to the model)

**Quality gate:** `npm run typecheck` and `npm run lint` must pass. Write at least 3 Vitest tests in `src/test/` covering: consent creation, payout minimum threshold rejection, batch distribution math.

---

#### Phase C — Entities & FSD Structure

**Goal:** The dWallet domain follows Feature-Sliced Design and is properly encapsulated.

Create `src/entities/dwallet/` with:

```
src/entities/dwallet/
├── index.ts          # barrel export
├── schema.ts         # Zod schemas for all request/response shapes
├── model/
│   ├── types.ts      # TypeScript interfaces (DWalletSummary, ConsentState, etc.)
│   └── useWallet.ts  # Client hook: fetches wallet summary, exposes consent toggles
├── api/
│   └── index.ts      # Server-side helpers (getOrCreateWallet, getConsentState, etc.)
└── ui/               # Shared UI primitives (ConsentToggle, BalanceDisplay, etc.)
```

Key types to define in `model/types.ts`:

```ts
interface DWalletSummary {
  balance: Decimal;
  lifetimeEarned: Decimal;
  currency: string;
  status: WalletStatus;
  consents: ConsentState[];
  recentTransactions: WalletTransaction[];
}

interface ConsentState {
  streamKey: string;
  label: string;
  description: string | null;
  granted: boolean;
  grantedAt: Date | null;
  revokedAt: Date | null;
}
```

The `getOrCreateWallet()` helper in `api/index.ts` is called by all API routes that need the wallet. It upserts a `DWallet` record if one doesn't exist for the user.

---

#### Phase D — UI Widgets

**Goal:** Resident and admin widgets are functional.

**Resident widget (`DWalletSummaryWidget`):**

- Shows current balance in ZAR (large, prominent)
- Shows last reward received (amount + stream label + date)
- Shows consent status per stream as a list of toggles (`ConsentToggle` component)
- Each toggle calls `POST /api/v1/tenant/dwallet/consents/:streamKey` on change with optimistic UI update
- "Request Payout" button (disabled if balance < R50, with tooltip explaining threshold)
- "Export My Data" button
- Link to full transaction history page

**Admin widget (`DWalletAdminWidget`):**

- Summary cards: total residents opted in, total rewards distributed this month, pending payouts
- "Run Distribution" button → form to select stream, enter period and total revenue
- Pending payouts table: resident name, amount, date requested, action buttons (Complete / Reject)
- Never shows individual consent choices or individual balances

**Placement:**

- Register both in `src/widgets/dashboard/model/widgets.ts` (the `registerAllWidgets` function in `widgets.ts`)
- `dwallet-summary` goes in the `home` space for residents
- `admin-dwallet` goes in the `system` space for admins

---

#### Phase E — Feature Gate Integration

**Goal:** dWallet respects the Phase 41 gate system.

1. Add `dWallet` to the `PlatformModule` seed if not already done in Phase A.
2. Add the feature keys from Section 11 to the `FeatureRegistry` in `src/entities/tenant/api/features/registry.ts`.
3. Add `dWallet` to `PlatformPageFlags` in `src/entities/tenant/api/flags/platform-flags.ts`.
4. All API routes must check `canAccess('page.dWallet', gateContext)` before proceeding.
5. The widgets use `featureFlag: 'dWallet'` (already in the widget manifest spec above) — the widget renderer handles display gating automatically.

---

#### Phase F — Navigation & Full Page

**Goal:** Residents have a full dWallet page, not just a widget.

1. Create `src/app/dashboard/wallet/page.tsx` — full-page dWallet view with:
   - Full transaction history (paginated, filterable by type and date)
   - Consent management panel (all streams with descriptions)
   - Payout request form and payout history
   - Annual statement download button
   - Data export + deletion request section
2. Add "My Wallet" to the avatar dropdown menu in `src/shared/ui/Header.tsx` (behind `dWallet` feature flag).
3. Add "My Wallet" to the mobile burger menu `My Space` section in `src/shared/ui/MobileMenu.tsx` (behind `dWallet` feature flag).
4. Add the admin dWallet route link to the admin sidebar (System section).

---

### Hard Constraints for Every Phase

These are non-negotiable. Violating them creates legal or data integrity issues.

1. **WalletTransaction rows are immutable.** Never write an UPDATE or DELETE query against this table. Corrections use ADJUSTMENT transactions with a description explaining the change.
2. **DataConsent rows are append-only.** Consent changes are new rows, not updates. The current state is always the most recent row for a `(walletId, streamKey)` pair.
3. **Balance consistency.** After any credit or debit: `balanceAfter = balanceBefore + amount` (credits positive, debits negative). Always record both. The balance on the `DWallet` model must always equal the sum of all transactions.
4. **Batch operations use DB transactions.** A distribution run that credits 180 wallets must succeed atomically or fail atomically. Use Drizzle's `.transaction()` wrapper.
5. **No admin PII access.** Admin routes must never return individual resident wallet balances, consent choices, or transaction details. Aggregate counts and totals only. The only exception is `PayoutRequest` which shows the resident's name for payment processing purposes — and only to ADMIN / BOARD roles.
6. **Audit log on every consent change.** Use the existing Pino logger. The log line must include `userId`, `streamKey`, `granted`, `tenantId`, and the request IP.
7. **`tenantId` on every model.** All dWallet models carry `tenantId`. All queries must filter by `tenantId`. Do not rely on wallet ownership alone for isolation.

---

### Patterns to Follow

- **Auth:** `getSessionAndRole()` from `src/shared/api/auth-utils.ts`
- **DB:** Drizzle via `src/shared/api/db.ts` singleton — never instantiate Prisma client directly
- **API envelope:** `apiSuccess()` / `apiError()` from `src/shared/api/api-response.ts`
- **Validation:** Zod schemas defined in `src/entities/dwallet/schema.ts`, validated at the route handler entry point
- **Cache invalidation:** Call `revalidatePath('/dashboard')` after balance changes (from `src/shared/api/revalidation.ts`)
- **Logging:** Import from `src/shared/lib/logger.ts`
- **Error boundaries:** Wrap `DWalletSummaryWidget` in `ErrorBoundary` from `src/shared/ui/ErrorBoundary.tsx`
- **Loading states:** Use `LoadingSkeleton` while wallet data fetches

---

### BD Issues to Create

Create the following BD issues before starting implementation:

```
bd create "Phase A: dWallet schema and migration"
bd create "Phase B: dWallet API routes (resident + admin)"
bd create "Phase C: dWallet entity FSD structure"
bd create "Phase D: dWallet resident and admin widgets"
bd create "Phase E: dWallet feature gate integration"
bd create "Phase F: dWallet full page and navigation"
bd create "Confirm Schedule F Table 2 revenue share percentages with client"
```

The last issue is a blocker for production seeding but must not block Phase A–F development (use placeholder percentages from this spec).

---

### Known Integration Points to Verify

Before closing Phase B, confirm the following with `grep` or direct inspection:

```bash
# Verify Drizzle singleton is used (not Prisma) in all new route files
grep -r "prisma\." src/app/api/v1/tenant/dwallet/ src/app/api/admin/dwallet/
# Should return empty. All queries go through Drizzle.

# Verify tenantId filter is present in every Drizzle query
grep -r "tenantId" src/entities/dwallet/api/
# Should appear in every query function.

# Verify apiSuccess/apiError envelope
grep -r "apiSuccess\|apiError" src/app/api/v1/tenant/dwallet/ src/app/api/admin/dwallet/
# Should appear in every route.
```

---

### Ubiquitous Language Additions

Add the following entries to `docs/UBIQUITOUS_LANGUAGE.md` when Phase A is complete:

| Term                    | Definition                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| **dWallet**             | A per-resident data rights and rewards wallet. Tracks consent, reward credits, and payout requests.          |
| **Revenue Stream**      | A defined category of data use that generates resident rewards (e.g., `anonymised_analytics`).               |
| **DataConsent**         | An append-only record of a resident's decision to grant or revoke consent for a specific revenue stream.     |
| **WalletTransaction**   | An immutable ledger entry recording a CREDIT, DEBIT, ROLLOVER, or ADJUSTMENT to a resident's wallet balance. |
| **Distribution Batch**  | A single run of the reward distribution algorithm for one stream, one period, and one tenant.                |
| **Payout Request**      | A resident-initiated request to disburse their wallet balance to an external payment method.                 |
| **Resident Data Share** | The percentage of revenue from a data stream returned to participating residents via their dWallet.          |

---

_End of DWALLET_SPEC.md_
