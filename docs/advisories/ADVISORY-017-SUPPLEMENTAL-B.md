---
title: ADVISORY-017-SUPPLEMENTAL-B: Platform AI Pool — Tier-Based Token Metering
status: current
reviewed: 2026-07-28
tags: [advisory, architecture]
audience: developer
---

# ADVISORY-017-SUPPLEMENTAL-B: Platform AI Pool — Tier-Based Token Metering

## Amends: ADVISORY-017-SUPPLEMENTAL (AI Provider Module)

## Resolves: Gate G5 (Platform metered pool decision)

**Status:** DRAFT — Awaiting DavDev review and decision gates  
**Date:** 2026-06-25  
**Scope:** Platform-level AI token pool, resold to tenants by tier; replaces bring-your-own-key  
as the primary model. BYOK retained as an override for Enterprise tier.

---

## 1. Decision Resolved

**Gate G5 is resolved: Platform metered pool with tier-based allocation.**

ADVISORY-017-SUPPLEMENTAL assumed tenants bring their own keys (BYOK). This supplemental
supersedes that model with a **platform-owned pool** as the primary path, structured as follows:

```
Platform owns:
  PLATFORM_ANTHROPIC_KEY (primary)
  PLATFORM_OPENAI_KEY    (secondary / translation)

Platform allocates monthly token budgets per tenant tier:
  STANDARD  → token_budget_input: 500,000   token_budget_output: 100,000
  PREMIUM   → token_budget_input: 2,000,000 token_budget_output: 400,000
  ENTERPRISE → token_budget_input: 8,000,000 token_budget_output: 1,600,000

Platform marks up cost to tenants (included in SaaS tier fee — not billed per token).
Platform absorbs overages up to a defined hard cap, then throttles gracefully.
Enterprise tenants may additionally supply their own key for unlimited use (BYOK override).
```

---

## 2. Why Platform Pool Is Correct Here

**Operational reality for HOA tenants:** A community manager at Soralia Village cannot
be expected to create an Anthropic account, manage API keys, monitor usage, or handle
billing from a third-party AI company. This is a B2B2C platform — the end tenant is
a residents association, not a developer. Platform-managed keys are the only viable UX.

**Margin opportunity:** Anthropic's current input pricing for Haiku is ~$0.80/MTok,
output ~$4.00/MTok. At the tier allocations above, the platform's monthly AI cost per
STANDARD tenant is approximately $0.40–$0.80 USD depending on feature mix. This is
easily absorbed within a per-home SaaS fee. At 100 STANDARD tenants, the platform's
AI spend is ~$40–$80/month — trivially manageable.

**BYOK as Enterprise escape hatch:** Large property management firms (ENTERPRISE tier)
may have existing AI vendor agreements or usage requirements that exceed the platform
pool. BYOK is preserved for this case only.

---

## 3. Revised Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    PLATFORM AI POOL                               │
│  src/shared/api/ai/pool.ts                                        │
│                                                                   │
│  Platform keys (env vars — never in DB):                         │
│    PLATFORM_ANTHROPIC_KEY                                         │
│    PLATFORM_OPENAI_KEY                                            │
│                                                                   │
│  Per-tier budgets (AiTierQuota — DB, platform-admin configurable):│
│    STANDARD:   500k input / 100k output tokens / month            │
│    PREMIUM:    2M input  / 400k output tokens / month             │
│    ENTERPRISE: 8M input  / 1.6M output tokens / month             │
└──────────────────┬───────────────────────────────────────────────┘
                   │
         ┌─────────┴──────────────────────┐
         ▼                                ▼
  AiUsageRecord (per call)        AiTenantQuota (per tenant/month)
  tenantId, capability,           tenantId, month, tier,
  provider, inputTokens,          inputUsed, outputUsed,
  outputTokens, costUSD,          inputBudget, outputBudget,
  latencyMs, success              throttledAt, hardCapReachedAt
         │
         ▼
  Platform Admin Dashboard
  ├── Total spend by provider
  ├── Per-tenant usage breakdown
  ├── Tenants approaching quota (>80%)
  ├── Throttled tenants
  └── Monthly cost vs revenue estimate
