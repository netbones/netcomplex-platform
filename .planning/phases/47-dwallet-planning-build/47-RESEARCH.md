# Phase 47: dWallet Planning & Build — Research

**Researched:** 2026-06-25
**Domain:** Data rights wallet, granular consent, double-entry ledger, revenue-share rewards
**Confidence:** HIGH

## Summary

The dWallet is the headline anchor-tenant selling point for Soralia Village (180 homes) — a per-resident data rights, consent, and rewards wallet built as a true double-entry ledger from day one. This module is legally required by Schedule G of the SaaS License Agreement and must comply with POPIA and LGPD principles.

The implementation scope is defined in `docs/architecture/DWALLET_SPEC.md` and decomposed into six sub-phases (A–F) per `47-CONTEXT.md`:

- **A:** Schema & migration — 6 new Prisma models, 4 enums, seed data
- **B:** API layer — 10 resident + 7 admin REST routes with Zod validation
- **C:** Entity FSD structure — `src/entities/dwallet/` with types, hooks, helpers
- **D:** Widgets — `dwallet-summary` (resident) + `admin-dwallet` (admin)
- **E:** Feature gate integration — `dWallet` PlatformModule, 6 FeatureRegistry keys
- **F:** Full page + navigation — `/dashboard/wallet`, header/mobile/admin nav entries

**Primary recommendation:** Follow the existing resource module pattern for API routes, DB access, and FSD structure — the codebase has strongly established conventions that make this a template-following exercise rather than a greenfield design. The critical compliance requirement is the double-entry ledger design where `WalletTransaction` rows are immutable and balance is always derived.

## User Constraints (from CONTEXT.md)

### Locked Decisions

1. `WalletTransaction` rows are immutable — corrections are `ADJUSTMENT` rows, never UPDATE/DELETE
2. `DataConsent` rows are append-only — current state = most recent row per `(walletId, streamKey)`
3. `balanceAfter = balanceBefore + amount` — both recorded. `DWallet.balance` always equals `SUM(transactions.amount)`
4. **Double-entry ledger (BILLING.md Domain 3):** WalletTransaction IS the ledger — balance is derived, never mutated directly
5. Distribution batches use Drizzle `.transaction()` — succeed or fail atomically
6. Admin routes never return individual wallet balances, consent choices, or transaction details
7. Pino audit log on every consent change with `{ event: 'consent_change', userId, streamKey, granted, tenantId, ip }`
8. `tenantId` on every dWallet model — all queries filter by `tenantId`
9. Sub-phase decomposition: A → (B | C) → D → E → F
10. Auth via `getSessionAndRole()` from `src/shared/api/auth-utils.ts`
11. DB via Drizzle singleton from `src/shared/api/db.ts` — never instantiate Prisma directly
12. API envelope via `apiSuccess()` / `apiError()` from `src/shared/api/api-response.ts`
13. Validation via Zod schemas in `src/entities/dwallet/schema.ts`
14. Feature gate: `canAccess('page.dWallet', gateContext)` on all routes

### the agent's Discretion

- Specific wave ordering within sub-phases (suggested: Wave 1 = A+C, Wave 2 = B+E, Wave 3 = D, Wave 4 = F)
- Widget UI design details (within privacy constraints)
- Exact Zod schema field definitions (within spec requirements)
- Error message wording (within ERROR_CODES taxonomy)
- Seed data placeholder values (within spec-specified percentages)

### Deferred Ideas (OUT OF SCOPE)

- Schedule F Table 2 confirmation (separate BD issue; blocks production seeding, not development)
- Actual EFT / PayFast disbursement integration (Phase 2)
- Community Benefit Fund as a separate ledger model (counter in `Tenant.featureFlags` for now)
- Push notifications on reward receipt (Phase 2)
- Multi-currency support (ZAR only in Phase 1)
- NetBones Privacy-as-a-Service integration (was a misframing; dWallet is the privacy module)
- 7-day production soak (deferred to its own phase)
- Performance baseline (M5b soak period)

## Architectural Responsibility Map

| Capability                                | Primary Tier       | Secondary Tier     | Rationale                                                                                  |
| ----------------------------------------- | ------------------ | ------------------ | ------------------------------------------------------------------------------------------ |
| Schema & migrations (6 models + 4 enums)  | Database / Storage | —                  | Prisma models with Drizzle schema generation                                               |
| Wallet creation & balance tracking        | Database / Storage | API / Backend      | DWallet model holds cached balance; API routes manage lifecycle                            |
| Transaction ledger (immutable)            | Database / Storage | —                  | WalletTransaction IS the ledger; immutable at DB level                                     |
| Consent management (append-only)          | Database / Storage | API / Backend      | DataConsent rows are append-only; API routes enforce                                       |
| Payout requests                           | API / Backend      | Database / Storage | Resident initiates via API; admin processes via API                                        |
| Revenue stream configuration              | API / Backend      | Database / Storage | Admin-managed tenant-level config                                                          |
| Distribution batch processing             | API / Backend      | Database / Storage | Atomic batch runs via Drizzle `.transaction()`                                             |
| Resident wallet widget                    | Browser / Client   | API / Backend      | React widget fetching from resident API routes                                             |
| Admin wallet widget                       | Browser / Client   | API / Backend      | React widget fetching from admin API routes (aggregate data only)                          |
| Feature gate enforcement                  | API / Backend      | Browser / Client   | Server-side `canAccess()` is source of truth; client uses `featureFlag` on widget manifest |
| Audit logging (consent changes)           | API / Backend      | —                  | Pino structured logs; server-side only                                                     |
| Data export (JSON/CSV)                    | API / Backend      | Database / Storage | Server-side generation, delivered via signed URL                                           |
| Deletion request (POPIA right-to-erasure) | API / Backend      | Database / Storage | Anonymise in-place, move wallet to CLOSED                                                  |

## Standard Stack

### Core

