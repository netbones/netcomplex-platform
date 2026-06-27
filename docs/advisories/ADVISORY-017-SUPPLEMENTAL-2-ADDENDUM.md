# ADVISORY-017-SUPPLEMENTAL-2-ADDENDUM

## Amends: ADVISORY-017-SUPPLEMENTAL-2 (Platform AI Token Pool)

## Scope: Two surgical corrections identified during advisory review

**Status:** AUTHORITATIVE — incorporate before Phase A′ execution  
**Date:** 2026-06-25  
**Author:** Architectural review of SUPPLEMENTAL-2 against SUPPLEMENTAL-B

This addendum does not redesign anything in SUPPLEMENTAL-2. It corrects two gaps
and one seed data inconsistency that would cause Phase A′ to produce a broken or
incomplete implementation if left unaddressed.

---

## CORRECTION 1 — `AiUsageEvent` missing cost field + `pricing.ts` module absent

### Problem

`AiUsageEvent` (SUPPLEMENTAL-2 Section 4) records token counts but no cost estimate.
`recordUsage()` (Section 5) computes `overageCostZAR` against `TenantAiUsage` but
writes no per-event cost to `AiUsageEvent`. This has two consequences:

1. The platform cannot reconcile its monthly Anthropic/OpenAI invoice against
   internal records. The only path to "what did this month cost us?" is re-deriving
   costs from token counts after the fact, which requires knowing which model was used
   at which price — fragile as provider pricing changes over time.
2. The platform admin dashboard (SUPPLEMENTAL-2 Section 6) shows no cost column.
   Without per-event cost snapshots, any cost figure shown is a live recalculation
   that can silently diverge from historical reality when `pricing.ts` is updated.

### Fix A — Add `estimatedCostUSD` to `AiUsageEvent`

**Amend the `AiUsageEvent` model in `prisma/schema.prisma`** — add one field after
`totalTokens`:

```prisma
model AiUsageEvent {
  id               String   @id @default(cuid())
  tenantId         String
  usageId          String
  capability       String
  provider         String
  model            String
  inputTokens      Int
  outputTokens     Int
  totalTokens      Int
  estimatedCostUSD Decimal  @default(0) @db.Decimal(10, 6)  // ← ADD THIS
  userId           String?
  referenceId      String?
  durationMs       Int?
  success          Boolean  @default(true)
  errorCode        String?
  createdAt        DateTime @default(now())

  usage  TenantAiUsage @relation(fields: [usageId], references: [id])

  @@index([tenantId, createdAt])
  @@index([capability])
  @@index([usageId])
}
```

`Decimal(10, 6)` gives six decimal places — sufficient for sub-cent precision at
Haiku rates ($0.00000080 per input token). The field is named `estimatedCostUSD`
not `costUSD` to signal that it is a snapshot of a rate-table estimate, not an
authoritative invoice figure. This distinction matters for POPIA and financial
reporting — the platform must never misrepresent an estimate as a confirmed charge.

### Fix B — Add `src/shared/api/ai/pricing.ts`

Create this file as part of Phase A′. It is a pure constants module — no DB calls,
no async, importable anywhere in the server layer:

```typescript
// src/shared/api/ai/pricing.ts
// Snapshot of provider pricing used for internal cost estimation.
// Update this file when provider pricing changes.
// Last verified: 2026-06-25
// Source: https://www.anthropic.com/pricing  https://openai.com/pricing

export const AI_PRICING_USD_PER_MILLION_TOKENS = {
  anthropic: {
    'claude-haiku-4-5': { input: 0.8, output: 4.0 },
    'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  },
  openai: {
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4o': { input: 5.0, output: 15.0 },
  },
} as const satisfies Record<string, Record<string, { input: number; output: number }>>;

export type AiProviderName = keyof typeof AI_PRICING_USD_PER_MILLION_TOKENS;

/**
 * Estimate the USD cost of a single AI call.
 * Returns 0 if the provider/model combination is unknown — never throws.
 * Result is an estimate only; do not use for invoicing.
 */
export function estimateCostUSD(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const providerRates = AI_PRICING_USD_PER_MILLION_TOKENS[provider as AiProviderName];
  if (!providerRates) return 0;
  const rates = providerRates[model as keyof typeof providerRates];
  if (!rates) return 0;
  return (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;
}

// Spot-check: Haiku at 1,000 input + 500 output tokens
// = (1000/1M × 0.80) + (500/1M × 4.00) = 0.000800 + 0.002000 = $0.002800
// Verify: estimateCostUSD('anthropic', 'claude-haiku-4-5', 1000, 500) === 0.00280
```

