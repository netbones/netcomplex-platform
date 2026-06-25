# ADVISORY-017-SUPPLEMENTAL-2: Platform AI Token Pool

## Amends: ADVISORY-017-SUPPLEMENTAL (AI Provider Module)

**Status:** GATES RESOLVED — Awaiting GSD phase replan  
**Date:** 2026-06-25  
**Scope:** Replaces SUPPLEMENTAL G5 (metered pool decision) with a full platform-pool  
architecture. Resolves G6 (provider scope) implicitly — tenants never hold keys.  
**Decision resolved:** G5 → Platform pool. Tenant-owned keys (SUPPLEMENTAL Sections  
4–6) are **removed** from scope. Tenant API key storage (`ai.anthropic.key` Setting  
entries, `encryption.ts`) is **not built**.

---

## 1. What Changes from SUPPLEMENTAL

SUPPLEMENTAL assumed two modes: tenant-owned keys OR platform pool (G5 undecided).
DavDev has decided: **platform pool only**. This collapses the architecture considerably.

| SUPPLEMENTAL item                                 | Disposition                                                 |
| ------------------------------------------------- | ----------------------------------------------------------- |
| `encryption.ts` / `encryptKey` / `decryptKey`     | **Removed** — not built                                     |
| `ai.anthropic.key` / `ai.openai.key` Setting keys | **Removed** — not stored                                    |
| `POST /api/admin/ai-provider/key` route           | **Removed**                                                 |
| `AiProviderSettingsWidget` key management UI      | **Replaced** — shows pool quota/usage only                  |
| `getAiProvider(tenantId)` resolving tenant key    | **Replaced** — pool-backed factory                          |
| G6 (which providers)                              | **Resolved** — platform chooses; tenants don't know or care |
| G7 (translate migration timing)                   | **Unchanged** — still required                              |
| SUPPLEMENTAL Phases A, B                          | **Replaced** by Phases A′, B′ below                         |

Everything else in SUPPLEMENTAL (NullProvider, capability flags, FSD placement,
graceful degradation, translate migration, dispute intake amendment) **stands unchanged**.

---

## 2. Platform Pool Model

```
┌──────────────────────────────────────────────────────────────┐
│                    NETCOMPLEX PLATFORM                        │
│                                                              │
│  Platform env:                                               │
│  PLATFORM_ANTHROPIC_KEY=sk-ant-...  (live)                   │
│  PLATFORM_OPENAI_KEY=sk-...         (live)                   │
│                                                              │
│  PlatformAiPool (DB):                                        │
│  ├── Tier token quotas    (STANDARD / PREMIUM / ENTERPRISE)  │
│  ├── Per-capability costs (tokens per call, by feature)      │
│  └── Overage policy       (hard-stop | throttle | surcharge) │
└──────────────────┬───────────────────────────────────────────┘
                   │  platform keys, never tenant-visible
          ┌────────┼────────────────┐
          ▼        ▼                ▼
    STANDARD      PREMIUM      ENTERPRISE
    50k tok/mo    200k tok/mo  1M tok/mo
    (included     (included    (included
     in tier)      in tier)     in tier)
          │
          │  per-tenant ledger
          ▼
   TenantAiUsage (DB)
   ├── tokensUsed (rolling month)
   ├── tokensAllotted (from tier quota)
   └── AiUsageEvent[]  (per-call audit log)
```

**Cost flow:** Platform pays Anthropic/OpenAI at wholesale rates. Token quotas are
included in each tier's subscription price (platform absorbs at margin). Overage is
configurable per tenant — hard-stop or surcharge — surfaced in platform admin.

---

## 3. Tier Token Quotas (Proposed — GATE G8)

| Tier       | Monthly token quota | Overage policy                          | Notes                                       |
| ---------- | ------------------- | --------------------------------------- | ------------------------------------------- |
| STANDARD   | 50,000 tokens       | Hard stop                               | ~500 frivolity screens OR ~200 translations |
| PREMIUM    | 200,000 tokens      | Throttle to 1 req/min                   | ~2,000 frivolity screens                    |
| ENTERPRISE | 1,000,000 tokens    | Surcharge (platform admin configurable) | Soralia anchor                              |