```

### Amended `getAiProvider()` flow:

```
getAiProvider(tenantId)
    │
    ├─ Is 'ai-provider' module enabled for tenant? → No → NullProvider
    │
    ├─ Is tenant ENTERPRISE with BYOK configured? → Yes → BYOKProvider(decryptedKey)
    │
    ├─ Check AiTenantQuota for current month
    │   ├─ hardCapReached? → ThrottledProvider (returns quota-exceeded error)
    │   └─ OK → PoolProvider(PLATFORM_KEY, tenantId, quotaContext)
    │
    └─ Return PoolProvider
```

`PoolProvider` wraps the real Anthropic/OpenAI call. After each successful call it:

1. Writes an `AiUsageRecord`
2. Atomically increments `AiTenantQuota.inputUsed` / `outputUsed`
3. Checks if `>= inputBudget` → sets `throttledAt` (soft throttle, degrades gracefully)
4. Checks if `>= hardCap` → sets `hardCapReachedAt` (hard stop, returns error to feature)

---

## 4. Schema — New Models

```prisma
// ── AI Pool & Metering ──

model AiTierQuota {
  id                  String   @id @default(cuid())
  tier                Tier                          // STANDARD | PREMIUM | ENTERPRISE
  inputTokenBudget    Int                           // tokens per month (input)
  outputTokenBudget   Int                           // tokens per month (output)
  hardCapMultiplier   Float    @default(1.2)        // % of budget before hard stop (120%)
  defaultProvider     String   @default("anthropic")
  isActive            Boolean  @default(true)
  updatedAt           DateTime @default(now()) @updatedAt
  updatedById         String?                       // platform admin who last changed

  @@unique([tier])   // one row per tier — platform admin manages
}

model AiTenantQuota {
  id                  String    @id @default(cuid())
  tenantId            String
  tier                Tier
  periodMonth         String                        // 'YYYY-MM' — e.g. '2026-06'
  inputTokenBudget    Int                           // copied from AiTierQuota at period start
  outputTokenBudget   Int
  inputTokensUsed     Int       @default(0)
  outputTokensUsed    Int       @default(0)
  estimatedCostUSD    Decimal   @default(0) @db.Decimal(10, 6)
  throttledAt         DateTime?                     // soft throttle timestamp
  hardCapReachedAt    DateTime?                     // hard stop timestamp
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @default(now()) @updatedAt

  usageRecords        AiUsageRecord[]

  @@unique([tenantId, periodMonth])
  @@index([tenantId])
  @@index([periodMonth])
  @@index([tier])
}