| Library                  | Version                                   | Purpose                                 | Why Standard                                        |
| ------------------------ | ----------------------------------------- | --------------------------------------- | --------------------------------------------------- |
| Prisma                   | 5.22.0 [VERIFIED: local CLI]              | Schema definition, migration generation | Existing project standard                           |
| Drizzle ORM              | (via prisma-generator-drizzle)            | All DB queries                          | Existing project standard; edge-compatible          |
| Zod                      | (existing in project)                     | Request/response validation             | Existing project standard                           |
| Next.js                  | 14 (App Router)                           | API routes, page rendering              | Existing project standard                           |
| Pino                     | (existing via `src/shared/lib/logger.ts`) | Audit logging for consent changes       | Existing project standard                           |
| PostgreSQL               | (Supabase)                                | Database                                | Existing project standard                           |
| Drizzle `.transaction()` | (built-in)                                | Atomic batch operations                 | Existing pattern; required for distribution batches |

### Supporting

| Library                                             | Version    | Purpose                                         | When to Use                      |
| --------------------------------------------------- | ---------- | ----------------------------------------------- | -------------------------------- |
| `lucide-react` `Wallet` icon                        | (existing) | Widget icon                                     | Widget registration manifest     |
| `react-hook-form`                                   | (existing) | Forms in admin widget (distribution batch form) | Admin distribution trigger form  |
| `TanStack Query`                                    | (existing) | Client-side data fetching in widgets            | Widget data fetching and caching |
| `ErrorBoundary` (`src/shared/ui/ErrorBoundary.tsx`) | (existing) | Widget error resilience                         | Wrap DWalletSummaryWidget        |
| `LoadingSkeleton`                                   | (existing) | Loading states                                  | While wallet data fetches        |
| `revalidatePath` (`next/cache`)                     | (built-in) | Cache invalidation after balance changes        | After credits/debits/payouts     |

### Alternatives Considered

| Instead of             | Could Use                         | Tradeoff                                                                                                           |
| ---------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Hand-written SQL       | Drizzle ORM                       | Drizzle is the existing standard; hand-written SQL would violate project conventions                               |
| Prisma client directly | Drizzle (via `db` singleton)      | Prisma client is explicitly forbidden for dWallet routes per spec; Drizzle is edge-compatible                      |
| JS float for currency  | PostgreSQL `DECIMAL(12,2)`        | Floats cause rounding errors in financial calculations; DECIMAL is precise and used throughout existing project    |
| Mutation-based balance | Derived balance from transactions | Direct mutation violates double-entry ledger requirement (BILLING.md Domain 3); immutable ledger is non-negotiable |

**Installation:**

```bash
# No new packages required — dWallet is built entirely on the existing stack.
# After adding Prisma models, regenerate Drizzle schemas:
npx prisma generate

# Verify:
pnpm typecheck
```

## Package Legitimacy Audit

