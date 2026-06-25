/**
 * Tenant tier synchronization from active subscription plan.
 *
 * Reads the tenant's ACTIVE subscription plan tier and writes it to
 * the tenants.tier column. Respects tierManualOverride on subscriptions
 * and only transitions between valid Tier enum values.
 *
 * Mirrors the syncTierToTenant function inline in tenant-billing.ts
 * but exposes a standalone read-only deriveTenantTier for external use.
 */

import 'server-only';

import { eq } from 'drizzle-orm';
import { db } from '@api/server';
import { tenants } from '@schema/tenants';
import { tenantSubscriptions } from '@schema/tenant-subscriptions';
import { billingPlans } from '@schema/billing-plans';
import { createComponentLogger } from '@/shared/lib';

const tierSyncLogger = createComponentLogger('tier-sync');

/**
 * Reads the Tier that SHOULD be set based on the tenant's active subscription.
 * Does NOT write to the database — read-only diagnostic.
 *
 * Returns null if the tenant has no active subscription or no billing plan.
 */
export async function deriveTenantTier(
  tenantId: string
): Promise<'STANDARD' | 'PREMIUM' | 'ENTERPRISE' | null> {
  const subscriptions = await db
    .select()
    .from(tenantSubscriptions)
    .where(eq(tenantSubscriptions.tenantId, tenantId));

  const active = subscriptions.find(sub => sub.status === 'ACTIVE');
  if (!active) {
    tierSyncLogger.info({ tenantId }, 'No active subscription — cannot derive tier');
    return null;
  }

  const [plan] = await db
    .select({ tier: billingPlans.tier })
    .from(billingPlans)
    .where(eq(billingPlans.id, active.planId))
    .limit(1);

  if (!plan) {
    tierSyncLogger.warn(
      { tenantId, planId: active.planId },
      'Billing plan not found for active subscription'
    );
    return null;
  }

  return plan.tier as 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
}

/**
 * Synchronizes the tenant's tier from the active subscription plan.
 * This function is also called inline by tenant-billing.ts after mutations.
 *
 * Guards:
 *   - Skips if no ACTIVE subscription exists
 *   - Skips if tierManualOverride is true on the subscription
 *   - Skips if billing plan is not found
 *   - Only writes if tier actually changed
 *   - Logs warnings if tenant.tier is not a valid Tier enum value
 */
export async function syncTierToTenant(tenantId: string): Promise<void> {
  const subscriptions = await db
    .select()
    .from(tenantSubscriptions)
    .where(eq(tenantSubscriptions.tenantId, tenantId));

  const active = subscriptions.find(sub => sub.status === 'ACTIVE');

  if (!active) {
    tierSyncLogger.warn({ tenantId }, 'No active tenant subscription found; tier not synced');
    return;
  }

  if (active.tierManualOverride) {
    tierSyncLogger.info(
      { tenantId, subscriptionId: active.id },
      'Tier sync skipped — tierManualOverride is true'
    );
    return;
  }

  const [plan] = await db
    .select({ tier: billingPlans.tier })
    .from(billingPlans)
    .where(eq(billingPlans.id, active.planId))
    .limit(1);

  if (!plan) {
    tierSyncLogger.warn(
      { tenantId, planId: active.planId },
      'Billing plan not found for active subscription; tier not synced'
    );
    return;
  }

  const [tenant] = await db
    .select({ id: tenants.id, tier: tenants.tier })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    tierSyncLogger.warn({ tenantId }, 'Tenant not found; tier not synced');
    return;
  }

  const validTiers = ['STANDARD', 'PREMIUM', 'ENTERPRISE'];
  if (tenant.tier && !validTiers.includes(tenant.tier)) {
    tierSyncLogger.warn(
      { tenantId, currentTier: tenant.tier },
      'Tenant tier is not a valid Tier enum value; sync proceeding'
    );
  }

  if (plan.tier !== tenant.tier) {
    await db
      .update(tenants)
      .set({ tier: plan.tier as 'STANDARD' | 'PREMIUM' | 'ENTERPRISE' })
      .where(eq(tenants.id, tenantId));

    tierSyncLogger.info(
      { tenantId, previousTier: tenant.tier, newTier: plan.tier },
      'Tenant tier synced from active subscription plan'
    );
  }
}
