import 'server-only';

import { eq, and, sql } from 'drizzle-orm';
import {
  db,
  tenantAiUsages,
  aiUsageEvents,
  platformAiTierQuotas,
  aiCapabilityCosts,
  tenants,
  users,
  notifications,
} from '../db';
import type { AiCapabilityKey } from '@entities/tenant/server';
import { estimateCostUSD } from './pricing';

// ── Types ──────────────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────

/** Returns current UTC billing month as YYYY-MM. */
export function getCurrentBillingMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Idempotent — calling twice for same month returns the same record. */
export async function getOrCreateUsage(tenantId: string, month: string, tx = db) {
  const existing = await tx
    .select()
    .from(tenantAiUsages)
    .where(and(eq(tenantAiUsages.tenantId, tenantId), eq(tenantAiUsages.billingMonth, month)))
    .limit(1);

  if (existing[0]) return existing[0];

  const quota = await getTierQuota(tenantId, tx);

  const [created] = await tx
    .insert(tenantAiUsages)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      billingMonth: month,
      tokensAllotted: quota.monthlyTokens,
      tokensUsed: 0,
      overageTokens: 0,
      overageCostZAR: '0',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return created;
}

/** Read tenant tier, then look up its quota record. */
export async function getTierQuota(tenantId: string, tx = db) {
  const [tenant] = await tx
    .select({ tier: tenants.tier })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const tier = tenant?.tier ?? 'STANDARD';

  const [quota] = await tx
    .select()
    .from(platformAiTierQuotas)
    .where(eq(platformAiTierQuotas.tier, tier))
    .limit(1);

  return quota;
}

/** Look up the token cost estimate for a given AI capability. */
export async function getCapabilityCost(capability: AiCapabilityKey, tx = db) {
  const [cost] = await tx
    .select()
    .from(aiCapabilityCosts)
    .where(eq(aiCapabilityCosts.capability, capability))
    .limit(1);

  return cost;
}

// ── Quota Enforcement ───────────────────────────────────────────────────

/**
 * Pre-flight check: can this tenant make an AI call for this capability?
 * Reads TenantAiUsage for current billing month and checks against
 * PlatformAiTierQuota. Does NOT increment usage — recordUsage() does that.
 */
export async function checkQuota(
  tenantId: string,
  capability: AiCapabilityKey,
  tx = db
): Promise<PoolCallResult> {
  const month = getCurrentBillingMonth();
  const usage = await getOrCreateUsage(tenantId, month, tx);
  const cost = await getCapabilityCost(capability, tx);
  const quota = await getTierQuota(tenantId, tx);

  const remaining = usage.tokensAllotted - usage.tokensUsed;

  // Already exhausted
  if (remaining <= 0) {
    if (quota.overagePolicy === 'HARD_STOP') {
      return {
        allowed: false,
        denyReason: 'quota_exhausted',
        remainingTokens: 0,
      };
    }
    // THROTTLE and SURCHARGE allow — policy enforced post-call
  }

  // Not enough remaining for this capability's estimated cost
  if (remaining < cost.estimatedTokens && quota.overagePolicy === 'HARD_STOP') {
    return {
      allowed: false,
      denyReason: 'quota_exhausted',
      remainingTokens: remaining,
    };
  }

  return { allowed: true, remainingTokens: remaining };
}

// ── Usage Recording ─────────────────────────────────────────────────────

/**
 * Post-call: record actual token usage against the tenant ledger.
 * Called after every successful OR failed AI call — failures still count
 * against quota to prevent retry-spam abuse.
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
  tx = db
): Promise<void> {
  const month = getCurrentBillingMonth();
  const usage = await getOrCreateUsage(options.tenantId, month, tx);
  const quota = await getTierQuota(options.tenantId, tx);
  const total = options.inputTokens + options.outputTokens;

  const allotted = usage.tokensAllotted;
  const newUsed = usage.tokensUsed + total;
  const overage = Math.max(0, newUsed - allotted);
  const estimatedCostUSD = estimateCostUSD(
    options.provider,
    options.model,
    options.inputTokens,
    options.outputTokens
  );
  // Use Decimal.js or raw SQL for precise arithmetic to avoid float issues with large costs
  const overageCost = sql`(${overage})::numeric * ${quota.overagePriceZAR}`;

  await tx.transaction(async trx => {
    await trx
      .update(tenantAiUsages)
      .set({
        tokensUsed: newUsed,
        overageTokens: sql`${tenantAiUsages.overageTokens} + ${overage}`,
        overageCostZAR: sql`${tenantAiUsages.overageCostZAR} + ${overageCost}`,
        updatedAt: new Date(),
      })
      .where(eq(tenantAiUsages.id, usage.id));

    await trx.insert(aiUsageEvents).values({
      id: crypto.randomUUID(),
      tenantId: options.tenantId,
      usageId: usage.id,
      capability: options.capability,
      provider: options.provider,
      model: options.model,
      inputTokens: options.inputTokens,
      outputTokens: options.outputTokens,
      totalTokens: total,
      estimatedCostUSD: estimatedCostUSD.toFixed(6),
      userId: options.userId ?? null,
      referenceId: options.referenceId ?? null,
      durationMs: options.durationMs,
      success: options.success,
      errorCode: options.errorCode ?? null,
    });
  });

  // ── 80% quota warning (fire-once: only when crossing threshold) ──
  try {
    const usagePct = newUsed / allotted;
    const prevPct = (newUsed - total) / allotted;

    if (usagePct >= 0.8 && prevPct < 0.8) {
      const adminUsers = await tx
        .select({ id: users.id, tenantId: users.tenantId })
        .from(users)
        .where(and(eq(users.tenantId, options.tenantId), sql`${users.role} IN ('ADMIN', 'BOARD')`));

      if (adminUsers.length > 0) {
        await tx.insert(notifications).values(
          adminUsers.map(u => ({
            id: crypto.randomUUID(),
            tenantId: u.tenantId,
            userId: u.id,
            title: 'AI token quota at 80%',
            message: `Your community has used ${Math.round(usagePct * 100)}% of its monthly AI token allowance (${month}). Some AI features may become unavailable before the end of the month.`,
            type: 'warning' as const,
            read: false,
          }))
        );
      }
    }
  } catch {
    // ponytail: notification failure must not block usage recording.
    // Upgrade path: if this surfaces in production, add Pino warn log.
  }
}