Token counts are **combined across all AI capabilities** for a tenant in a billing month.
The platform admin can override any tenant's quota individually (e.g. Soralia as anchor
tenant gets ENTERPRISE quota regardless of tier).

**Estimated cost at Anthropic Haiku pricing (June 2026 ~$0.25/M input, $1.25/M output):**

- STANDARD 50k tokens ≈ $0.025–0.063/month — negligible platform cost
- ENTERPRISE 1M tokens ≈ $0.50–1.25/month — easily absorbed in tier margin

These numbers make a strong case for inclusion in tier price rather than metered
billing. Metered billing adds significant operational complexity for ~$1/month of
actual AI cost at current scale. Recommend revisiting metered billing only when
token consumption patterns are understood from production data.

---

## 4. Schema — New Models

```prisma
// ── Platform AI Pool ──

model PlatformAiTierQuota {
  id              String   @id @default(cuid())
  tier            Tier     @unique
  monthlyTokens   Int                       // total tokens included per month
  overagePolicy   AiOveragePolicy @default(HARD_STOP)
  overageTokens   Int      @default(0)      // additional tokens allowed under surcharge
  overagePriceZAR Decimal  @default(0) @db.Decimal(10, 4) // per-token surcharge
  updatedAt       DateTime @updatedAt
  updatedById     String?                   // platform admin user id
}

model AiCapabilityCost {
  id              String         @id @default(cuid())
  capability      String         @unique  // AiCapabilityKey — e.g. 'ai.disputes.frivolityScreen'
  estimatedTokens Int                     // expected tokens per call (for quota pre-check)
  maxTokens       Int                     // hard cap passed to provider
  notes           String?
  updatedAt       DateTime       @updatedAt
}

model TenantAiUsage {
  id              String   @id @default(cuid())
  tenantId        String
  billingMonth    String                   // 'YYYY-MM'
  tokensAllotted  Int                      // snapshot of quota at period start
  tokensUsed      Int      @default(0)
  overageTokens   Int      @default(0)
  overageCostZAR  Decimal  @default(0) @db.Decimal(10, 4)
  status          AiUsageStatus @default(ACTIVE)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  events          AiUsageEvent[]

  @@unique([tenantId, billingMonth])
  @@index([tenantId])
  @@index([billingMonth])
}

model AiUsageEvent {
  id           String   @id @default(cuid())
  tenantId     String
  usageId      String                     // FK to TenantAiUsage
  capability   String                     // AiCapabilityKey
  provider     String                     // 'anthropic' | 'openai'
  model        String                     // e.g. 'claude-haiku-4-5'
  inputTokens  Int
  outputTokens Int
  totalTokens  Int
  userId       String?                    // which user triggered the call
  referenceId  String?                    // e.g. disputeId, contentId
  durationMs   Int?
  success      Boolean  @default(true)
  errorCode    String?
  createdAt    DateTime @default(now())

  usage        TenantAiUsage @relation(fields: [usageId], references: [id])

  @@index([tenantId, createdAt])
  @@index([capability])
  @@index([usageId])
}
```

### New enums:

```prisma
enum AiOveragePolicy {
  HARD_STOP      // reject all AI calls when quota exhausted
  THROTTLE       // allow but rate-limit to 1 req/min
  SURCHARGE      // allow and record overage cost for billing
}

enum AiUsageStatus {
  ACTIVE         // current billing period
  SETTLED        // period closed, usage finalised
  OVERRIDDEN     // platform admin manually adjusted
}
```

### Seed data for `PlatformAiTierQuota` (runs in `prisma/seed/modules.ts`):

```typescript
await db.platformAiTierQuota.createMany({
  data: [
    { tier: 'STANDARD', monthlyTokens: 50_000, overagePolicy: 'HARD_STOP' },
    { tier: 'PREMIUM', monthlyTokens: 200_000, overagePolicy: 'THROTTLE' },
    {
      tier: 'ENTERPRISE',
      monthlyTokens: 1_000_000,
      overagePolicy: 'SURCHARGE',
      overageTokens: 500_000,
      overagePriceZAR: 0.0001,
    },
  ],
  skipDuplicates: true,
});
```