### Fix C — Wire `estimatedCostUSD` into `recordUsage()`

**Amend `recordUsage()` in `src/shared/api/ai/pool.ts`** — add the cost calculation
and pass it to the insert. The diff against SUPPLEMENTAL-2 Section 5 is minimal:

```typescript
// Add import at top of pool.ts
import { estimateCostUSD } from './pricing';

// Inside recordUsage(), before the transaction:
const estimatedCostUSD = estimateCostUSD(
  options.provider,
  options.model,
  options.inputTokens,
  options.outputTokens
);

// Inside the transaction, add to the aiUsageEvent insert:
await tx.insert(aiUsageEvent).values({
  // ... all existing fields unchanged ...
  estimatedCostUSD: estimatedCostUSD.toFixed(6), // ← ADD THIS LINE
});
```

No other changes to `recordUsage()`. The `overageCostZAR` calculation on
`TenantAiUsage` is unaffected — it uses token counts against the ZAR rate, which
is correct for tenant-facing billing. `estimatedCostUSD` is platform-internal only.

### Fix D — Add `pricing.ts` to FSD placement

**Amend SUPPLEMENTAL-2 Section 12 FSD listing** — add one line:

```
src/shared/api/ai/
├── index.ts
├── provider.ts
├── anthropic.ts
├── openai.ts
├── null-provider.ts
├── pool.ts
├── pricing.ts          # ← ADD — cost estimation constants, estimateCostUSD()
└── __tests__/
    ├── provider.test.ts
    ├── pool.test.ts
    └── pricing.test.ts # ← ADD — spot-check against known values
```

### Fix E — Add cost to done criteria

**Append to SUPPLEMENTAL-2 Section 16 done criteria:**

```
- [ ] `pricing.ts` exports `estimateCostUSD`; spot-check passes:
      estimateCostUSD('anthropic', 'claude-haiku-4-5', 1000, 500) === 0.00280
- [ ] `AiUsageEvent` rows contain non-zero `estimatedCostUSD` for successful calls
- [ ] `AiUsageEvent.estimatedCostUSD` is 0 for calls where provider/model is unknown
      (verify via unit test with unknown model string — must not throw)
```

### Fix F — Add cost column to platform admin dashboard query

The platform admin usage route (`/api/admin/platform/ai-pool/usage`) should return
aggregate cost per tenant for the billing period. Add to the query:

```typescript
// In the platform admin usage route — add to the SELECT aggregation:
estimatedCostUSD: sql<number>`
  sum(${aiUsageEvent.estimatedCostUSD})
`.mapWith(Number),
```

This is the only place USD cost is surfaced — platform admin only, never tenant-facing.
The admin widget table (SUPPLEMENTAL-2 Section 6) gains a cost column:

```
│ Tenant          Tier       Used       Allotted   %    Est. Cost  │
│ Soralia Village ENTERPRISE 12,450     500,000    2%   $0.009     │
│ Solaris Heights STANDARD   48,200     50,000     96%  $0.036     │
```

---

## CORRECTION 2 — `AiCompletionOptions.capability` must be required, not optional

### Problem

Neither SUPPLEMENTAL nor SUPPLEMENTAL-2 specifies `capability` as a field on
`AiCompletionOptions`. It appears only as a parameter to `checkQuota()` and
`recordUsage()` at the callsite level (see SUPPLEMENTAL-2 Section 5 dispute route
example). This means the type system does not enforce that every AI call is tagged.