model AiUsageRecord {
  id              String    @id @default(cuid())
  tenantId        String
  quotaId         String
  capability      String                    // AiCapabilityKey value
  provider        String                    // 'anthropic' | 'openai'
  model           String                    // e.g. 'claude-haiku-4-5'
  inputTokens     Int
  outputTokens    Int
  estimatedCostUSD Decimal  @db.Decimal(10, 6)
  latencyMs       Int
  success         Boolean   @default(true)
  errorCode       String?
  isByok          Boolean   @default(false) // true if tenant used own key
  createdAt       DateTime  @default(now())

  quota           AiTenantQuota @relation(fields: [quotaId], references: [id])

  @@index([tenantId])
  @@index([quotaId])
  @@index([capability])
  @@index([createdAt])    // for monthly aggregation queries
}
```

### Seed data — `AiTierQuota` initial rows:

```typescript
// prisma/seed/ai-quotas.ts
export const AI_TIER_QUOTAS = [
  {
    tier: 'STANDARD',
    inputTokenBudget: 500_000,
    outputTokenBudget: 100_000,
    hardCapMultiplier: 1.2, // stop at 600k input / 120k output
    defaultProvider: 'anthropic',
  },
  {
    tier: 'PREMIUM',
    inputTokenBudget: 2_000_000,
    outputTokenBudget: 400_000,
    hardCapMultiplier: 1.2,
    defaultProvider: 'anthropic',
  },
  {
    tier: 'ENTERPRISE',
    inputTokenBudget: 8_000_000,
    outputTokenBudget: 1_600_000,
    hardCapMultiplier: 1.5, // Enterprise gets more overage grace
    defaultProvider: 'anthropic',
  },
];
```

These are editable by platform admins via the Platform Admin dashboard (not by tenant
admins). Budget changes take effect at the next billing period start, not immediately,
to prevent mid-month surprises.

---

## 5. Quota Lifecycle

### Period initialisation

`AiTenantQuota` rows are created lazily on the first AI call of each calendar month,
not by a cron job. The `getOrCreateQuota(tenantId, month)` function:

```typescript
async function getOrCreateQuota(
  tenantId: string,
  month: string // 'YYYY-MM'
): Promise<AiTenantQuota> {
  const existing = await db.query.aiTenantQuota.findFirst({
    where: and(eq(aiTenantQuota.tenantId, tenantId), eq(aiTenantQuota.periodMonth, month)),
  });
  if (existing) return existing;

  // Fetch current tier from Tenant record
  const tenant = await getTenantById(tenantId);
  const tierQuota = await db.query.aiTierQuota.findFirst({
    where: eq(aiTierQuota.tier, tenant.tier),
  });

  return await db
    .insert(aiTenantQuota)
    .values({
      id: createId(),
      tenantId,
      tier: tenant.tier,
      periodMonth: month,
      inputTokenBudget: tierQuota.inputTokenBudget,
      outputTokenBudget: tierQuota.outputTokenBudget,
    })
    .returning()
    .then(r => r[0]);
}
```

**Why lazy?** Avoids a monthly cron that must run for every tenant. Lazy creation also
handles tenant tier changes mid-month correctly — the new month starts fresh at the
new tier's budget.

### Token counting and atomic increment

After each AI call, `PoolProvider` records usage atomically:

```typescript
// Using Drizzle's atomic increment — never read-modify-write
await db
  .update(aiTenantQuota)
  .set({
    inputTokensUsed: sql`${aiTenantQuota.inputTokensUsed}  + ${inputTokens}`,
    outputTokensUsed: sql`${aiTenantQuota.outputTokensUsed} + ${outputTokens}`,
    estimatedCostUSD: sql`${aiTenantQuota.estimatedCostUSD} + ${costUSD}`,
    updatedAt: new Date(),
  })
  .where(eq(aiTenantQuota.id, quotaId));
```

This prevents race conditions under concurrent requests. PostgreSQL's integer addition
is atomic at the row level without an explicit transaction for this single-table update.

### Throttle and hard cap check

```typescript
async function checkAndUpdateThrottle(quota: AiTenantQuota): Promise<'ok' | 'soft' | 'hard'> {
  const inputPct = quota.inputTokensUsed / quota.inputTokenBudget;
  const outputPct = quota.outputTokensUsed / quota.outputTokenBudget;
  const pct = Math.max(inputPct, outputPct);

  if (pct >= quota.hardCapMultiplier) {
    if (!quota.hardCapReachedAt) {
      await db
        .update(aiTenantQuota)
        .set({ hardCapReachedAt: new Date() })
        .where(eq(aiTenantQuota.id, quota.id));
      // Fire notification to platform admin + tenant admin
      await notifyQuotaHardCap(quota.tenantId);
    }
    return 'hard';
  }

  if (pct >= 0.8 && !quota.throttledAt) {
    await db
      .update(aiTenantQuota)
      .set({ throttledAt: new Date() })
      .where(eq(aiTenantQuota.id, quota.id));
    // Fire notification to tenant admin only (not residents)
    await notifyQuotaSoftThrottle(quota.tenantId);
  }

  return pct >= 0.8 ? 'soft' : 'ok';
}
```

**Soft throttle behaviour** (`>= 80%`): All AI features continue to work. Tenant admin
sees a warning banner in the admin dashboard: "Your community has used 80% of its AI
allocation for June. Usage will continue until the monthly limit is reached."

**Hard cap behaviour** (`>= hardCapMultiplier`): AI features begin returning graceful
degraded states. The `PoolProvider.complete()` throws `AiQuotaExceededError`. Each
feature's degraded path (NullProvider behaviour) kicks in. A prominent notice appears
in the tenant admin panel: "AI features are paused for the remainder of June. They will
resume on 1 July. To increase your allocation, upgrade your community tier."

---

## 6. Cost Estimation

Token cost is estimated at call time using static rate constants (not fetched from
provider — rates change rarely and a stale rate is better than a failed call):

```typescript
// src/shared/api/ai/pricing.ts