### Seed data for `AiCapabilityCost`:

```typescript
await db.aiCapabilityCost.createMany({
  data: [
    { capability: 'ai.disputes.frivolityScreen', estimatedTokens: 300, maxTokens: 500 },
    { capability: 'ai.content.translation', estimatedTokens: 800, maxTokens: 2000 },
    { capability: 'ai.content.moderation', estimatedTokens: 200, maxTokens: 300 },
    { capability: 'ai.maintenance.triage', estimatedTokens: 400, maxTokens: 600 },
  ],
  skipDuplicates: true,
});
```

---

## 5. Pool-Backed Provider Factory (replaces SUPPLEMENTAL Section 5)

```
src/shared/api/ai/
├── index.ts            # public barrel (unchanged from SUPPLEMENTAL)
├── provider.ts         # AiProvider interface + pool-backed factory (REPLACED)
├── anthropic.ts        # AnthropicProvider (unchanged)
├── openai.ts           # OpenAiProvider (unchanged)
├── null-provider.ts    # NullProvider (unchanged)
├── pool.ts             # NEW — quota check, usage recording, overage enforcement
└── __tests__/
    ├── provider.test.ts
    └── pool.test.ts    # NEW
```

### `pool.ts` — quota enforcement:

```typescript
// src/shared/api/ai/pool.ts

export interface PoolCallOptions {
  tenantId: string;
  capability: AiCapabilityKey;
  userId?: string;
  referenceId?: string;
}

export interface PoolCallResult {
  allowed: boolean;
  denyReason?: 'quota_exhausted' | 'module_disabled';
  remainingTokens: number;
}

/**
 * Pre-flight check: can this tenant make an AI call for this capability?
 * Reads TenantAiUsage for current billing month and checks against PlatformAiTierQuota.
 * Does NOT increment usage — that happens in recordUsage() after the call succeeds.
 */
export async function checkQuota(
  tenantId: string,
  capability: AiCapabilityKey,
  db: DrizzleDb
): Promise<PoolCallResult> {
  const month = getCurrentBillingMonth(); // 'YYYY-MM'
  const usage = await getOrCreateUsage(tenantId, month, db);
  const cost = await getCapabilityCost(capability, db);
  const quota = await getTierQuota(tenantId, db);

  const remaining = usage.tokensAllotted - usage.tokensUsed;

  if (remaining <= 0) {
    if (quota.overagePolicy === 'HARD_STOP') {
      return { allowed: false, denyReason: 'quota_exhausted', remainingTokens: 0 };
    }
    // THROTTLE and SURCHARGE — allowed, handled post-call
  }

  if (remaining < cost.estimatedTokens && quota.overagePolicy === 'HARD_STOP') {
    return { allowed: false, denyReason: 'quota_exhausted', remainingTokens: remaining };
  }

  return { allowed: true, remainingTokens: remaining };
}

/**
 * Post-call: record actual token usage against the tenant ledger.
 * Called after every successful OR failed AI call — failures still count
 * against quota to prevent retry-spam.
 */
export async function recordUsage(
  options: PoolCallOptions & {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    success: boolean;
    errorCode?: string;
  },
  db: DrizzleDb
): Promise<void> {
  const month = getCurrentBillingMonth();
  const usage = await getOrCreateUsage(options.tenantId, month, db);
  const total = options.inputTokens + options.outputTokens;

  const quota = await getTierQuota(options.tenantId, db);
  const allotted = usage.tokensAllotted;
  const newUsed = usage.tokensUsed + total;
  const overage = Math.max(0, newUsed - allotted);
  const overageCost = overage * Number(quota.overagePriceZAR);

  await db.transaction(async tx => {
    // Update rolling usage counter
    await tx
      .update(tenantAiUsage)
      .set({
        tokensUsed: newUsed,
        overageTokens: usage.overageTokens + overage,
        overageCostZAR: (Number(usage.overageCostZAR) + overageCost).toFixed(4),
        updatedAt: new Date(),
      })
      .where(eq(tenantAiUsage.id, usage.id));

    // Append immutable audit event
    await tx.insert(aiUsageEvent).values({
      id: cuid(),
      tenantId: options.tenantId,
      usageId: usage.id,
      capability: options.capability,
      provider: options.provider,
      model: options.model,
      inputTokens: options.inputTokens,
      outputTokens: options.outputTokens,
      totalTokens: total,
      userId: options.userId ?? null,
      referenceId: options.referenceId ?? null,
      durationMs: options.durationMs,
      success: options.success,
      errorCode: options.errorCode ?? null,
    });
  });
}
```