No new packages are introduced in this phase. The dWallet module is built entirely on the existing project stack (Prisma, Drizzle, Zod, Next.js, Pino, lucide-react, react-hook-form, TanStack Query). All patterns follow existing codebase conventions.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
                           ┌──────────────────────────────────────┐
                           │          Resident Browser            │
                           │                                      │
                           │  ┌─────────────────────────────┐    │
                           │  │   DWalletSummaryWidget       │    │
                           │  │   (Balance, Consents,        │    │
                           │  │    Recent Rewards, Payout)   │    │
                           │  └──────────┬──────────────────┘    │
                           │             │                        │
                           │  ┌──────────▼──────────────────┐    │
                           │  │   /dashboard/wallet/page.tsx │    │
                           │  │   (Full ledger, all consents│    │
                           │  │    export, deletion request) │    │
                           │  └─────────────────────────────┘    │
                           └──────────────┬───────────────────────┘
                                          │ HTTP
                           ┌──────────────▼───────────────────────┐
                           │          API / Backend               │
                           │                                      │
                           │  ┌──────────────────────────────┐   │
                           │  │  canAccess('page.dWallet')    │   │
                           │  │  (Gate — 5-layer precedence)  │   │
                           │  └──────────────┬───────────────┘   │
                           │                 │                    │
                           │  ┌──────────────▼───────────────┐   │
                           │  │  Resident Routes              │   │
                           │  │  /api/v1/tenant/dwallet/*     │   │
                           │  │  (10 routes: wallet, txns,   │   │
                           │  │   consents, payout, export,   │   │
                           │  │   deletion, streams, stmt)    │   │
                           │  └──────────────┬───────────────┘   │
                           │                 │                    │
                           │  ┌──────────────▼───────────────┐   │
                           │  │  Admin Routes                 │   │
                           │  │  /api/admin/dwallet/*         │   │
                           │  │  (7 routes: stats, batches,   │   │
                           │  │   payouts, streams)           │   │
                           │  └──────────────┬───────────────┘   │
                           │                 │                    │
                           │  ┌──────────────▼───────────────┐   │
                           │  │  getOrCreateWallet() helper   │   │
                           │  │  + Zod validation + Drizzle   │   │
                           │  └──────────────┬───────────────┘   │
                           │                 │                    │
                           │  ┌──────────────▼───────────────┐   │
                           │  │  Pino Audit Logger            │   │
                           │  │  (consent_change events)      │   │
                           │  └──────────────────────────────┘   │
                           └──────────────┬───────────────────────┘
                                          │ Drizzle ORM
                           ┌──────────────▼───────────────────────┐
                           │       Database / Storage             │
                           │                                      │
                           │  DWallet (1:1 per user)              │
                           │  │  └─ balance (cached, derived)     │
                           │  │                                   │
                           │  WalletTransaction (immutable)       │
                           │  │  └─ balanceBefore → balanceAfter  │
                           │  │     (double-entry ledger)         │
                           │  │                                   │
                           │  DataConsent (append-only)           │
                           │  │  └─ current = latest row          │
                           │  │                                   │
                           │  PayoutRequest (resident-initiated)  │
                           │  DataRevenueStream (tenant config)   │
                           │  DataShareBatch (distribution run)   │
                           │                                      │
                           │  All models carry tenantId           │
                           └──────────────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── entities/dwallet/            # FSD entity (Phase C)
│   ├── index.ts                 # Barrel export
│   ├── schema.ts                # Zod schemas for all request/response shapes
│   ├── model/
│   │   ├── types.ts             # TypeScript interfaces (DWalletSummary, ConsentState, etc.)
│   │   └── useWallet.ts         # Client hook
│   └── api/
│       └── index.ts             # Server-side helpers (getOrCreateWallet, getConsentState)
├── app/api/
│   ├── v1/tenant/dwallet/       # Resident routes (Phase B)
│   │   ├── route.ts             # GET / — own wallet summary
│   │   ├── transactions/route.ts
│   │   ├── consents/route.ts
│   │   ├── consents/[streamKey]/route.ts  # POST — critical route
│   │   ├── payout/route.ts
│   │   ├── export/route.ts
│   │   ├── deletion-request/route.ts
│   │   ├── streams/route.ts
│   │   └── statement/route.ts
│   └── admin/dwallet/           # Admin routes (Phase B)
│       ├── stats/route.ts
│       ├── batches/route.ts     # GET + POST
│       ├── payouts/route.ts     # GET
│       ├── payouts/[id]/route.ts # PATCH
│       └── streams/route.ts     # GET + POST
│       └── streams/[id]/route.ts # PATCH
├── app/dashboard/wallet/
│   └── page.tsx                 # Full dWallet page (Phase F)
├── entities/dwallet/ui/         # Widget components (Phase D)
│   ├── DWalletSummaryWidget.tsx
│   └── DWalletAdminWidget.tsx
├── db/schema/                   # Drizzle schema files (auto-generated Phase A)
│   ├── d-wallets.ts
│   ├── d-wallets-relations.ts
│   ├── wallet-transactions.ts
│   ├── wallet-transactions-relations.ts
│   ├── data-consents.ts
│   ├── data-consents-relations.ts
│   ├── payout-requests.ts
│   ├── payout-requests-relations.ts
│   ├── data-revenue-streams.ts
│   ├── data-revenue-streams-relations.ts
│   ├── data-share-batches.ts
│   └── data-share-batches-relations.ts
└── prisma/
    ├── schema.prisma            # 6 new models + 4 enums (additive)
    ├── seed/modules.ts          # dWallet PlatformModule seed entry
    └── migrations/
        └── <timestamp>_add_dwallet_module/
            └── migration.sql
```

### Pattern 1: API Route (Resident — Following Existing `resources` Pattern)

**What:** Export named `GET`/`POST`/`PATCH` handlers using `withErrorHandler`, `getSessionAndRole`, `withTenant`, Drizzle queries, and `apiSuccess`/`apiError` envelopes.

**When to use:** All 17 dWallet API routes.

**Example:**

```typescript
// Source: DWALLET_SPEC.md §10 + existing src/app/api/resources/route.ts pattern
import {
  auth, db, dWallets, walletTransactions,
  apiSuccess, apiError, apiUnauthorized, apiForbidden,
  withErrorHandler, now,
} from '@api/server'; // (after adding dWallet tables to barrel)

import { eq, and, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

export const maxDuration = 8;

export const GET = withErrorHandler(async (request: Request) => {
  const sessionData = await getSessionAndRole(request);
  if (!sessionData) return apiUnauthorized();

  const { tenantId } = await withTenant();

  // Gate check
  const gate = await canAccess(
    { tenantId, role: sessionData.role, tier: /* from resolveGateContext */ },
    'page.dWallet'
  );
  if (!gate.allowed) return apiForbidden();

  const [wallet] = await db
    .select()
    .from(dWallets)
    .where(and(eq(dWallets.tenantId, tenantId), eq(dWallets.userId, sessionData.userId)))
    .limit(1);

  if (!wallet) return apiError('NOT_FOUND', 'No wallet found', 404);

  return apiSuccess(wallet);
});
```

### Pattern 2: Double-Entry Ledger Transaction (Critical Compliance Pattern)

**What:** Every financial operation creates a `WalletTransaction` row with `balanceBefore` and `balanceAfter`. Balance is derived via `SUM(transactions.amount)`, never mutated directly.

**When to use:** Every credit (reward distribution), debit (payout complete), rollover, or adjustment.

**Example:**

```typescript
// Source: BILLING.md Domain 3 + DWALLET_SPEC.md WalletTransaction design note
async function creditWallet(
  tx: typeof db, // Drizzle transaction
  walletId: string,
  tenantId: string,
  amount: Decimal,
  description: string,
  referenceId?: string,
  referenceType?: string
) {
  // 1. Lock and read current wallet state
  const [wallet] = await tx
    .select()
    .from(dWallets)
    .where(and(eq(dWallets.id, walletId), eq(dWallets.tenantId, tenantId)))
    .for('update'); // Row-level lock for consistency

  const balanceBefore = wallet.balance;
  const balanceAfter = new Decimal(balanceBefore).plus(amount);

  // 2. Insert immutable transaction record
  await tx.insert(walletTransactions).values({
    id: crypto.randomUUID(),
    tenantId,
    walletId,
    type: 'CREDIT',
    amount: amount.toString(),
    currency: 'ZAR',
    description,
    referenceId: referenceId ?? null,
    referenceType: referenceType ?? null,
    balanceBefore: balanceBefore.toString(),
    balanceAfter: balanceAfter.toString(),
    createdAt: now(),
  });

  // 3. Update cached balance on DWallet
  await tx
    .update(dWallets)
    .set({
      balance: balanceAfter.toString(),
      lifetimeEarned: new Decimal(wallet.lifetimeEarned).plus(amount).toString(),
      updatedAt: now(),
    })
    .where(and(eq(dWallets.id, walletId), eq(dWallets.tenantId, tenantId)));

  return { balanceBefore, balanceAfter };
}
```

### Pattern 3: Consent Management (Append-Only)

**What:** Consent changes create new `DataConsent` rows, never UPDATE existing ones. Current state = most recent row per `(walletId, streamKey)` pair.

**When to use:** `POST /consents/:streamKey` route.

**Example:**

```typescript
// Source: DWALLET_SPEC.md §4 + §B.4
export const POST = withErrorHandler(
  async (request: Request, { params }: { params: { streamKey: string } }) => {
    const sessionData = await getSessionAndRole(request);
    if (!sessionData) return apiUnauthorized();

    const { tenantId } = await withTenant();
    const body = consentSchema.parse(await request.json()); // Zod: { granted: boolean }
    const { streamKey } = params;

    // Upsert wallet if not exists
    const wallet = await getOrCreateWallet(sessionData.userId, tenantId);

    // Insert new consent row (append-only — never UPDATE)
    await db.insert(dataConsents).values({
      id: crypto.randomUUID(),
      tenantId,
      walletId: wallet.id,
      userId: sessionData.userId,
      streamKey,
      granted: body.granted,
      ipAddress: request.headers.get('x-forwarded-for') ?? null,
      userAgent: request.headers.get('user-agent') ?? null,
      grantedAt: body.granted ? now() : null,
      revokedAt: body.granted ? null : now(),
      createdAt: now(),
    });

    // Pino audit log (mandatory)
    logger.info({
      event: 'consent_change',
      userId: sessionData.userId,
      streamKey,
      granted: body.granted,
      tenantId,
      ip: request.headers.get('x-forwarded-for'),
    });

    return apiSuccess({ streamKey, granted: body.granted });
  }
);
```

### Pattern 4: Atomic Batch Distribution

**What:** Distribution runs credit all opted-in wallets atomically via Drizzle `.transaction()`.

**When to use:** `POST /admin/dwallet/batches`.

**Example:**

```typescript
// Source: DWALLET_SPEC.md §5 + §B.7
export const POST = withErrorHandler(async (request: Request) => {
  const sessionData = await getSessionAndRole(request);
  if (!sessionData) return apiUnauthorized();
  if (!hasPermission(sessionData.role, 'admin')) return apiForbidden();

  const { tenantId } = await withTenant();
  const body = batchSchema.parse(await request.json());

  // Read stream config
  const stream = await getStreamConfig(tenantId, body.streamKey);
  const residentPool = new Decimal(body.totalRevenue).times(stream.residentSharePct).div(100);

  // Get opted-in wallets (latest consent per wallet where granted = true)
  const optedInWallets = await getOptedInWallets(tenantId, body.streamKey);

  if (optedInWallets.length === 0) {
    return apiError('VALIDATION_ERROR', 'No opted-in wallets for this stream', 400);
  }

  const perResidentAmount = residentPool.div(optedInWallets.length);
  const batchId = crypto.randomUUID();

  // Atomic transaction — all or nothing
  try {
    await db.transaction(async tx => {
      for (const wallet of optedInWallets) {
        await creditWallet(
          tx,
          wallet.id,
          tenantId,
          perResidentAmount,
          `Data share: ${stream.label} (${body.periodStart}–${body.periodEnd})`,
          batchId,
          'data_share_batch'
        );
      }

      await tx.insert(dataShareBatches).values({
        id: batchId,
        tenantId,
        periodStart: new Date(body.periodStart),
        periodEnd: new Date(body.periodEnd),
        streamKey: body.streamKey,
        totalRevenue: body.totalRevenue,
        residentPool: residentPool.toString(),
        participantCount: optedInWallets.length,
        status: 'COMPLETED',
        processedAt: now(),
        processedBy: sessionData.userId,
        createdAt: now(),
      });
    });
  } catch (error) {
    // Batch FAILED — no partial credits applied
    await db.insert(dataShareBatches).values({
      id: batchId,
      tenantId,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
      streamKey: body.streamKey,
      totalRevenue: body.totalRevenue,
      residentPool: residentPool.toString(),
      participantCount: optedInWallets.length,
      status: 'FAILED',
      notes: String(error),
      createdAt: now(),
    });
    return apiError('INTERNAL_ERROR', 'Batch distribution failed — no credits applied', 500);
  }

  revalidateDashboard();
  return apiSuccess({ batchId, participantCount: optedInWallets.length, perResidentAmount });
});
```

### Anti-Patterns to Avoid

- **Direct balance mutation:** `wallet.balance += amount` — use WalletTransaction rows and derive balance. Violates BILLING.md Domain 3 double-entry requirement.
- **UPDATE/DELETE on WalletTransaction:** Corrections are ADJUSTMENT rows, never modify existing rows. Violates immutability constraint.
- **UPDATE on DataConsent:** Consent changes are new rows. Current state = latest row per (walletId, streamKey). Violates append-only constraint.
- **Prisma client in routes:** Use Drizzle via `db` singleton. Prisma client is forbidden per spec integration verification.
- **Missing tenantId filter:** Every query must include `tenantId`. Do not rely on wallet ownership alone.
- **Admin routes exposing PII:** Admin routes must return aggregate counts/totals only, never individual balances or consent choices.
- **Float math for ZAR amounts:** Use PostgreSQL `DECIMAL(12,2)` and JavaScript `Decimal` strings. JS float causes rounding errors.
- **Non-atomic batch operations:** Distribution runs must use Drizzle `.transaction()`. Partial credits on failure are a data integrity violation.

## Don't Hand-Roll

| Problem                       | Don't Build                                 | Use Instead                                                 | Why                                                                                                                                                                                                                                                     |
| ----------------------------- | ------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decimal math for ZAR          | JS `number` / `float`                       | PostgreSQL `DECIMAL(12,2)` + string-based `Decimal` in JS   | JS floats cause rounding errors in financial calculations (e.g., `0.1 + 0.2 !== 0.3`) [CITED: Prisma schema conventions — all financial fields use @db.Decimal]                                                                                         |
| Immutable transaction records | Manual soft-delete flags                    | Append-only design — no UPDATE/DELETE on WalletTransaction  | Legal requirement (Schedule G). Immutable ledger is a compliance necessity, not an implementation choice. [CITED: DWALLET_SPEC.md §12]                                                                                                                  |
| Atomic batch operations       | Promise.all with manual rollback            | Drizzle `.transaction()`                                    | Atomic commit/rollback is a database primitive — manual rollback in JS is fragile and racy. Existing codebase uses `.transaction()` for critical paths (onboarding settings, suspension, RLS). [VERIFIED: codebase — src/shared/api/db.ts `runWithRLS`] |
| Audit logging                 | Custom audit table or ad-hoc logging        | Pino structured logger (`src/shared/lib/logger.ts`)         | Existing project standard. Structured logs are searchable and compatible with existing observability stack. [VERIFIED: codebase — logger import pattern]                                                                                                |
| Consent state tracking        | Mutable `consent` field on wallet           | Append-only `DataConsent` rows (latest row = current state) | Legal requirement (Schedule G4 — 5-year retention). Append-only provides full audit trail. [CITED: DWALLET_SPEC.md §4]                                                                                                                                  |
| Wallet lookup in routes       | Duplicated upsert logic                     | `getOrCreateWallet()` helper (Phase C)                      | Single source of truth for wallet creation/retrieval. Prevents scattered upsert logic with inconsistent defaults. [CITED: DWALLET_SPEC.md §C]                                                                                                           |
| Feature gate checks           | `isModuleEnabled()` or `TierGuard` directly | `canAccess('page.dWallet', gateContext)`                    | Phase 41 consolidated gate system — canonical entry point. Legacy guards will be deprecated. [CITED: DWALLET_SPEC.md §11 + Phase 41 decisions]                                                                                                          |
| API response formatting       | Raw `NextResponse.json()`                   | `apiSuccess()` / `apiError()` envelope                      | Existing project standard (Phase 35). Consistent error codes and metadata shape. [VERIFIED: codebase — src/shared/api/api-response.ts]                                                                                                                  |

## Runtime State Inventory

Skipped — this is a greenfield module addition, not a rename/refactor/migration phase. No existing runtime state to inventory.

## Common Pitfalls

### Pitfall 1: Currency Precision Loss

**What goes wrong:** Using JavaScript `number` for ZAR amounts causes floating-point rounding errors (e.g., `0.1 + 0.2 = 0.30000000000000004`). Accumulated across 180 wallets, these errors compound.

**Why it happens:** JavaScript's IEEE 754 floating-point cannot represent decimal fractions exactly.

**How to avoid:** Store all amounts as PostgreSQL `DECIMAL(12,2)`. In JavaScript, use string-based `Decimal` operations (e.g., `new Decimal(balance).plus(amount)`). Drizzle maps `DECIMAL` to `string` in TypeScript. [VERIFIED: codebase — all financial fields use `@db.Decimal(10,2)` or `@db.Decimal(12,2)`]

**Warning signs:** `balanceAfter !== balanceBefore + amount` after credit/debit operations during testing.

### Pitfall 2: Balance Drift (Cached Balance vs. Derived Balance)

**What goes wrong:** `DWallet.balance` (cached) diverges from `SUM(WalletTransaction.amount)` (derived truth). Wallet appears to have more/less than actual.

**Why it happens:** Direct mutation of `DWallet.balance` without creating corresponding `WalletTransaction` rows, or transaction creation without updating the cached balance.

**How to avoid:** Always update both together in a Drizzle transaction. Add a reconciliation test that verifies `wallet.balance === SUM(transactions.amount)` for every wallet. Never update balance outside of a transaction that also creates a WalletTransaction row.

**Warning signs:** Reconciliation test fails. Audit log shows balance changes without corresponding transactions.

### Pitfall 3: Admin Route Data Leak

**What goes wrong:** Admin routes accidentally return individual wallet balances, consent choices, or transaction details. This violates the spec's hard constraint #5 and creates a POPIA compliance issue.

**Why it happens:** Reusing resident-facing query functions in admin routes without aggregating/filtering.

**How to avoid:** Admin routes must use separate query functions that return only aggregate data (counts, totals, date ranges). Never reuse resident-facing query functions (which return individual data) in admin routes. The only exception is `PayoutRequest` which may show resident name for payment processing (ADMIN/BOARD only).

**Warning signs:** `grep "balance" src/app/api/admin/dwallet/` returns hits in response data. Admin widget renders individual transaction details.

### Pitfall 4: Tenant Isolation Bypass

**What goes wrong:** Queries filter only by `walletId` or `userId`, allowing cross-tenant data access via manipulated IDs.

**Why it happens:** Assuming wallet ownership alone provides tenant isolation. But userId is scoped within tenant context.

**How to avoid:** Every query must include `tenantId` in its WHERE clause. Follow the pattern: `eq(table.tenantId, tenantId)`. The spec explicitly requires: "Do not rely on wallet ownership alone for tenant isolation."

**Warning signs:** `grep "tenantId" src/app/api/v1/tenant/dwallet/` shows missing filters in some queries.

### Pitfall 5: Prisma Client Usage in Routes

**What goes wrong:** Route handlers import and use `@prisma/client` directly instead of the Drizzle singleton.

**Why it happens:** Developer habit or copy-paste from non-dWallet code.

**How to avoid:** All dWallet route files must use `import { db, ... } from '@api/server'`. The integration verification grep `grep -r "prisma\." src/app/api/v1/tenant/dwallet/ src/app/api/admin/dwallet/` must return empty.

**Warning signs:** The integration verification grep returns matches.

## Code Examples

Verified patterns from the existing codebase (all exist and are tested):

### API Route Pattern (from `src/app/api/resources/route.ts`)

```typescript
// Source: src/app/api/resources/route.ts [VERIFIED: codebase]
import {
  auth,
  db,
  resources,
  users,
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
  withErrorHandler,
  now,
} from '@api/server';
import { eq, and, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';

export const maxDuration = 8;

export const GET = withErrorHandler(async (request: Request) => {
  const authData = await getSessionAndRole(request);
  const role = authData?.role || null;
  const { tenantId } = await withTenant();
  // ... query with tenantId filter ...
  return apiSuccess(results);
});

export const POST = withErrorHandler(async (request: Request) => {
  const authData = await getSessionAndRole(request);
  if (!authData) return apiUnauthorized();
  if (!hasPermission(authData.role, 'content')) return apiForbidden();
  const { tenantId } = await withTenant();
  // ... insert with tenantId ...
  return apiCreated(result);
});
```

### Widget Registration Pattern (from `src/widgets/dashboard/model/widgets.ts`)

```typescript
// Source: src/widgets/dashboard/model/widgets.ts [VERIFIED: codebase]
registry.register({
  id: 'dwallet-summary',
  version: '1.0.0',
  name: 'My Data Wallet',
  description: 'Current balance, recent rewards, and consent status',
  category: 'core',
  icon: Wallet, // from lucide-react
  featureFlag: 'dWallet', // widget renderer auto-gates display
  component: lazy(() =>
    import('../ui/DWalletSummaryWidget').then(m => ({ default: m.DWalletSummaryWidget }))
  ),
  defaultSize: { width: 2, height: 2 },
  minSize: { width: 1, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
  spaces: ['home'], // Focus Spaces — home space for residents
});
```

### Drizzle Transaction Pattern (from `src/shared/api/db.ts`)

```typescript
// Source: src/shared/api/db.ts runWithRLS() [VERIFIED: codebase]
// For batch distribution: use db.transaction()
await db.transaction(async (tx) => {
  // All operations within this callback succeed or fail atomically
  await tx.insert(dataShareBatches).values({...});
  for (const wallet of optedInWallets) {
    await tx.insert(walletTransactions).values({...});
    await tx.update(dWallets).set({...}).where(...);
  }
});
```

## State of the Art

| Old Approach                      | Current Approach                          | When Changed              | Impact                                                                                                               |
| --------------------------------- | ----------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `isModuleEnabled()` / `TierGuard` | `canAccess()` (5-layer precedence)        | Phase 41                  | dWallet MUST use `canAccess()` — legacy guards will be deprecated                                                    |
| `NextResponse.json()`             | `apiSuccess()` / `apiError()` envelope    | Phase 35                  | All dWallet routes must use the canonical envelope                                                                   |
| Prisma client direct              | Drizzle ORM via `db` singleton            | Incremental (many phases) | dWallet routes must use Drizzle — integration grep will verify                                                       |
| Hardcoded role checks             | `hasPermission()` / `getSessionAndRole()` | Phase 19                  | dWallet must use canonical auth utilities                                                                            |
| `usePageFlags` hook               | `useGateContext()` / `canAccessClient()`  | Phase 41                  | Client-side dWallet features should use the new gate system (though widgets auto-gate via `featureFlag` on manifest) |

**Deprecated/outdated:**

- `isModuleEnabled()` for individual feature checks — use `canAccess()` instead
- Direct Prisma client import — use `db` from `@api/server`
- `NextResponse.json()` for API responses — use `apiSuccess()`/`apiError()` envelope
- Balance mutation via direct field update — use WalletTransaction append-only pattern

## Validation Architecture

### Test Framework

| Property           | Value                               |
| ------------------ | ----------------------------------- |
| Framework          | Vitest (existing project standard)  |
| Config file        | `vitest.config.ts` (existing)       |
| Quick run command  | `pnpm vitest run src/test/dwallet/` |
| Full suite command | `pnpm test`                         |

### Phase Requirements → Test Map

| Req ID      | Behavior                                                                                    | Test Type   | Automated Command                                                                       | File Exists? |
| ----------- | ------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------- | ------------ |
| B-CONSENT   | Consent creation creates new DataConsent row, not update                                    | unit        | `pnpm vitest run src/test/dwallet/consent.test.ts -t "creates new consent"`             | ❌ Wave 0    |
| B-THRESHOLD | Payout request rejected when balance < R50                                                  | unit        | `pnpm vitest run src/test/dwallet/payout.test.ts -t "rejects below threshold"`          | ❌ Wave 0    |
| B-BATCH     | Batch distribution math: pool = totalRevenue × sharePct, per-resident = pool / participants | unit        | `pnpm vitest run src/test/dwallet/batch.test.ts -t "calculates distribution correctly"` | ❌ Wave 0    |
| B-LEDGER    | balanceAfter = balanceBefore + amount after credit/debit                                    | unit        | `pnpm vitest run src/test/dwallet/ledger.test.ts -t "balance consistency"`              | ❌ Wave 0    |
| B-ISOLATION | Query returns only tenant-scoped data                                                       | integration | `pnpm vitest run src/test/dwallet/isolation.test.ts`                                    | ❌ Wave 0    |
| B-IMMUTABLE | Attempting to UPDATE WalletTransaction fails                                                | unit        | `pnpm vitest run src/test/dwallet/immutable.test.ts`                                    | ❌ Wave 0    |
| B-ATOMIC    | Failed batch distribution rolls back all credits                                            | unit        | `pnpm vitest run src/test/dwallet/batch.test.ts -t "atomic rollback"`                   | ❌ Wave 0    |

### Sampling Rate

- **Per task commit:** `pnpm vitest run src/test/dwallet/` (must pass)
- **Per wave merge:** `pnpm test` (full suite)
- **Phase gate:** `pnpm typecheck && pnpm lint && pnpm test` all green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/test/dwallet/consent.test.ts` — covers consent creation, latest-row semantics
- [ ] `src/test/dwallet/payout.test.ts` — covers minimum threshold rejection, status flow
- [ ] `src/test/dwallet/batch.test.ts` — covers distribution math, atomic rollback
- [ ] `src/test/dwallet/ledger.test.ts` — covers balance consistency invariant
- [ ] `src/test/dwallet/immutable.test.ts` — covers WalletTransaction immutability
- [ ] `src/test/dwallet/isolation.test.ts` — covers tenantId filter enforcement
- [ ] Test fixtures: mock wallet, transactions, consents — colocate in `src/test/dwallet/fixtures.ts`
- [ ] Vitest config: ensure `src/test/dwallet/` is included in test paths

## Security Domain

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                                                                                                                        |
| --------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| V2 Authentication     | yes     | `getSessionAndRole()` from `src/shared/api/auth-utils.ts` — all routes auth-gated                                                       |
| V3 Session Management | yes     | Better Auth sessions — existing project auth layer                                                                                      |
| V4 Access Control     | yes     | `canAccess('page.dWallet', gateContext)` on all routes + `hasPermission()` for role checks                                              |
| V5 Input Validation   | yes     | Zod schemas in `src/entities/dwallet/schema.ts` — validated at route entry                                                              |
| V6 Cryptography       | no      | No custom cryptography — dWallet uses existing auth; data export uses Supabase Storage signed URLs                                      |
| V7 Error Handling     | yes     | `apiError()` with canonical error codes from `ERROR_CODES` taxonomy                                                                     |
| V8 Data Protection    | yes     | Append-only consent (immutable audit trail), 5-year retention (Schedule G4), PII anonymisation on deletion, admin routes aggregate-only |

### Known Threat Patterns for Multi-Tenant Wallet

| Pattern                                            | STRIDE                 | Standard Mitigation                                                                                   |
| -------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------- |
| Tenant isolation bypass via wallet ID manipulation | Spoofing / Elevation   | `tenantId` filter on EVERY query — do not rely on wallet ownership alone                              |
| Balance tampering via direct DB access             | Tampering              | Immutable WalletTransaction rows; balance always derivable from SUM(transactions) for reconciliation  |
| Admin viewing resident PII                         | Information Disclosure | Admin routes return aggregate counts/totals only; no individual balances or consent choices           |
| Consent forgery / replay                           | Spoofing               | Append-only DataConsent rows; Pino audit log on every change with IP; no UPDATE on existing rows      |
| Double-spend on distribution                       | Tampering / Denial     | Atomic batch via Drizzle `.transaction()` — all credits or none                                       |
| Unauthorized payout approval                       | Elevation of Privilege | `hasPermission(role, 'admin')` check on PATCH /payouts/:id; `processedBy` field records acting admin  |
| Export enumeration                                 | Information Disclosure | Export request requires authenticated session; no unauthenticated access                              |
| Float precision manipulation                       | Tampering              | `DECIMAL(12,2)` at DB level; string-based Decimal in JS — no JS float operations on amounts           |
| Race condition on balance update                   | Tampering              | `SELECT ... FOR UPDATE` row lock in transaction; balance recalculation from ledger for reconciliation |
| Below-threshold payout bypass                      | Repudiation            | Server-side enforcement of R50 minimum; bypass attempt logged                                         |

### dWallet-Specific Error Codes

These should be added to the canonical error taxonomy if not already present:

```typescript
// In src/shared/api/api-response.ts ERROR_CODES:
'BELOW_MINIMUM_THRESHOLD',  // Payout request below R50
'WALLET_FROZEN',            // Wallet is FROZEN — no operations allowed
'WALLET_CLOSED',            // Wallet is CLOSED — no operations allowed
'STREAM_INACTIVE',          // DataRevenueStream is inactive
'CONSENT_ALREADY_SET',      // Attempted to set consent to same value as current state
```

## Sources

### Primary (HIGH confidence)

- [VERIFIED: codebase] `src/app/api/resources/route.ts` — API route pattern (auth, tenant isolation, envelope, Drizzle queries)
- [VERIFIED: codebase] `src/shared/api/db.ts` — Drizzle singleton, transaction pattern, table barrel exports
- [VERIFIED: codebase] `src/shared/api/auth-utils.ts` — `getSessionAndRole()` pattern
- [VERIFIED: codebase] `src/shared/api/api-response.ts` — `apiSuccess()`/`apiError()` envelope and ERROR_CODES taxonomy
- [VERIFIED: codebase] `src/widgets/dashboard/model/widgets.ts` — Widget registration pattern
- [VERIFIED: codebase] `src/entities/tenant/api/gate/mappings.ts` — FeatureKey union type, mapping tables (FEATURE_TO_MODULE, FEATURE_TO_FLAG, FEATURE_TO_REGISTRY)
- [VERIFIED: codebase] `src/entities/tenant/api/features/registry.ts` — FEATURE_REGISTRY, canAccessPage, hasFeature
- [VERIFIED: codebase] `src/entities/tenant/api/gate/gate.ts` — `canAccess()` 5-layer precedence gate
- [VERIFIED: codebase] `prisma/seed/modules.ts` — PlatformModule seed pattern
- [VERIFIED: codebase] `src/shared/api/server/index.ts` — `@api/server` barrel exports
- [VERIFIED: codebase] `prisma/schema.prisma` — existing model patterns, Decimal conventions, relation syntax
- [CITED: `docs/architecture/DWALLET_SPEC.md`] — Full domain model, API route surface, consent semantics, hard constraints
- [CITED: `docs/discussions/BILLING.md` Domain 3] — Double-entry ledger requirement: "Store WalletTransaction/LedgerEntry and derive balances"

### Secondary (MEDIUM confidence)

- [CITED: Phase 41 decisions (ROADMAP.md + STATE.md)] — `canAccess()` is canonical gate; Tier/Mapping tables are source of truth; client skips tier/module
- [CITED: Phase 35 decisions (STATE.md)] — `apiSuccess()`/`apiError()` envelope is canonical; error code taxonomy definitions
- [CITED: `47-CONTEXT.md`] — Sub-phase decomposition, hard constraints, acceptance criteria
- [CITED: Prisma CLI `5.22.0`] — Migration commands: `npx prisma migrate dev`, `npx prisma generate`

### Tertiary (LOW confidence)

- [ASSUMED] Exact Decimal operations in `drizzle-orm` (string-based) — training knowledge; verified via existing codebase patterns using `@db.Decimal`
- [ASSUMED] Widget feature flag gating behavior — training knowledge; verified via WidgetManifest type having `featureFlag?: string`
- [ASSUMED] TanStack Query caching patterns — training knowledge; existing project uses TanStack Query extensively

## Assumptions Log

| #   | Claim                                                                                                                      | Section               | Risk if Wrong                                                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Drizzle auto-generates kebab-case files (e.g., `d-wallets.ts` from `DWallet` model) from `prisma-generator-drizzle`        | Standard Stack        | Low — manual file creation can compensate; Drizzle schema file names are cosmetic                                                                                                                   |
| A2  | The `Decimal` type in Drizzle maps to `string` in TypeScript (not `number`)                                                | Common Pitfalls       | High — if `Decimal` maps to `number`, all amount handling code would silently use float math and cause rounding errors. Verify by inspecting existing `@db.Decimal` field types in existing schema. |
| A3  | `widgets.ts` `registerAllWidgets` function signature accepts `registry.register()` with `featureFlag` field                | Architecture Patterns | Low — WidgetManifest type already includes `featureFlag?: string`; confirmed via codebase                                                                                                           |
| A4  | The Prisma `user` model uses lowercase `user` (not `User`) — reverse relation should be `dWallet DWallet?` on model `user` | Architecture Patterns | Low — the Prisma model name is `user` (lowercase) as confirmed in schema.prisma; using `DWallet?` on the correct model                                                                              |

## Open Questions

1. **Should `notes` field be added to `DataShareBatch` model?**
   - What we know: The spec's B.7 batch endpoint says "Set batch status to COMPLETED on success, FAILED on error with an error message stored in a `notes` field (add this field to the model)." The Prisma model in Section 2.1 does NOT include `notes`.
   - What's unclear: Whether `notes` should be added to the Prisma model now or deferred until Phase B.
   - Recommendation: Add `notes String?` to the Prisma `DataShareBatch` model during Phase A to match the B.7 specification.

2. **How should `canAccess('page.dWallet')` map in the gate system?**
   - What we know: The spec requires 6 FeatureRegistry keys. The module key is `'dWallet'`. The FeatureKey type needs a new entry like `'dWallet'`. The mapping tables need entries.
   - What's unclear: Whether `'page.dWallet'` should be an independent FeatureKey or mapped through existing infrastructure. The `canAccess()` function accepts `FeatureKey` which is a 14-key union — this needs to become 15+ keys.
   - Recommendation: Add `'dWallet'` to `FeatureKey` union; add mappings: `FEATURE_TO_MODULE['dWallet'] = 'dWallet'`, `FEATURE_TO_FLAG['dWallet'] = 'dWallet'` (requires adding `dWallet` to `PlatformPageFlags`), `FEATURE_TO_REGISTRY['dWallet'] = 'page.dWallet'`. Add `'page.dWallet'` to `FEATURE_REGISTRY`.

3. **What Drizzle table names will `prisma-generator-drizzle` produce for the 6 new models?**
   - What we know: Existing convention maps PascalCase Prisma models to kebab-case files. E.g., `CommunityMerit` → `community-merits.ts`.
   - What's unclear: Exact file names for: `DWallet`, `WalletTransaction`, `DataConsent`, `PayoutRequest`, `DataRevenueStream`, `DataShareBatch`. Also: the barrel export in `dbSchema` object in `src/shared/api/db.ts` needs new import lines.
   - Recommendation: Assume kebab-case: `d-wallets`, `wallet-transactions`, `data-consents`, `payout-requests`, `data-revenue-streams`, `data-share-batches`. Verify after `npx prisma generate` and adjust barrel export.

4. **What is the correct Drizzle import path for dWallet schema files?**
   - What we know: Existing tables import from `@schema/` (e.g., `import { resources } from '@schema/resources'`).
   - What's unclear: Whether `@schema/` alias resolves correctly for newly generated files.
   - Recommendation: After `npx prisma generate`, verify `@schema/d-wallets` resolves. Update `tsconfig.json` path aliases if needed. Add imports to `src/shared/api/db.ts` and `src/shared/api/server/index.ts`.

## Environment Availability

| Dependency            | Required By                                                | Available  | Version            | Fallback                        |
| --------------------- | ---------------------------------------------------------- | ---------- | ------------------ | ------------------------------- |
| Node.js               | Build, typecheck, run                                      | ✓          | v24.10.0           | —                               |
| pnpm                  | Package management                                         | ✓          | 10.33.0            | —                               |
| Prisma CLI            | `prisma migrate dev`, `prisma generate`, `prisma validate` | ✓          | 5.22.0             | —                               |
| Drizzle ORM           | All DB queries                                             | ✓          | (via project deps) | —                               |
| PostgreSQL (Supabase) | Database                                                   | ✓ (remote) | —                  | Use local Supabase if available |

**Missing dependencies with no fallback:**

- None — all required tooling is present.

**Missing dependencies with fallback:**

- None.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — no new packages; all patterns verified against existing codebase exports and type definitions.
- Architecture: HIGH — patterns verified against `resources` API route, widget registration, gate system, and Prisma models. All conventions exist and are tested.
- Pitfalls: HIGH — currency precision and balance consistency pitfalls are well-documented in BILLING.md Domain 3 and the spec's hard constraints. Tenant isolation patterns are battle-tested.
- Feature gate: HIGH — the Phase 41 gate system has exact types, mapping tables, and integration points verified in codebase.
- Double-entry ledger: HIGH — BILLING.md Domain 3 explicitly requires it; the spec's WalletTransaction model already includes `balanceBefore`/`balanceAfter` fields.

**Research date:** 2026-06-25
**Valid until:** 2026-07-25 (stable domain — financial ledgers and consent models are mature patterns)