export const AI_PRICING_USD_PER_MILLION = {
  anthropic: {
    'claude-haiku-4-5': { input: 0.8, output: 4.0 },
    'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  },
  openai: {
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4o': { input: 5.0, output: 15.0 },
  },
} as const;

export function estimateCostUSD(
  provider: 'anthropic' | 'openai',
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const rates = AI_PRICING_USD_PER_MILLION[provider]?.[model];
  if (!rates) return 0;
  return (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;
}
```

**Important:** `estimatedCostUSD` in `AiUsageRecord` is an internal cost-tracking
figure for platform margin analysis. It is never shown to tenants. Tenants see only
token counts and percentage of budget consumed.

---

## 7. Platform Admin Controls

Platform admins manage the pool via new routes under `/api/admin/platform/`:

### Routes:

| Method  | Path                                             | Purpose                                               |
| ------- | ------------------------------------------------ | ----------------------------------------------------- |
| `GET`   | `/api/admin/platform/ai/quotas`                  | List `AiTierQuota` for all tiers                      |
| `PATCH` | `/api/admin/platform/ai/quotas/[tier]`           | Update budget or hard cap for a tier                  |
| `GET`   | `/api/admin/platform/ai/usage`                   | Aggregate usage across all tenants for current month  |
| `GET`   | `/api/admin/platform/ai/usage/[tenantId]`        | Per-tenant usage detail                               |
| `POST`  | `/api/admin/platform/ai/quotas/[tenantId]/reset` | Emergency reset (e.g. erroneous spike)                |
| `POST`  | `/api/admin/platform/ai/keys`                    | Set/rotate platform API keys (writes env — see below) |

**Key rotation note:** Platform API keys (`PLATFORM_ANTHROPIC_KEY`, `PLATFORM_OPENAI_KEY`)
are environment variables, not database records. They cannot be rotated via a UI without
a redeploy on Vercel. The `POST /api/admin/platform/ai/keys` route is therefore a
**Vercel-adjacent operation** — it calls the Vercel API to update the env var and
trigger a redeploy. This is a future capability. For v1, key rotation is a manual
ops procedure documented in `docs/STEERING/AI_POOL.md`.

### Platform Admin Widget:

```typescript
registry.register({
  id: 'platform-ai-pool',
  version: '1.0.0',
  name: 'AI Pool Monitor',
  description: 'Monitor platform AI usage, costs, and per-tenant quotas',
  author: 'internal',
  category: 'core',
  icon: Gauge, // lucide-react
  permissions: ['admin'], // platform admin only — isPlatformAdmin check in component
  component: lazy(() =>
    import('../ui/PlatformAiPoolWidget').then(m => ({
      default: m.PlatformAiPoolWidget,
    }))
  ),
  loader: () => import('../ui/PlatformAiPoolWidget'),
  defaultSize: { width: 4, height: 3 },
  minSize: { width: 3, height: 2 },
  dragHandleClassName: 'widget-drag-handle',
});
```

Widget renders:

- Current month total spend (estimated, USD) across all tenants
- Bar chart: top 5 tenants by token consumption
- Table: all tenants with `used / budget` and status indicator (✓ / ⚠ / 🔴)
- Capability breakdown: which features are consuming most tokens
- `[Adjust Tier Quotas]` → opens `AiTierQuota` edit form

---

## 8. Tenant Admin View

Tenant admins see a read-only usage summary in the `AiProviderSettingsWidget`
(renamed in this supplemental to `AiUsageWidget` since tenants no longer manage keys):

```
┌──────────────────────────────────────────────────────┐
│ AI Features — June 2026                              │
│                                                      │
│ Plan: Standard   Budget: 500,000 tokens              │
│                                                      │
│ Used this month:                                     │
│ ████████████░░░░░░░░ 62% (310,000 / 500,000)        │
│                                                      │
│ Breakdown by feature:                                │
│ • Dispute screening    180,000 tokens                │
│ • Content translation   90,000 tokens                │
│ • Other                 40,000 tokens                │
│                                                      │
│ Resets: 1 July 2026                                  │
│                                                      │
│ [Upgrade Plan ↑]  to double your AI allocation      │
└──────────────────────────────────────────────────────┘
```

Tenants see **token counts and percentages only** — no cost figures, no provider names,
no model names. The AI pool is presented as a platform feature, not as a resold API.

---

## 9. BYOK Override (Enterprise Only)

ADVISORY-017-SUPPLEMENTAL's BYOK mechanism is preserved but scoped exclusively to
ENTERPRISE tenants. The flow:

1. Enterprise tenant admin navigates to "AI Settings" (additional tab in admin panel)
2. Provides own Anthropic or OpenAI key
3. Key stored encrypted in `Setting` table per the SUPPLEMENTAL design
4. `getAiProvider()` detects BYOK: returns `BYOKProvider` — bypasses quota entirely
5. No `AiUsageRecord` written for BYOK calls (tenant is not consuming platform pool)
6. BYOK tenant still sees AI features working normally — no quota display shown

```typescript
async function getAiProvider(tenantId: string): Promise<AiProvider> {
  const module = await getTenantModule(tenantId, 'ai-provider');
  if (!module?.enabled) return new NullProvider();

  const tenant = await getTenantById(tenantId);

  // BYOK path — Enterprise only
  if (tenant.tier === 'ENTERPRISE') {
    const encKey = await getSettingValue(tenantId, 'ai.anthropic.key');
    if (encKey) {
      return new BYOKProvider('anthropic', decryptKey(encKey), tenantId);
    }
  }

  // Platform pool path
  const month = formatMonth(new Date());
  const quota = await getOrCreateQuota(tenantId, month);
  const status = await checkAndUpdateThrottle(quota);

  if (status === 'hard') {
    return new ThrottledProvider('quota_exceeded');
  }

  const tierQuota = await getAiTierQuota(tenant.tier);
  const platformKey = process.env.PLATFORM_ANTHROPIC_KEY!;

  return new PoolProvider({
    apiKey: platformKey,
    provider: tierQuota.defaultProvider,
    tenantId,
    quotaId: quota.id,
    softThrottled: status === 'soft',
  });
}
```

---

## 10. `PoolProvider` — Wrapping the Call

```typescript
// src/shared/api/ai/pool-provider.ts

export class PoolProvider implements AiProvider {
  readonly name = 'anthropic' as const; // or openai

  async complete(userPrompt: string, options?: AiCompletionOptions): Promise<AiCompletionResult> {
    const start = Date.now();

    try {
      // Actual API call (AnthropicProvider or OpenAiProvider internally)
      const inner = new AnthropicProvider(this.apiKey);
      const result = await inner.complete(userPrompt, options);

      const latencyMs = Date.now() - start;
      const costUSD = estimateCostUSD(
        'anthropic',
        options?.model ?? 'claude-haiku-4-5',
        result.inputTokens ?? 0,
        result.outputTokens ?? 0
      );

      // Non-blocking — fire and forget, never fail the caller
      void this.recordUsage({
        inputTokens: result.inputTokens ?? 0,
        outputTokens: result.outputTokens ?? 0,
        latencyMs,
        costUSD,
        success: true,
        capability: options?.capability ?? 'unknown',
        model: options?.model ?? 'claude-haiku-4-5',
      });

      return result;
    } catch (error) {
      void this.recordUsage({
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - start,
        costUSD: 0,
        success: false,
        capability: options?.capability ?? 'unknown',
        model: options?.model ?? 'claude-haiku-4-5',
        errorCode: error instanceof Error ? error.message : 'unknown',
      });
      throw error;
    }
  }

  private async recordUsage(data: UsageData): Promise<void> {
    try {
      await db.insert(aiUsageRecord).values({
        id: createId(),
        tenantId: this.tenantId,
        quotaId: this.quotaId,
        capability: data.capability,
        provider: 'anthropic',
        model: data.model,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        estimatedCostUSD: data.costUSD,
        latencyMs: data.latencyMs,
        success: data.success,
        errorCode: data.errorCode,
        isByok: false,
      });

      // Atomic increment
      await db
        .update(aiTenantQuota)
        .set({
          inputTokensUsed: sql`${aiTenantQuota.inputTokensUsed}  + ${data.inputTokens}`,
          outputTokensUsed: sql`${aiTenantQuota.outputTokensUsed} + ${data.outputTokens}`,
          estimatedCostUSD: sql`${aiTenantQuota.estimatedCostUSD} + ${data.costUSD}`,
          updatedAt: new Date(),
        })
        .where(eq(aiTenantQuota.id, this.quotaId));
    } catch (err) {
      // Usage recording must never crash the caller
      logger.error({ tenantId: this.tenantId, err }, 'AI usage recording failed');
    }
  }
}
```

**Critical:** `recordUsage` is fire-and-forget (`void`) and never throws to the caller.
A failure to record usage is a monitoring concern, not a user-facing error. Usage
recording failures are logged to Pino and will surface in PostHog.

---

## 11. `AiCompletionOptions` — Capability Tagging

ADVISORY-017-SUPPLEMENTAL's `AiCompletionOptions` interface gains a `capability` field:

```typescript
export interface AiCompletionOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  jsonMode?: boolean;
  model?: string;
  capability: AiCapabilityKey; // NOW REQUIRED — for usage breakdown
}
```

Making `capability` required (not optional) ensures every callsite tags its usage.
This is the only way the per-capability breakdown in the tenant admin UI is possible.
TypeScript enforcement catches any callsite that forgets to tag.

---

## 12. Amended Environment Variables

ADVISORY-017-SUPPLEMENTAL's env section is replaced:

```env
# Platform AI Pool — Required for AI features to function
PLATFORM_ANTHROPIC_KEY="sk-ant-..."     # Primary pool key
PLATFORM_OPENAI_KEY="sk-..."            # Secondary pool key (translation)

# Encryption key for BYOK tenant keys (Enterprise tier only)
# Required even if no tenants use BYOK — prevents startup failure
AI_SETTINGS_ENCRYPTION_KEY="32-byte-hex"

# Optional: Override default model per provider
# Defaults are defined in src/shared/api/ai/pricing.ts
# AI_DEFAULT_ANTHROPIC_MODEL="claude-haiku-4-5"
# AI_DEFAULT_OPENAI_MODEL="gpt-4o-mini"
```

**Startup guard:** If `PLATFORM_ANTHROPIC_KEY` is absent in production, the `ai-provider`
module automatically sets all `AiTenantQuota.hardCapReachedAt` for the period, causing
graceful degradation across all tenants rather than a runtime crash.

---

## 13. Amended FSD Placement

```
src/shared/api/ai/
├── index.ts            # getAiProvider, isAiCapabilityEnabled, assertAiCapabilityEnabled
├── provider.ts         # AiProvider interface + factory (amended)
├── pool-provider.ts    # PoolProvider (platform pool calls + usage recording)
├── byok-provider.ts    # BYOKProvider (Enterprise BYOK path)
├── throttled-provider.ts # ThrottledProvider (hard cap exceeded)
├── null-provider.ts    # NullProvider (module absent)
├── anthropic.ts        # Raw AnthropicProvider (used internally by Pool/BYOK)
├── openai.ts           # Raw OpenAiProvider (used internally by Pool/BYOK)
├── pool.ts             # getOrCreateQuota, checkAndUpdateThrottle, recordUsage
├── pricing.ts          # AI_PRICING_USD_PER_MILLION, estimateCostUSD
├── encryption.ts       # encryptKey, decryptKey (BYOK only)
└── __tests__/
    ├── provider.test.ts
    ├── pool.test.ts
    └── pricing.test.ts
```

---

## 14. Risk Register (Additions to SUPPLEMENTAL R9–R14)

| ID  | Risk                                                                        | Severity | Mitigation                                                                                                                                                                                                                                                                       |
| --- | --------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R15 | Platform key leaked via error log                                           | CRITICAL | Key never in application code; loaded from env only; `PLATFORM_ANTHROPIC_KEY` added to ESLint `no-restricted-syntax` logger rule alongside tenant keys                                                                                                                           |
| R16 | Single tenant spike exhausts platform key rate limit, degrading all tenants | HIGH     | Per-tenant hard cap is the primary mitigation; additionally, Anthropic's rate limits are per-key per-minute, not per-tenant — a throttled tenant still makes calls, just gets queued. Monitor via PostHog alert on `p99 latency > 5s` for AI routes                              |
| R17 | `AiUsageRecord` table grows unboundedly                                     | MEDIUM   | Partition by month (Postgres partitioning) or purge records older than 13 months (retain current + 12 prior periods for annual reporting). BD issue to track                                                                                                                     |
| R18 | Estimated cost diverges from actual provider invoice                        | LOW      | Monthly reconciliation: query `sum(estimatedCostUSD)` from `AiUsageRecord`, compare to Anthropic invoice. Adjust `AI_PRICING_USD_PER_MILLION` constants when providers change pricing                                                                                            |
| R19 | Tenant tier changes mid-month causes quota mismatch                         | LOW      | Quota row is created at period start with tier's budget at that moment. Mid-month upgrade: platform admin manually creates a corrected quota row. Mid-month downgrade: existing row is not retroactively reduced (tenant keeps the higher budget for the remainder of the month) |
| R20 | `recordUsage` fire-and-forget masks systematic DB failures                  | MEDIUM   | Pino logs all `recordUsage` failures; PostHog alert fires if error rate on usage recording > 1% over 5 minutes                                                                                                                                                                   |

---

## 15. Decision Gates

### GATE G8 — Token Budget Values (DECISION REQUIRED)

The proposed budgets are estimates based on Haiku pricing and expected feature mix.
Are these the correct commercial starting points?

```
STANDARD:   500k input / 100k output  ≈ $0.40–0.80 USD/month cost to platform
PREMIUM:    2M   input / 400k output  ≈ $1.60–3.20 USD/month
ENTERPRISE: 8M   input / 1.6M output  ≈ $6.40–12.80 USD/month
```

At 180 homes (Soralia, STANDARD/PREMIUM-ish), the platform's total AI cost is well
under $5/month. The main risk is a small number of ENTERPRISE tenants with heavy
translation or future AI features.

**Options:**

- A) Confirm proposed values as starting defaults (adjustable via Platform Admin)
- B) Propose different values
- C) Start with lower budgets and raise on tenant request

Recommend A — the Platform Admin UI allows adjustment without a code deploy.

### GATE G9 — Usage Data Retention (DECISION REQUIRED)

`AiUsageRecord` is an audit log. How long should records be retained?

**Options:**

- A) 13 months (current year + prior year for annual reconciliation)
- B) 5 years (aligned with Schedule G SaaS retention obligations — conservative)
- C) Indefinite (simplest, storage cost is negligible for text records)

Recommend B for consistency with the platform's existing audit log standard.

### GATE G10 — Tenant Cost Transparency (DECISION REQUIRED)

Should tenants ever see estimated cost figures, or only token counts / percentages?

**Options:**

- A) Token counts and percentage only (recommended — avoids price anchoring and
  confusion if platform absorbs markup differently per tier)
- B) Show estimated ZAR cost (requires markup calculation and exchange rate handling)
- C) Show "credits consumed" with an abstract unit (decouples from real pricing)

Recommend A. The AI pool is presented as a platform capability, not a metered
commodity. Showing cost figures invites tenants to optimise against the platform's
margin, which is counterproductive.

---

## 16. Amended Done Criteria (Supplemental-B additions)

The following criteria replace or amend those in ADVISORY-017-SUPPLEMENTAL Section 15:

- [ ] ⏳ `AiTierQuota` seed rows exist for STANDARD, PREMIUM, ENTERPRISE
- [ ] ⏳ `getOrCreateQuota(tenantId, month)` creates a new `AiTenantQuota` row lazily on first call
- [ ] ⏳ Atomic increment updates `inputTokensUsed` / `outputTokensUsed` without race condition (verified via concurrent test)
- [ ] ⏳ Hard cap at `>= hardCapMultiplier × budget` returns `ThrottledProvider`
- [ ] `ThrottledProvider.complete()` throws `AiQuotaExceededError` — features degrade correctly
- [ ] ⏳ 80% threshold fires tenant admin notification (check `Notification` table, not just log)
- [ ] ⏳ Hard cap fires platform admin notification
- [ ] ⏳ `AiUsageRecord` rows are written for successful and failed calls
- [ ] `AiUsageRecord` contains `capability` tag on every row — no rows with `capability: 'unknown'` (enforced by TypeScript making field required)
- [ ] ⏳ `estimateCostUSD` returns correct value for Haiku at 1000 input / 500 output tokens (verify: `(1000/1M × 0.80) + (500/1M × 4.00) = $0.00280`)
- [ ] BYOK path bypasses quota entirely — no `AiUsageRecord` written, no quota check
- [ ] BYOK path available only to ENTERPRISE tier — STANDARD/PREMIUM tenants cannot configure BYOK key
- [ ] ⏳ Platform Admin widget shows correct aggregate cost and per-tenant breakdown
- [ ] ⏳ Tenant Admin widget shows percentage consumed, not cost figures
- [ ] ⏳ `PLATFORM_ANTHROPIC_KEY` absence causes graceful degradation (NullProvider), not runtime crash
- [ ] ⏳ `recordUsage` failure is logged but does not propagate to the caller

---

## 17. Summary of Changes to Prior Advisories

| Document                  | Section                | Change                                                                                     |
| ------------------------- | ---------------------- | ------------------------------------------------------------------------------------------ |
| ADVISORY-017-SUPPLEMENTAL | Gate G5                | Resolved: Platform pool confirmed                                                          |
| ADVISORY-017-SUPPLEMENTAL | Section 4 (schema)     | Replaced: no tenant key storage for STANDARD/PREMIUM; BYOK for ENTERPRISE only             |
| ADVISORY-017-SUPPLEMENTAL | Section 5 (AI service) | Replaced: `getAiProvider()` factory now includes quota check and pool routing              |
| ADVISORY-017-SUPPLEMENTAL | Section 8 (Admin UI)   | Replaced: tenant admin sees usage widget, not key management; key mgmt for ENTERPRISE only |
| ADVISORY-017-SUPPLEMENTAL | Section 11 (env vars)  | Replaced: `PLATFORM_ANTHROPIC_KEY` / `PLATFORM_OPENAI_KEY` instead of tenant keys          |
| ADVISORY-017-SUPPLEMENTAL | Gate G6                | Unaffected: Both providers still supported                                                 |
| ADVISORY-017-SUPPLEMENTAL | Gate G7                | Unaffected: Translate route migration timing still open                                    |

---

_This supplemental resolves Gate G5 and introduces Gates G8–G10. All prior open gates  
(G1–G4 from ADVISORY-017, G6–G7 from SUPPLEMENTAL) remain open. Agent must not begin  
Phase A until DavDev confirms all gates for both documents._