### Updated `getAiProvider` factory:

```typescript
// src/shared/api/ai/provider.ts  (replaces SUPPLEMENTAL version)

export async function getAiProvider(tenantId: string): Promise<AiProvider> {
  const module = await getTenantModule(tenantId, 'ai-provider');
  if (!module?.enabled) return new NullProvider();

  // Platform pool — keys come from env, never from tenant config
  const config = getPoolProviderConfig(); // reads PLATFORM_ANTHROPIC_KEY etc.
  if (!config) return new NullProvider();

  return config.defaultProvider === 'openai'
    ? new OpenAiProvider(config.openaiKey)
    : new AnthropicProvider(config.anthropicKey);
}

function getPoolProviderConfig(): {
  defaultProvider: 'anthropic' | 'openai';
  anthropicKey: string;
  openaiKey: string;
} | null {
  const anthropicKey = process.env.PLATFORM_ANTHROPIC_KEY;
  const openaiKey = process.env.PLATFORM_OPENAI_KEY;
  if (!anthropicKey && !openaiKey) return null;
  return {
    defaultProvider: anthropicKey ? 'anthropic' : 'openai',
    anthropicKey: anthropicKey ?? '',
    openaiKey: openaiKey ?? '',
  };
}
```

### How a callsite uses the pool (complete pattern):

```typescript
// Example: src/app/api/disputes/intake-screen/route.ts

import { getAiProvider, isAiCapabilityEnabled } from '@shared/api/ai';
import { checkQuota, recordUsage } from '@shared/api/ai/pool';

export async function POST(request: Request) {
  const { tenantId } = await withTenant(request);
  const { userId } = await getSessionAndRole(request);

  if (!(await isAiCapabilityEnabled(tenantId, 'ai.disputes.frivolityScreen'))) {
    return apiError('AI dispute screening not available', 503);
  }

  // 1. Pre-flight quota check
  const quota = await checkQuota(tenantId, 'ai.disputes.frivolityScreen', db);
  if (!quota.allowed) {
    return apiError(
      `AI token quota exhausted for this month (${quota.remainingTokens} remaining). ` +
        `Upgrade your plan or wait until next billing period.`,
      429,
      { code: 'AI_QUOTA_EXHAUSTED', remainingTokens: quota.remainingTokens }
    );
  }

  const provider = await getAiProvider(tenantId);
  if (!provider.isAvailable()) {
    return apiError('AI service temporarily unavailable', 503);
  }

  // 2. Sanitise (existing per ADVISORY-017)
  const { description, disputeId } = await request.json();
  const sanitised = sanitiseForAi(description);

  // 3. Call
  const start = Date.now();
  let result: AiCompletionResult;
  let success = true;
  let errorCode: string | undefined;

  try {
    result = await provider.complete(sanitised, {
      systemPrompt: FRIVOLITY_SCREEN_SYSTEM_PROMPT,
      maxTokens: 500,
      jsonMode: true,
    });
  } catch (err) {
    success = false;
    errorCode = err instanceof Error ? err.message.slice(0, 50) : 'UNKNOWN';
    result = { text: '', provider: provider.name, tokensUsed: 0 };
  }

  // 4. Record usage (always — even on failure)
  await recordUsage(
    {
      tenantId,
      capability: 'ai.disputes.frivolityScreen',
      userId,
      referenceId: disputeId,
      provider: result.provider,
      model: 'claude-haiku-4-5',
      inputTokens: estimateInputTokens(sanitised),
      outputTokens: result.tokensUsed ?? 0,
      durationMs: Date.now() - start,
      success,
      errorCode,
    },
    db
  );

  if (!success) {
    return apiError('AI screening unavailable — you may proceed without it', 503);
  }

  // 5. Parse and return
  try {
    const parsed = JSON.parse(result.text);
    return apiSuccess(parsed);
  } catch {
    return apiSuccess({ toneScore: 0, likelyFrivolous: false, deEscalationTip: null });
  }
}
```