If any future callsite passes options without `capability`, `recordUsage()` will
receive `undefined` for the capability field. The `AiUsageEvent.capability` column
is typed `String` (non-nullable in Prisma) — the insert will fail at runtime, or
worse, a default `'unknown'` string will silently corrupt the per-capability breakdown
in the tenant admin widget.

### Fix G — Add `capability` to `AiCompletionOptions`

**Amend `AiCompletionOptions` in `src/shared/api/ai/provider.ts`:**

```typescript
// The AiCapabilityKey type — define once, export from index.ts
export type AiCapabilityKey =
  | 'ai.disputes.frivolityScreen'
  | 'ai.content.translation'
  | 'ai.content.moderation'
  | 'ai.maintenance.triage';

// AiCompletionOptions — capability is REQUIRED
export interface AiCompletionOptions {
  capability: AiCapabilityKey; // required — every callsite must tag its use
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  jsonMode?: boolean;
  model?: string;
}
```

Making `capability` required (no `?`) means TypeScript enforces tagging at every
callsite. A callsite that omits it will not compile. This is the correct enforcement
level — a runtime check on `recordUsage()` is too late and too silent.

### Fix H — Thread `capability` from `AiCompletionOptions` into `recordUsage()`

With `capability` now on the options object, callsites no longer pass it separately
to `recordUsage()`. **Amend the callsite pattern** shown in SUPPLEMENTAL-2 Section 5:

```typescript
// BEFORE (SUPPLEMENTAL-2 pattern — capability passed separately):
const result = await provider.complete(sanitised, {
  systemPrompt: FRIVOLITY_SCREEN_SYSTEM_PROMPT,
  maxTokens: 500,
  jsonMode: true,
});
await recordUsage({
  tenantId,
  capability: 'ai.disputes.frivolityScreen',   // separate
  ...
});

// AFTER (addendum pattern — capability carried through options):
const options: AiCompletionOptions = {
  capability:   'ai.disputes.frivolityScreen', // ← on options
  systemPrompt: FRIVOLITY_SCREEN_SYSTEM_PROMPT,
  maxTokens:    500,
  jsonMode:     true,
};
const result = await provider.complete(sanitised, options);
await recordUsage({
  tenantId,
  capability: options.capability,              // ← pulled from options, not re-stated
  ...
});
```

This eliminates the possibility of `provider.complete()` and `recordUsage()` being
called with different capability values at the same callsite — a subtle bug that could
occur if a developer copies a callsite and updates one line but not the other.

### Fix I — `AiProvider.complete()` receives and forwards `capability`

The `AiProvider` interface's `complete()` method receives the full `AiCompletionOptions`
object. The underlying `AnthropicProvider` and `OpenAiProvider` implementations ignore
`capability` — it is not sent to the external API. This is correct. The field exists
solely for internal metering. No change to the provider implementations is needed
beyond accepting the updated options type.

### Fix J — Add capability enforcement to done criteria

**Append to SUPPLEMENTAL-2 Section 16 done criteria:**

```
- [ ] `AiCompletionOptions.capability` is non-optional in the TypeScript interface;
      `npm run typecheck` fails if any callsite omits it (verify by temporarily
      removing `capability` from the dispute route call — expect a type error)
- [ ] No `AiUsageEvent` rows exist with `capability = 'unknown'` after Phase A′ smoke test
```

---

## CORRECTION 3 — Seed data inconsistency: ENTERPRISE quota

### Problem

SUPPLEMENTAL-2 Section 4 seed data specifies ENTERPRISE `monthlyTokens: 1_000_000`.
Gate G8 (Section 14) resolves ENTERPRISE to **500,000** tokens. These two values
conflict. An agent executing Section 4 literally will seed the wrong value.

### Fix K — Correct the seed data

**Replace** the ENTERPRISE entry in the `PlatformAiTierQuota` seed (SUPPLEMENTAL-2
Section 4) with the G8-resolved value:

```typescript
// CORRECT seed — use this, not the Section 4 version:
await db
  .insert(platformAiTierQuota)
  .values([
    {
      id: createId(),
      tier: 'STANDARD',
      monthlyTokens: 50_000,
      overagePolicy: 'HARD_STOP',
    },
    {
      id: createId(),
      tier: 'PREMIUM',
      monthlyTokens: 200_000,
      overagePolicy: 'THROTTLE',
    },
    {
      id: createId(),
      tier: 'ENTERPRISE',
      monthlyTokens: 500_000, // ← G8 resolved value — NOT 1,000,000
      overagePolicy: 'SURCHARGE',
      overageTokens: 250_000, // 50% overage grace for Enterprise
      overagePriceZAR: 0.0001,
    },
  ])
  .onConflictDoNothing();
```

Note also that `createMany` (used in SUPPLEMENTAL-2) is a Prisma Client method.
The codebase uses Drizzle for all queries (ADR-003). The corrected seed above uses
`db.insert(...).onConflictDoNothing()` which is the correct Drizzle pattern.

**STOP AND ESCALATE:** Before running the seed, confirm the seed file is in
`prisma/seed/modules.ts` (or equivalent) and that it imports from the Drizzle
schema layer (`src/db/schema/`), not from `@prisma/client`. Using Prisma client in
seed files would violate the dual-ORM discipline (ADR-003: Drizzle is the query layer).

---

## Summary of All Fixes

| Fix | Section amended          | What changes                                                                    |
| --- | ------------------------ | ------------------------------------------------------------------------------- |
| A   | Schema (§4)              | Add `estimatedCostUSD Decimal` field to `AiUsageEvent`                          |
| B   | New file                 | Create `src/shared/api/ai/pricing.ts` with `estimateCostUSD()`                  |
| C   | `pool.ts` (§5)           | Wire `estimateCostUSD()` into `recordUsage()` insert                            |
| D   | FSD listing (§12)        | Add `pricing.ts` and `pricing.test.ts` to tree                                  |
| E   | Done criteria (§16)      | Add 3 cost-related checklist items                                              |
| F   | Platform admin route     | Add cost aggregation to usage query and widget table                            |
| G   | `provider.ts`            | Make `capability` required on `AiCompletionOptions`                             |
| H   | Callsite pattern (§5)    | Thread `capability` through options object, not separately                      |
| I   | Provider implementations | No change needed — they ignore `capability`                                     |
| J   | Done criteria (§16)      | Add 2 capability-enforcement checklist items                                    |
| K   | Seed data (§4)           | Correct ENTERPRISE from 1,000,000 to 500,000 tokens; use Drizzle insert pattern |

---

## Execution Order

These fixes integrate into Phase A′ (SUPPLEMENTAL-2 Section 15) as follows:

```
Phase A′ Step 1 (schema) — apply Fix A (AiUsageEvent cost field) at the same time
                            as the main schema additions. One migration, not two.

Phase A′ Step 1 (schema) — new enum values are unaffected.

Phase A′ Step 3 (generate) — run after all schema changes including Fix A.

Phase A′ Step 4 (seed) — use Fix K seed values, not Section 4 values.

Phase A′ Step 5 (ai/ layer) — create pricing.ts (Fix B) first, then pool.ts (Fix C),
                               then provider.ts (Fix G). Dependency order matters:
                               pool.ts imports pricing.ts; provider.ts imports
                               AiCapabilityKey which is defined in provider.ts itself.

Phase A′ Step 5 (ai/ layer) — Fix H (callsite pattern) applies to the dispute intake
                               route in Phase C of ADVISORY-017, not Phase A′.
                               Note it now for Phase C execution.

Phase A′ Step 6 (admin routes) — apply Fix F (cost column) to the usage route.

Phase A′ Step 9 (done criteria) — use the combined criteria from SUPPLEMENTAL-2 §16
                                  plus Fixes E and J from this addendum.
```

---

_This addendum is authoritative over SUPPLEMENTAL-2 wherever they conflict.  
SUPPLEMENTAL-2 remains authoritative over SUPPLEMENTAL wherever they conflict.  
All other advisory documents in the ADVISORY-017 chain remain unchanged._
