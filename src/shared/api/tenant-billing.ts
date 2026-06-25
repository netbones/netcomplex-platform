import 'server-only';

import { and, desc, eq, inArray } from 'drizzle-orm';

import { db, now } from './server';
import { billingPlans } from '@schema/billing-plans';
import { tenantSubscriptions } from '@schema/tenant-subscriptions';
import { tenantInvoices } from '@schema/tenant-invoices';
import { tenantPayments } from '@schema/tenant-payments';
import { billingEvents } from '@schema/billing-events';
import { tenants } from '@schema/tenants';

type BillingEventType = (typeof billingEvents.$inferSelect)['eventType'];
import {
  decimalToNumber,
  addBillingCycleMonths,
  calculateBillingBreakdown,
  deriveInvoiceNumber,
} from '@shared/lib/providers/billing';
import { getOrCreateDefaultBillingPlans } from '@shared/lib/billing/seed-plans';
import { PayPalService, PaystackService } from '@server/payments';
import { createComponentLogger } from '@/shared/lib';

const billingLogger = createComponentLogger('tenant-billing');

const paystackService = new PaystackService();
const paypalService = new PayPalService();

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface TenantBillingActionError {
  ok: false;
  status: number;
  message: string;
}

export interface TenantBillingActionSuccess<T> {
  ok: true;
  data: T;
}

export type TenantBillingActionResult<T> = TenantBillingActionError | TenantBillingActionSuccess<T>;

// ---------------------------------------------------------------------------
// Gateway configuration
// ---------------------------------------------------------------------------