---

## 6. Platform Admin — Pool Management

Platform admins (`isPlatformAdmin: true`) get a dedicated pool management view under
`/platform/home` (existing platform admin route):

```
┌──────────────────────────────────────────────────────────────┐
│ AI Token Pool Management                     [Platform Admin] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Pool Status:  ● Anthropic connected  ○ OpenAI connected      │
│ Current Month: June 2026                                      │
│                                                              │
│ TIER QUOTAS                          [Edit Quotas]           │
│ STANDARD    50,000 tok/mo   Hard stop                        │
│ PREMIUM    200,000 tok/mo   Throttle                         │
│ ENTERPRISE 1,000,000 tok/mo Surcharge @ R0.0001/tok          │
│                                                              │
│ TENANT USAGE — June 2026              [Export CSV]           │
│ ┌─────────────────────────────────────────────────────┐      │
│ │ Tenant          Tier       Used       Allotted  %   │      │
│ │ Soralia Village ENTERPRISE 12,450     1,000,000  1% │      │
│ │ Solaris Heights STANDARD   48,200     50,000    96% │      │  ← near limit
│ │ The Palms       PREMIUM    3,100      200,000    2% │      │
│ └─────────────────────────────────────────────────────┘      │
│                                                              │
│ CAPABILITY COSTS                     [Edit]                  │
│ ai.disputes.frivolityScreen   ~300 tok/call                  │
│ ai.content.translation        ~800 tok/call                  │
│                                                              │
│ TENANT OVERRIDE                                              │
│ [Select tenant ▾]  Custom quota: [______] tok/mo  [Apply]   │
└──────────────────────────────────────────────────────────────┘
```

### Platform admin API routes (under `/api/admin/platform/`):

| Route                                          | Method     | Purpose                                |
| ---------------------------------------------- | ---------- | -------------------------------------- |
| `/api/admin/platform/ai-pool/quotas`           | GET, PATCH | Read/update tier quotas                |
| `/api/admin/platform/ai-pool/usage`            | GET        | All tenant usage for a billing month   |
| `/api/admin/platform/ai-pool/usage/[tenantId]` | GET        | Single tenant usage + event log        |
| `/api/admin/platform/ai-pool/override`         | POST       | Set custom quota for a tenant          |
| `/api/admin/platform/ai-pool/costs`            | GET, PATCH | Read/update per-capability token costs |
| `/api/admin/platform/ai-pool/status`           | GET        | Provider connectivity check            |

All routes: `isPlatformAdmin` guard. No tenant-scoped auth — these are global.

---

## 7. Tenant Admin — Usage Widget

Tenant admins (BOARD, ADMIN) see a read-only usage summary in their admin space:

```
┌─────────────────────────────────────────┐
│ AI Usage — June 2026                    │
│                                         │
│ 12,450 / 1,000,000 tokens used    1.2%  │
│ ████░░░░░░░░░░░░░░░░░░░░░░░░░░          │
│                                         │
│ By feature this month:                  │
│ Dispute screening    8,200 tok  66%     │
│ Locale translation   4,250 tok  34%     │
│                                         │
│ Resets: 1 July 2026                     │
│ Plan: Enterprise (1M tokens/month)       │
└─────────────────────────────────────────┘
```

Widget ID: `admin-ai-usage`  
Space: `admin`  
Permissions: `['admin', 'board']`  
featureFlag: `'ai-provider'`

This replaces the key management UI from SUPPLEMENTAL — tenant admins cannot
configure provider keys (there are none to configure). They only see consumption.

---

## 8. Environment Variables (Replaces SUPPLEMENTAL Section 11)

```env
# Platform AI Pool — NetComplex platform keys (never per-tenant)
# Both optional — whichever is present is used; Anthropic preferred
PLATFORM_ANTHROPIC_KEY="sk-ant-..."
PLATFORM_OPENAI_KEY="sk-..."

# Default provider when both keys are present
PLATFORM_AI_DEFAULT_PROVIDER="anthropic"   # 'anthropic' | 'openai'

# Removed from SUPPLEMENTAL (not built):
# AI_SETTINGS_ENCRYPTION_KEY  — not needed (no tenant key storage)
```

**Security posture:** Platform keys live in Vercel environment variables (project-level,
not edge-accessible). They are read only in server-side routes. They are never
interpolated into client bundles, logs, or API responses. The pool status endpoint
returns `{ anthropicConnected: true }` — not the key prefix.

---

## 9. Billing Month Management

The billing month is `YYYY-MM` string derived from `new Date()` in UTC. A monthly
cron job (or Vercel scheduled function) runs on the 1st of each month to:

1. `SETTLE` all `TenantAiUsage` records from the previous month (status → `SETTLED`)
2. Create fresh `TenantAiUsage` records for the new month, reading current tier quota
3. For ENTERPRISE tenants with `SURCHARGE` overage, generate a platform invoice
   record (future — tracked in forward items)

```typescript
// src/app/api/cron/ai-pool-rollover/route.ts
export const maxDuration = 30;

export async function POST(request: Request) {
  // Vercel cron — verify CRON_SECRET header
  const prevMonth = getPreviousBillingMonth();

  await db.transaction(async tx => {
    // Settle previous month
    await tx
      .update(tenantAiUsage)
      .set({ status: 'SETTLED', updatedAt: new Date() })
      .where(and(eq(tenantAiUsage.billingMonth, prevMonth), eq(tenantAiUsage.status, 'ACTIVE')));

    // New month records created lazily in getOrCreateUsage()
    // Cron only needs to settle — creation happens on first AI call
  });

  return apiSuccess({ settled: prevMonth });
}
```

---

## 10. `TenantAiUsage.tokensAllotted` Snapshot Logic

When `getOrCreateUsage()` creates a new month's record, it snapshots the tenant's
current tier quota into `tokensAllotted`. This means:

- A tenant upgrading from STANDARD to PREMIUM mid-month gets the PREMIUM quota
  **next month** (snapshot taken at month rollover)
- A platform admin override applies immediately by directly updating the current
  month's `tokensAllotted` field
- Downgrade is similarly deferred to next month

This is the same "snapshot at period start" pattern used by `ProviderSubscription`
and is consistent with how SaaS billing periods work.

---

## 11. Quota Warning Notifications

When a tenant reaches 80% of monthly quota, a `Notification` record is created
for all ADMIN-role users in that tenant:

```typescript
// Inside recordUsage(), after the update:
const usagePct = newUsed / usage.tokensAllotted;

if (usagePct >= 0.8 && usagePct - total / usage.tokensAllotted < 0.8) {
  // Just crossed 80% — send once per month
  await notifyTenantAdmins(tenantId, {
    type: 'warning',
    title: 'AI token quota at 80%',
    message:
      `Your community has used ${Math.round(usagePct * 100)}% of its ` +
      `monthly AI token allowance. Some AI features may become ` +
      `unavailable before the end of the month.`,
    link: '/dashboard/admin',
  });
}
```

At 100% (hard stop tenants), the notification reads:

> "Your community's AI token quota for June is exhausted. AI features are
> temporarily unavailable until 1 July. Contact support to discuss an upgrade."

---

## 12. Amended FSD Placement