function getGatewayConfiguration() {
  return {
    paystackConfigured: Boolean(process.env.PAYSTACK_SECRET_KEY?.trim()),
    paypalConfigured: Boolean(
      process.env.PAYPAL_CLIENT_ID?.trim() && process.env.PAYPAL_CLIENT_SECRET?.trim()
    ),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toIsoString(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function generateReference(subscriptionId: string, transactionId: string): string {
  return `tn-${subscriptionId.slice(0, 8)}-${transactionId.slice(0, 8)}`;
}

async function findActiveTenantSubscription(tenantId: string) {
  const rows = await db
    .select()
    .from(tenantSubscriptions)
    .where(eq(tenantSubscriptions.tenantId, tenantId))
    .orderBy(desc(tenantSubscriptions.updatedAt), desc(tenantSubscriptions.createdAt));

  return (
    rows.find(row => row.status === 'ACTIVE') ??
    rows.find(row => row.status === 'PENDING') ??
    rows.find(row => row.status === 'TRIALING') ??
    rows[0] ??
    null
  );
}

function buildInvoiceView(invoice: typeof tenantInvoices.$inferSelect, planName: string | null) {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    subscriptionId: invoice.subscriptionId,
    planName,
    total: decimalToNumber(invoice.total),
    currency: invoice.currency,
    status: invoice.status,
    paidAt: toIsoString(invoice.paidAt),
    pdfUrl: invoice.pdfUrl,
    downloadReady: invoice.downloadReady,
    createdAt: invoice.createdAt.toISOString(),
  };
}

function buildPaymentView(payment: typeof tenantPayments.$inferSelect) {
  return {
    id: payment.id,
    amount: decimalToNumber(payment.amount),
    currency: payment.currency,
    status: payment.status,
    gateway: payment.gateway as 'PAYSTACK' | 'PAYPAL',
    createdAt: payment.createdAt.toISOString(),
  };
}

function buildPlanView(plan: typeof billingPlans.$inferSelect) {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    monthlyPrice: decimalToNumber(plan.monthlyPrice),
    annualPrice: decimalToNumber(plan.annualPrice),
    currency: plan.currency,
    interval: plan.interval as 'MONTHLY' | 'ANNUAL',
    modulesIncluded: (plan.modulesIncluded as { modules?: string[] })?.modules ?? [],
    pageLimits: (plan.pageLimits as { maxPages?: number }) ?? { maxPages: 10 },
    seatLimits: (plan.seatLimits as { maxAdminSeats?: number; maxStandardSeats?: number }) ?? {
      maxAdminSeats: 3,
      maxStandardSeats: 50,
    },
    aiQuota: plan.aiQuota,
    tier: plan.tier as 'STANDARD' | 'PREMIUM' | 'ENTERPRISE',
    isDefault: plan.isDefault,
    sortOrder: plan.sortOrder,
  };
}

// ---------------------------------------------------------------------------
// Billing event recording
// ---------------------------------------------------------------------------

export async function recordBillingEvent(params: {
  tenantId: string;
  subscriptionId?: string | null;
  planId?: string | null;
  eventType: (typeof billingEvents.$inferSelect)['eventType'];
  metadata?: Record<string, unknown>;
}) {
  const id = crypto.randomUUID();
  const timestamp = now();

  await db.insert(billingEvents).values({
    id,
    tenantId: params.tenantId,
    subscriptionId: params.subscriptionId ?? null,
    planId: params.planId ?? null,
    eventType: params.eventType,
    metadata: params.metadata ?? {},
    createdAt: timestamp,
  });

  return id;
}

// ---------------------------------------------------------------------------
// ensureTenantInvoiceRecord — idempotent invoice creation
// ---------------------------------------------------------------------------

async function ensureTenantInvoiceRecord(params: {
  subscriptionId: string;
  tenantId: string;
  transactionId: string;
  amount: string;
  platformFee: string;
  processorFee: string;
  netAmount: string;
  currency: string;
  planName: string | null;
  paidAt?: Date | null;
}) {
  const [existing] = await db
    .select()
    .from(tenantInvoices)
    .where(eq(tenantInvoices.transactionId, params.transactionId))
    .limit(1);

  const timestamp = now();
  const invoiceNumber = deriveInvoiceNumber(params.transactionId, timestamp);

  const payload = {
    tenantId: params.tenantId,
    subscriptionId: params.subscriptionId,
    transactionId: params.transactionId,
    invoiceNumber,
    items: [
      {
        description: `${params.planName ?? 'Tenant plan'} subscription billing`,
        amount: decimalToNumber(params.amount),
        platformFee: decimalToNumber(params.platformFee),
        processorFee: decimalToNumber(params.processorFee),
        netAmount: decimalToNumber(params.netAmount),
        currency: params.currency,
      },
    ],
    subtotal: params.amount,
    taxAmount: '0',
    total: params.amount,
    currency: params.currency,
    status: 'PAID' as const,
    paidAt: params.paidAt ?? timestamp,
    downloadReady: false,
    updatedAt: timestamp,
  };

  if (existing) {
    const [updated] = await db
      .update(tenantInvoices)
      .set(payload)
      .where(eq(tenantInvoices.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(tenantInvoices)
    .values({
      id: crypto.randomUUID(),
      ...payload,
      createdAt: timestamp,
    })
    .returning();

  return created;
}

// ---------------------------------------------------------------------------
// syncTierToTenant — derives tier from active subscription plan
// ---------------------------------------------------------------------------

export async function syncTierToTenant(tenantId: string): Promise<void> {
  const subscription = await findActiveTenantSubscription(tenantId);

  if (!subscription) {
    billingLogger.warn({ tenantId }, 'No active tenant subscription found; tier not synced');
    return;
  }

  if (subscription.tierManualOverride) {
    billingLogger.info(
      { tenantId, subscriptionId: subscription.id },
      'Tier sync skipped — tierManualOverride is true'
    );
    return;
  }

  const [plan] = await db
    .select({ tier: billingPlans.tier })
    .from(billingPlans)
    .where(eq(billingPlans.id, subscription.planId))
    .limit(1);

  if (!plan) {
    billingLogger.warn(
      { tenantId, planId: subscription.planId },
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
    billingLogger.warn({ tenantId }, 'Tenant not found; tier not synced');
    return;
  }

  const validTiers = ['STANDARD', 'PREMIUM', 'ENTERPRISE'];
  if (tenant.tier && !validTiers.includes(tenant.tier)) {
    billingLogger.warn(
      { tenantId, currentTier: tenant.tier },
      'Tenant tier is not a valid Tier enum value; sync proceeding'
    );
  }

  if (plan.tier !== tenant.tier) {
    await db
      .update(tenants)
      .set({ tier: plan.tier as 'STANDARD' | 'PREMIUM' | 'ENTERPRISE' })
      .where(eq(tenants.id, tenantId));

    billingLogger.info(
      { tenantId, previousTier: tenant.tier, newTier: plan.tier },
      'Tenant tier synced from active subscription plan'
    );
  }
}

// ---------------------------------------------------------------------------
// createTenantSubscriptionCheckout
// ---------------------------------------------------------------------------

export async function createTenantSubscriptionCheckout(params: {
  tenantId: string;
  planId: string;
  paymentGateway: 'PAYSTACK' | 'PAYPAL';
  billingEmail: string;
  callbackUrl?: string | null;
  couponCode?: string | null;
}): Promise<
  TenantBillingActionResult<{
    subscriptionId: string;
    transactionId: string | null;
    status: string;
    paymentUrl: string | null;
    reference: string | null;
  }>
> {
  const [plan] = await db
    .select()
    .from(billingPlans)
    .where(and(eq(billingPlans.id, params.planId), eq(billingPlans.isActive, true)))
    .limit(1);

  if (!plan) {
    return { ok: false, status: 404, message: 'Billing plan not found or inactive' };
  }

  const gatewayConfig = getGatewayConfiguration();
  const price = decimalToNumber(plan.monthlyPrice);

  // Validate gateway is configured for paid plans
  if (price > 0) {
    const gatewayConfigured =
      params.paymentGateway === 'PAYSTACK'
        ? gatewayConfig.paystackConfigured
        : gatewayConfig.paypalConfigured;

    if (!gatewayConfigured) {
      return {
        ok: false,
        status: 503,
        message: `Payment processing via ${params.paymentGateway} is not yet configured`,
      };
    }
  }

  // Validate coupon if provided (stub — full coupon validation deferred)
  if (params.couponCode) {
    billingLogger.info(
      { tenantId: params.tenantId, couponCode: params.couponCode },
      'Coupon code received — full validation deferred'
    );
  }

  const timestamp = now();

  // Cancel any existing ACTIVE/PENDING/TRIALING subscriptions
  const existing = await db
    .select({ id: tenantSubscriptions.id, status: tenantSubscriptions.status })
    .from(tenantSubscriptions)
    .where(
      and(
        eq(tenantSubscriptions.tenantId, params.tenantId),
        inArray(tenantSubscriptions.status, ['ACTIVE', 'PENDING', 'TRIALING'])
      )
    );

  if (existing.length > 0) {
    await db
      .update(tenantSubscriptions)
      .set({
        status: 'CANCELLED',
        cancelledAt: timestamp,
        updatedAt: timestamp,
      })
      .where(
        inArray(
          tenantSubscriptions.id,
          existing.map(row => row.id)
        )
      );

    for (const sub of existing) {
      await recordBillingEvent({
        tenantId: params.tenantId,
        subscriptionId: sub.id,
        planId: null,
        eventType: 'SUBSCRIPTION_CANCELLED' as BillingEventType,
        metadata: { reason: 'auto_cancelled_during_checkout', previousStatus: sub.status },
      });
    }
  }

  const subscriptionId = crypto.randomUUID();
  const nextBillingDate = addBillingCycleMonths(timestamp);

  // Free plan — activate immediately
  if (price <= 0) {
    const transactionId = crypto.randomUUID();

    await db.transaction(async tx => {
      await tx.insert(tenantSubscriptions).values({
        id: subscriptionId,
        tenantId: params.tenantId,
        planId: plan.id,
        status: 'ACTIVE',
        startDate: timestamp,
        endDate: null,
        nextBillingDate,
        trialEndsAt: null,
        convertedAt: null,
        conversionSource: null,
        cancelledAt: null,
        cancelReason: null,
        tierManualOverride: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      await tx.insert(tenantPayments).values({
        id: transactionId,
        tenantId: params.tenantId,
        subscriptionId,
        amount: '0',
        currency: plan.currency,
        platformFee: '0',
        processorFee: '0',
        netAmount: '0',
        status: 'COMPLETED',
        gateway: params.paymentGateway,
        externalRef: `free-${subscriptionId}`,
        invoiceUrl: null,
        couponId: null,
        createdAt: timestamp,
      });
    });

    await recordBillingEvent({
      tenantId: params.tenantId,
      subscriptionId,
      planId: plan.id,
      eventType: 'SUBSCRIPTION_CREATED' as BillingEventType,
      metadata: { type: 'free_plan', planName: plan.name },
    });

    await ensureTenantInvoiceRecord({
      subscriptionId,
      tenantId: params.tenantId,
      transactionId,
      amount: '0',
      platformFee: '0',
      processorFee: '0',
      netAmount: '0',
      currency: plan.currency,
      planName: plan.name,
      paidAt: timestamp,
    });

    await syncTierToTenant(params.tenantId);

    return {
      ok: true,
      data: {
        subscriptionId,
        transactionId,
        status: 'ACTIVE',
        paymentUrl: null,
        reference: `free-${subscriptionId}`,
      },
    };
  }

  // Paid plan — initialize gateway payment
  const transactionId = crypto.randomUUID();
  const reference = generateReference(subscriptionId, transactionId);
  const billing = calculateBillingBreakdown({
    amount: plan.monthlyPrice,
    platformFeePercent: '5',
    gateway: params.paymentGateway,
  });

  await db.transaction(async tx => {
    await tx.insert(tenantSubscriptions).values({
      id: subscriptionId,
      tenantId: params.tenantId,
      planId: plan.id,
      status: 'PENDING',
      startDate: timestamp,
      endDate: null,
      nextBillingDate,
      trialEndsAt: null,
      convertedAt: null,
      conversionSource: null,
      cancelledAt: null,
      cancelReason: null,
      tierManualOverride: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await tx.insert(tenantPayments).values({
      id: transactionId,
      tenantId: params.tenantId,
      subscriptionId,
      amount: billing.amount.toFixed(2),
      currency: plan.currency,
      platformFee: billing.platformFee.toFixed(2),
      processorFee: billing.processorFee.toFixed(2),
      netAmount: billing.netAmount.toFixed(2),
      status: 'PENDING',
      gateway: params.paymentGateway,
      externalRef: reference,
      invoiceUrl: null,
      couponId: null,
      createdAt: timestamp,
    });
  });

  await recordBillingEvent({
    tenantId: params.tenantId,
    subscriptionId,
    planId: plan.id,
    eventType: 'SUBSCRIPTION_CREATED' as BillingEventType,
    metadata: { type: 'paid_plan', planName: plan.name, gateway: params.paymentGateway },
  });

  const checkout =
    params.paymentGateway === 'PAYSTACK'
      ? await paystackService.initializePayment({
          reference,
          amount: billing.amount,
          currency: plan.currency,
          email: params.billingEmail,
          callbackUrl: params.callbackUrl,
          metadata: {
            type: 'tenant_subscription',
            tenantId: params.tenantId,
            planId: plan.id,
            subscriptionId,
          },
        })
      : await paypalService.createOrder({
          reference,
          amount: billing.amount,
          currency: plan.currency,
          email: params.billingEmail,
          callbackUrl: params.callbackUrl,
          metadata: {
            type: 'tenant_subscription',
            tenantId: params.tenantId,
            planId: plan.id,
            subscriptionId,
          },
        });

  if (checkout.reference !== reference) {
    await db
      .update(tenantPayments)
      .set({ externalRef: checkout.reference })
      .where(eq(tenantPayments.id, transactionId));
  }

  return {
    ok: true,
    data: {
      subscriptionId,
      transactionId,
      status: 'PENDING',
      paymentUrl: checkout.paymentUrl,
      reference: checkout.reference,
    },
  };
}

// ---------------------------------------------------------------------------
// cancelTenantSubscription
// ---------------------------------------------------------------------------

export async function cancelTenantSubscription(params: {
  tenantId: string;
  subscriptionId: string;
  reason?: string | null;
}): Promise<
  TenantBillingActionResult<{
    subscriptionId: string;
    previousStatus: string;
  }>
> {
  const [subscription] = await db
    .select()
    .from(tenantSubscriptions)
    .where(
      and(
        eq(tenantSubscriptions.id, params.subscriptionId),
        eq(tenantSubscriptions.tenantId, params.tenantId)
      )
    )
    .limit(1);

  if (!subscription) {
    return { ok: false, status: 404, message: 'Subscription not found' };
  }

  if (subscription.status === 'CANCELLED' || subscription.status === 'EXPIRED') {
    return {
      ok: false,
      status: 409,
      message: `Subscription is already ${subscription.status.toLowerCase()}`,
    };
  }

  const previousStatus = subscription.status;
  const timestamp = now();

  await db
    .update(tenantSubscriptions)
    .set({
      status: 'CANCELLED',
      cancelledAt: timestamp,
      cancelReason: params.reason ?? null,
      updatedAt: timestamp,
    })
    .where(eq(tenantSubscriptions.id, params.subscriptionId));

  await recordBillingEvent({
    tenantId: params.tenantId,
    subscriptionId: params.subscriptionId,
    planId: subscription.planId,
    eventType: 'SUBSCRIPTION_CANCELLED' as BillingEventType,
    metadata: {
      reason: params.reason ?? 'user_requested',
      previousStatus,
    },
  });

  billingLogger.info(
    { tenantId: params.tenantId, subscriptionId: params.subscriptionId, previousStatus },
    'Tenant subscription cancelled'
  );

  return {
    ok: true,
    data: {
      subscriptionId: params.subscriptionId,
      previousStatus,
    },
  };
}

// ---------------------------------------------------------------------------
// upgradeTenantSubscription
// ---------------------------------------------------------------------------

export async function upgradeTenantSubscription(params: {
  tenantId: string;
  subscriptionId: string;
  newPlanId: string;
}): Promise<TenantBillingActionResult<typeof tenantSubscriptions.$inferSelect>> {
  const [subscription] = await db
    .select()
    .from(tenantSubscriptions)
    .where(
      and(
        eq(tenantSubscriptions.id, params.subscriptionId),
        eq(tenantSubscriptions.tenantId, params.tenantId)
      )
    )
    .limit(1);

  if (!subscription) {
    return { ok: false, status: 404, message: 'Subscription not found' };
  }

  if (subscription.status !== 'ACTIVE') {
    return {
      ok: false,
      status: 400,
      message: `Cannot upgrade a ${subscription.status.toLowerCase()} subscription`,
    };
  }

  const [newPlan] = await db
    .select()
    .from(billingPlans)
    .where(and(eq(billingPlans.id, params.newPlanId), eq(billingPlans.isActive, true)))
    .limit(1);

  if (!newPlan) {
    return { ok: false, status: 404, message: 'New billing plan not found or inactive' };
  }

  const currentPrice = decimalToNumber(
    await db
      .select({ price: billingPlans.monthlyPrice })
      .from(billingPlans)
      .where(eq(billingPlans.id, subscription.planId))
      .limit(1)
      .then(r => r[0]?.price ?? '0')
  );
  const newPrice = decimalToNumber(newPlan.monthlyPrice);

  if (newPrice <= currentPrice) {
    return {
      ok: false,
      status: 400,
      message:
        'New plan price must exceed current plan price for upgrade. Use downgradeTenantSubscription for lower-tier plans.',
    };
  }

  const timestamp = now();

  await db
    .update(tenantSubscriptions)
    .set({
      planId: newPlan.id,
      updatedAt: timestamp,
    })
    .where(eq(tenantSubscriptions.id, params.subscriptionId));

  await recordBillingEvent({
    tenantId: params.tenantId,
    subscriptionId: params.subscriptionId,
    planId: newPlan.id,
    eventType: 'PLAN_UPGRADED' as BillingEventType,
    metadata: {
      previousPlanId: subscription.planId,
      newPlanId: newPlan.id,
      newPlanName: newPlan.name,
      previousPrice: currentPrice,
      newPrice,
    },
  });

  await syncTierToTenant(params.tenantId);

  billingLogger.info(
    {
      tenantId: params.tenantId,
      subscriptionId: params.subscriptionId,
      previousPlanId: subscription.planId,
      newPlanId: newPlan.id,
      newPlanName: newPlan.name,
    },
    'Tenant subscription upgraded'
  );

  const [updated] = await db
    .select()
    .from(tenantSubscriptions)
    .where(eq(tenantSubscriptions.id, params.subscriptionId))
    .limit(1);

  return { ok: true, data: updated };
}

// ---------------------------------------------------------------------------
// downgradeTenantSubscription
// ---------------------------------------------------------------------------

export async function downgradeTenantSubscription(params: {
  tenantId: string;
  subscriptionId: string;
  newPlanId: string;
}): Promise<TenantBillingActionResult<typeof tenantSubscriptions.$inferSelect>> {
  const [subscription] = await db
    .select()
    .from(tenantSubscriptions)
    .where(
      and(
        eq(tenantSubscriptions.id, params.subscriptionId),
        eq(tenantSubscriptions.tenantId, params.tenantId)
      )
    )
    .limit(1);

  if (!subscription) {
    return { ok: false, status: 404, message: 'Subscription not found' };
  }

  if (subscription.status !== 'ACTIVE') {
    return {
      ok: false,
      status: 400,
      message: `Cannot downgrade a ${subscription.status.toLowerCase()} subscription`,
    };
  }

  const [newPlan] = await db
    .select()
    .from(billingPlans)
    .where(and(eq(billingPlans.id, params.newPlanId), eq(billingPlans.isActive, true)))
    .limit(1);

  if (!newPlan) {
    return { ok: false, status: 404, message: 'New billing plan not found or inactive' };
  }

  const currentPrice = decimalToNumber(
    await db
      .select({ price: billingPlans.monthlyPrice })
      .from(billingPlans)
      .where(eq(billingPlans.id, subscription.planId))
      .limit(1)
      .then(r => r[0]?.price ?? '0')
  );
  const newPrice = decimalToNumber(newPlan.monthlyPrice);

  if (newPrice >= currentPrice) {
    return {
      ok: false,
      status: 400,
      message:
        'New plan price must be less than current plan price for downgrade. Use upgradeTenantSubscription for higher-tier plans.',
    };
  }

  const timestamp = now();

  await db
    .update(tenantSubscriptions)
    .set({
      planId: newPlan.id,
      updatedAt: timestamp,
    })
    .where(eq(tenantSubscriptions.id, params.subscriptionId));

  await recordBillingEvent({
    tenantId: params.tenantId,
    subscriptionId: params.subscriptionId,
    planId: newPlan.id,
    eventType: 'PLAN_DOWNGRADED' as BillingEventType,
    metadata: {
      previousPlanId: subscription.planId,
      newPlanId: newPlan.id,
      newPlanName: newPlan.name,
      previousPrice: currentPrice,
      newPrice,
    },
  });

  await syncTierToTenant(params.tenantId);

  billingLogger.info(
    {
      tenantId: params.tenantId,
      subscriptionId: params.subscriptionId,
      previousPlanId: subscription.planId,
      newPlanId: newPlan.id,
      newPlanName: newPlan.name,
    },
    'Tenant subscription downgraded'
  );

  const [updated] = await db
    .select()
    .from(tenantSubscriptions)
    .where(eq(tenantSubscriptions.id, params.subscriptionId))
    .limit(1);

  return { ok: true, data: updated };
}

// ---------------------------------------------------------------------------
// markTransactionCompletedByReference (webhook idempotent handler)
// ---------------------------------------------------------------------------

export async function markTransactionCompletedByReference(
  reference: string,
  options: { gatewayReference?: string | null; invoiceUrl?: string | null } = {}
): Promise<TenantBillingActionResult<{ transactionId: string; subscriptionId: string }>> {
  const [payment] = await db
    .select()
    .from(tenantPayments)
    .where(eq(tenantPayments.externalRef, reference))
    .limit(1);

  if (!payment) {
    return {
      ok: false,
      status: 404,
      message: 'Payment transaction not found for reference',
    };
  }

  // Idempotent: if already COMPLETED, return existing data
  if (payment.status === 'COMPLETED') {
    return {
      ok: true,
      data: {
        transactionId: payment.id,
        subscriptionId: payment.subscriptionId,
      },
    };
  }

  const completedAt = now();

  await db
    .update(tenantPayments)
    .set({
      status: 'COMPLETED',
      externalRef: options.gatewayReference ?? payment.externalRef,
      invoiceUrl: options.invoiceUrl ?? payment.invoiceUrl,
    })
    .where(eq(tenantPayments.id, payment.id));

  const [subscription] = await db
    .select()
    .from(tenantSubscriptions)
    .where(eq(tenantSubscriptions.id, payment.subscriptionId))
    .limit(1);

  let planName: string | null = null;
  if (subscription) {
    const [plan] = await db
      .select({ name: billingPlans.name })
      .from(billingPlans)
      .where(eq(billingPlans.id, subscription.planId))
      .limit(1);

    planName = plan?.name ?? null;

    const nextBilling = addBillingCycleMonths(completedAt);

    await db
      .update(tenantSubscriptions)
      .set({
        status: 'ACTIVE',
        startDate: subscription.startDate ?? completedAt,
        endDate: null,
        nextBillingDate: nextBilling,
        updatedAt: completedAt,
      })
      .where(eq(tenantSubscriptions.id, subscription.id));
  }

  // Create invoice and record payment event
  await ensureTenantInvoiceRecord({
    subscriptionId: payment.subscriptionId,
    tenantId: payment.tenantId,
    transactionId: payment.id,
    amount: payment.amount,
    platformFee: payment.platformFee,
    processorFee: payment.processorFee,
    netAmount: payment.netAmount,
    currency: payment.currency,
    planName,
    paidAt: completedAt,
  });

  await recordBillingEvent({
    tenantId: payment.tenantId,
    subscriptionId: payment.subscriptionId,
    planId: subscription?.planId ?? null,
    eventType: 'PAYMENT_RECEIVED' as BillingEventType,
    metadata: {
      transactionId: payment.id,
      amount: decimalToNumber(payment.amount),
      gateway: payment.gateway,
      reference,
    },
  });

  await syncTierToTenant(payment.tenantId);

  return {
    ok: true,
    data: {
      transactionId: payment.id,
      subscriptionId: payment.subscriptionId,
    },
  };
}

// ---------------------------------------------------------------------------
// markTransactionFailedByReference
// ---------------------------------------------------------------------------

export async function markTransactionFailedByReference(
  reference: string
): Promise<TenantBillingActionResult<{ transactionId: string }>> {
  const [payment] = await db
    .select()
    .from(tenantPayments)
    .where(eq(tenantPayments.externalRef, reference))
    .limit(1);

  if (!payment) {
    return {
      ok: false,
      status: 404,
      message: 'Payment transaction not found for reference',
    };
  }

  if (payment.status === 'FAILED') {
    return {
      ok: true,
      data: { transactionId: payment.id },
    };
  }

  await db
    .update(tenantPayments)
    .set({ status: 'FAILED' })
    .where(eq(tenantPayments.id, payment.id));

  await recordBillingEvent({
    tenantId: payment.tenantId,
    subscriptionId: payment.subscriptionId,
    planId: null,
    eventType: 'PAYMENT_FAILED' as BillingEventType,
    metadata: {
      transactionId: payment.id,
      amount: decimalToNumber(payment.amount),
      gateway: payment.gateway,
      reference,
    },
  });

  return {
    ok: true,
    data: { transactionId: payment.id },
  };
}

// ---------------------------------------------------------------------------
// getTenantBillingSnapshot
// ---------------------------------------------------------------------------

export async function getTenantBillingSnapshot(tenantId: string) {
  const currentSubscription = await findActiveTenantSubscription(tenantId);

  // Seed default plans first, then query full plan rows for display
  await getOrCreateDefaultBillingPlans(db, tenantId);
  const plans = await db
    .select()
    .from(billingPlans)
    .where(eq(billingPlans.tenantId, tenantId))
    .orderBy(billingPlans.sortOrder);

  let planName: string | null = null;
  if (currentSubscription) {
    const [plan] = await db
      .select({ name: billingPlans.name })
      .from(billingPlans)
      .where(eq(billingPlans.id, currentSubscription.planId))
      .limit(1);
    planName = plan?.name ?? null;
  }

  const invoices = await db
    .select()
    .from(tenantInvoices)
    .where(eq(tenantInvoices.tenantId, tenantId))
    .orderBy(desc(tenantInvoices.createdAt))
    .limit(10);

  const payments = await db
    .select()
    .from(tenantPayments)
    .where(eq(tenantPayments.tenantId, tenantId))
    .orderBy(desc(tenantPayments.createdAt))
    .limit(10);

  const gatewayConfiguration = getGatewayConfiguration();

  return {
    currentSubscription: currentSubscription
      ? {
          id: currentSubscription.id,
          planId: currentSubscription.planId,
          planName,
          status: currentSubscription.status,
          startDate: toIsoString(currentSubscription.startDate),
          endDate: toIsoString(currentSubscription.endDate),
          nextBillingDate: toIsoString(currentSubscription.nextBillingDate),
          trialEndsAt: toIsoString(currentSubscription.trialEndsAt),
        }
      : null,
    availablePlans: plans.map(buildPlanView),
    recentInvoices: invoices.map(invoice => buildInvoiceView(invoice, planName)),
    recentPayments: payments.map(buildPaymentView),
    gatewayConfiguration,
  };
}

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export { getOrCreateDefaultBillingPlans } from '@shared/lib/billing/seed-plans';