```
src/shared/api/ai/
├── index.ts            # getAiProvider, isAiCapabilityEnabled, assertAiCapabilityEnabled
├── provider.ts         # AiProvider interface, pool-backed factory (no encryption)
├── anthropic.ts        # AnthropicProvider
├── openai.ts           # OpenAiProvider
├── null-provider.ts    # NullProvider
├── pool.ts             # checkQuota, recordUsage, getOrCreateUsage
└── __tests__/
    ├── provider.test.ts
    └── pool.test.ts

src/app/api/
├── admin/platform/
│   └── ai-pool/
│       ├── quotas/route.ts
│       ├── usage/route.ts
│       ├── usage/[tenantId]/route.ts
│       ├── override/route.ts
│       ├── costs/route.ts
│       └── status/route.ts
└── cron/
    └── ai-pool-rollover/route.ts
```

**Removed from SUPPLEMENTAL FSD:**

- `src/shared/api/ai/encryption.ts` — not built
- `src/app/api/admin/ai-provider/key/route.ts` — not built
- `AiProviderSettingsWidget.tsx` key management sections — replaced with usage-only widget

---

## 13. Risk Register (Supplemental additions)

| ID  | Risk                                                                     | Severity | Mitigation                                                                                                                                        |
| --- | ------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| R15 | Platform key exposed in Vercel build logs                                | CRITICAL | Keys set as encrypted env vars in Vercel dashboard; never in `.env` committed to git; `vercel env` CLI only                                       |
| R16 | Single platform key failure takes down AI for all tenants simultaneously | HIGH     | `NullProvider` fallback; all AI features degrade gracefully; 503 is user-friendly not a crash                                                     |
| R17 | Token count inaccuracy — `estimateInputTokens()` underestimates          | MEDIUM   | Add 20% buffer to estimates; actual output tokens always recorded exactly from API response                                                       |
| R18 | Cron rollover fails — previous month not settled                         | MEDIUM   | `getOrCreateUsage()` is idempotent; worst case is two active records for different months; add Vercel cron alert                                  |
| R19 | High-volume tenant exhausts quota in first week                          | LOW      | 80% warning notification; platform admin can apply override; ENTERPRISE gets THROTTLE not HARD_STOP                                               |
| R20 | `recordUsage` DB write fails after successful AI call                    | LOW      | Wrap in try/catch; log failure; do not surface to user — undercounting is preferable to blocking the call                                         |
| R21 | Overage surcharge accumulates without billing infrastructure             | MEDIUM   | SURCHARGE policy only available to ENTERPRISE; overage cost recorded but not invoiced automatically in v1 — platform admin reviews monthly export |

---

## 14. Decision Gates (Supplemental 2)

### GATE G8 — Token Quota Values ✅ RESOLVED 2026-06-25

**Decision:** STANDARD 50,000 / PREMIUM 200,000 / ENTERPRISE 500,000 tokens/month.
ENTERPRISE reduced from proposed 1M to 500k — conservative for anchor launch; upgradable based on production data.

### GATE G9 — Overage Surcharge Pricing ✅ RESOLVED 2026-06-25

**Decision:** R0.0001/token (~R100/1M overage). ENTERPRISE only. Overage recorded but NOT auto-invoiced in v1 — platform admin reviews monthly export until billing integration exists.

### GATE G10 — Billing Month Boundary ✅ RESOLVED 2026-06-25

**Decision:** Calendar month (1st–last). Resets on the 1st of each month. Cron rollover: SETTLE previous month, lazy-create new month on first AI call.

---

## 15. Amended Phase Plan

Replaces SUPPLEMENTAL Phases A and B entirely.

### Phase A′ — Platform AI Pool Infrastructure

```bash
# Pre-execution discovery
grep -n "PlatformAiTierQuota\|AiCapabilityCost\|TenantAiUsage\|AiUsageEvent" \
  prisma/schema.prisma 2>/dev/null | head -5  # expect: empty

ls src/shared/api/ai/ 2>/dev/null || echo "absent — expected"

# Confirm platform key env vars are set in Vercel (manual check)
# PLATFORM_ANTHROPIC_KEY and/or PLATFORM_OPENAI_KEY must exist before Phase A′ executes
```

1. Add 4 new models + 2 new enums to `prisma/schema.prisma`
2. `npx prisma migrate dev --name add_ai_pool`
3. `npx prisma generate`
4. Seed `PlatformAiTierQuota` and `AiCapabilityCost` (after Gate G8 confirmed)
5. Create `src/shared/api/ai/` layer (pool-backed factory, no encryption)
6. Create platform admin routes under `/api/admin/platform/ai-pool/`
7. Create `admin-ai-usage` tenant widget (usage-only, no key management)
8. Register `admin-ai-usage` widget in `widgets.ts`
9. Create cron route `api/cron/ai-pool-rollover/route.ts`

**STOP AND ESCALATE:** If `PLATFORM_ANTHROPIC_KEY` is not set in the Vercel environment
at time of Phase A′ execution, stop. The pool cannot be tested without a live key.
Do not proceed with mock/fake keys — they will pass unit tests but fail integration.

### Phase B′ — Translate Route Migration (unchanged from SUPPLEMENTAL Phase B)

No changes from SUPPLEMENTAL Phase B. Translate route migrates to `getAiProvider()`.
`LocaleAwareEditor.tsx` degraded state implemented.

**Amended:** The 503 message for translate should now include quota context:

> "Translation unavailable — your community's AI quota may be exhausted, or the AI
> service is temporarily unavailable."

### Then: ADVISORY-017 Phase 3 continues (disputes intake-screen uses pool pattern)

---

## 16. Done Criteria (Supplemental 2 additions)

- [ ] `PlatformAiTierQuota` seeded with all 3 tiers
- [ ] `AiCapabilityCost` seeded with all 4 capabilities
- [ ] `checkQuota()` returns `{ allowed: false }` when `tokensUsed >= tokensAllotted` (HARD_STOP)
- [ ] `recordUsage()` creates an `AiUsageEvent` record on every call (success and failure)
- [ ] `TenantAiUsage` monthly record is idempotent — calling `getOrCreateUsage()` twice returns same record
- [ ] Platform admin `/api/admin/platform/ai-pool/usage` returns all tenants for a billing month
- [ ] Platform admin can override a tenant quota via `/api/admin/platform/ai-pool/override`
- [ ] `admin-ai-usage` widget renders token bar + breakdown for tenant admins
- [ ] `admin-ai-usage` widget not visible to RESIDENT role
- [ ] 80% quota notification fires exactly once per month per tenant (not on every call above 80%)
- [ ] Cron `/api/cron/ai-pool-rollover` settles previous month records; new records created lazily
- [ ] `PLATFORM_ANTHROPIC_KEY` not present in any committed file; only in Vercel env
- [ ] `getAiProvider()` returns `NullProvider` when `PLATFORM_ANTHROPIC_KEY` and `PLATFORM_OPENAI_KEY` are both absent
- [ ] All prior SUPPLEMENTAL done criteria remain valid except the 3 removed items (key storage, key route, key UI)

---

## 17. Forward Items

| Item                                                                         | Tracking                              |
| ---------------------------------------------------------------------------- | ------------------------------------- |
| ENTERPRISE surcharge auto-invoicing (currently manual review)                | Future — requires billing integration |
| Per-feature quota sub-limits (e.g. cap translation separately from disputes) | Future — adds ledger complexity       |
| AI usage analytics page (charts, trends, per-capability breakdown)           | Future — Analytics module             |
| Provider failover (if Anthropic down, fall back to OpenAI)                   | Future — adds retry logic to pool     |
| Tenant-visible quota top-up purchasing (self-serve)                          | Future — requires payment integration |

---

_This document supersedes SUPPLEMENTAL on all points listed in Section 1.  
SUPPLEMENTAL remains authoritative on: NullProvider, AiProvider interface, capability  
flags, FSD layer rules, translate route migration pattern, dispute intake amendment,  
Ubiquitous Language additions, and Gates G6 (resolved: both providers) and G7._

_Gates G8–G10 must be resolved before Phase A′ seed execution. Gates G1–G4  
(ADVISORY-017) and G7 (SUPPLEMENTAL) remain open._
