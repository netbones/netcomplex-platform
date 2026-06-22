import 'server-only';

import { and, desc, eq, inArray } from 'drizzle-orm';

import { db, now } from './server';
import { providerMerits } from '@schema/provider-merits';
import { providerSubscriptions } from '@schema/provider-subscriptions';
import { paymentTransactions } from '@schema/payment-transactions';
import { providerCharges } from '@schema/provider-charges';
import { providerInvoices } from '@schema/provider-invoices';
import { revenueRecords } from '@schema/revenue-records';
import { subscriptionTiers } from '@schema/subscription-tiers';
import type { ProviderDisplayStatus } from './provider-platform';
import {
  addBillingCycleMonths,
  calculateBillingBreakdown,
  canSubscribeToTier,
  decimalToNumber,
  deriveInvoiceNumber,
  formatCurrency,
  DEFAULT_PROVIDER_SUBSCRIPTION_TIERS,
  type ProviderPaymentGateway,
  type ProviderSubscriptionStatus,
} from '@shared/lib/providers/billing';
import { PayPalService, PaystackService } from '@server/payments';

const paystackService = new PaystackService();
const paypalService = new PayPalService();

export interface ProviderBillingActionError {
  ok: false;
  status: number;
  message: string;
}

export interface ProviderBillingActionSuccess<T> {
  ok: true;
  data: T;
}

export type ProviderBillingActionResult<T> =
  | ProviderBillingActionError
  | ProviderBillingActionSuccess<T>;

function getGatewayConfiguration() {
  return {
    paystackConfigured: Boolean(process.env.PAYSTACK_SECRET_KEY?.trim()),
    paypalConfigured: Boolean(
      process.env.PAYPAL_CLIENT_ID?.trim() && process.env.PAYPAL_CLIENT_SECRET?.trim()
    ),
  };
}

function toIsoString(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function toTierFeatures(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function sortTiers(
  tiers: Array<typeof subscriptionTiers.$inferSelect>
): Array<typeof subscriptionTiers.$inferSelect> {
  return [...tiers].sort(
    (left, right) => decimalToNumber(left.price) - decimalToNumber(right.price)
  );
}

async function getOrCreateDefaultSubscriptionTiers(tenantId: string) {
  const existing = await db
    .select()
    .from(subscriptionTiers)
    .where(eq(subscriptionTiers.tenantId, tenantId));

  const existingCodes = new Set(
    existing.map(row => String(toTierFeatures(row.features).code ?? row.name).toUpperCase())
  );
  const timestamp = now();

  const missing = DEFAULT_PROVIDER_SUBSCRIPTION_TIERS.filter(tier => !existingCodes.has(tier.code));
  if (missing.length > 0) {
    await db.insert(subscriptionTiers).values(
      missing.map(tier => ({
        id: crypto.randomUUID(),
        tenantId,
        name: tier.name,
        description: tier.description,
        price: tier.price,
        currency: tier.currency,
        maxListings: tier.maxListings,
        verificationRequired: tier.verificationRequired,
        platformFeePercent: tier.platformFeePercent,
        features: tier.features,
        createdAt: timestamp,
      }))
    );
  }

  const rows = await db
    .select()
    .from(subscriptionTiers)
    .where(eq(subscriptionTiers.tenantId, tenantId));

  return sortTiers(rows);
}

function buildInvoiceItems(
  transaction: typeof paymentTransactions.$inferSelect,
  tierName: string | null
) {
  return [
    {
      description: `${tierName ?? 'Provider plan'} subscription billing`,
      amount: decimalToNumber(transaction.amount),
      platformFee: decimalToNumber(transaction.platformFee),
      processorFee: decimalToNumber(transaction.processorFee),
      netAmount: decimalToNumber(transaction.netAmount),
      currency: transaction.currency,
    },
  ];
}

function buildInvoiceView(
  transaction: typeof paymentTransactions.$inferSelect,
  tierName: string | null
) {
  const createdAt = transaction.createdAt;
  return {
    id: transaction.id,
    invoiceNumber: deriveInvoiceNumber(transaction.id, createdAt),
    transactionId: transaction.id,
    subscriptionId: transaction.subscriptionId,
    tierName,
    total: decimalToNumber(transaction.amount),
    platformFee: decimalToNumber(transaction.platformFee),
    processorFee: decimalToNumber(transaction.processorFee),
    netAmount: decimalToNumber(transaction.netAmount),
    currency: transaction.currency,
    status: transaction.status,
    paidAt: transaction.status === 'COMPLETED' ? createdAt.toISOString() : null,
    createdAt: createdAt.toISOString(),
    downloadUrl: transaction.invoiceUrl,
    downloadReady: Boolean(transaction.invoiceUrl),
  };
}

function buildPersistedInvoiceView(
  invoice: typeof providerInvoices.$inferSelect,
  tierName: string | null
) {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    transactionId: invoice.transactionId,
    subscriptionId: invoice.subscriptionId,
    tierName,
    total: decimalToNumber(invoice.total),
    platformFee: decimalToNumber(invoice.platformFee),
    processorFee: decimalToNumber(invoice.processorFee),
    netAmount: decimalToNumber(invoice.netAmount),
    currency: invoice.currency,
    status: invoice.status,
    paidAt: toIsoString(invoice.paidAt),
    createdAt: invoice.createdAt.toISOString(),
    downloadUrl: invoice.pdfUrl,
    downloadReady: Boolean(invoice.pdfUrl),
  };
}

function buildChargeView(
  transaction: typeof paymentTransactions.$inferSelect,
  tierName: string | null,
  subscriptionStatus: ProviderSubscriptionStatus | null
) {
  return {
    id: transaction.id,
    description: `${tierName ?? 'Provider plan'} billing charge`,
    amount: decimalToNumber(transaction.amount),
    currency: transaction.currency,
    status: transaction.status,
    gateway: transaction.gateway,
    externalRef: transaction.externalRef,
    subscriptionStatus,
    dueDate: transaction.createdAt.toISOString(),
    paidAt: transaction.status === 'COMPLETED' ? transaction.createdAt.toISOString() : null,
    createdAt: transaction.createdAt.toISOString(),
  };
}

function buildPersistedChargeView(
  charge: typeof providerCharges.$inferSelect,
  subscriptionStatus: ProviderSubscriptionStatus | null
) {
  return {
    id: charge.id,
    description: charge.description,
    amount: decimalToNumber(charge.amount),
    currency: charge.currency,
    status: charge.status,
    gateway: charge.gateway,
    externalRef: charge.externalRef,
    subscriptionStatus,
    dueDate: charge.dueDate.toISOString(),
    paidAt: toIsoString(charge.paidAt),
    createdAt: charge.createdAt.toISOString(),
  };
}

async function ensureProviderChargeRecord(params: {
  transaction: typeof paymentTransactions.$inferSelect;
  description: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
  dueDate: Date;
  paidAt?: Date | null;
}) {
  const [existing] = await db
    .select()
    .from(providerCharges)
    .where(eq(providerCharges.transactionId, params.transaction.id))
    .limit(1);

  const payload = {
    providerId: params.transaction.providerId,
    tenantId: params.transaction.tenantId,
    subscriptionId: params.transaction.subscriptionId,
    transactionId: params.transaction.id,
    description: params.description,
    amount: params.transaction.amount,
    currency: params.transaction.currency,
    status: params.status,
    gateway: params.transaction.gateway,
    externalRef: params.transaction.externalRef,
    dueDate: params.dueDate,
    paidAt: params.paidAt ?? null,
    updatedAt: now(),
  };

  if (existing) {
    const [updated] = await db
      .update(providerCharges)
      .set(payload)
      .where(eq(providerCharges.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(providerCharges)
    .values({
      id: crypto.randomUUID(),
      ...payload,
      createdAt: now(),
    })
    .returning();

  return created;
}

async function ensureProviderInvoiceRecord(params: {
  transaction: typeof paymentTransactions.$inferSelect;
  tierName: string | null;
  paidAt?: Date | null;
}) {
  const [existing] = await db
    .select()
    .from(providerInvoices)
    .where(eq(providerInvoices.transactionId, params.transaction.id))
    .limit(1);

  const payload = {
    providerId: params.transaction.providerId,
    tenantId: params.transaction.tenantId,
    subscriptionId: params.transaction.subscriptionId,
    transactionId: params.transaction.id,
    invoiceNumber: deriveInvoiceNumber(params.transaction.id, params.transaction.createdAt),
    items: buildInvoiceItems(params.transaction, params.tierName),
    total: params.transaction.amount,
    platformFee: params.transaction.platformFee,
    processorFee: params.transaction.processorFee,
    netAmount: params.transaction.netAmount,
    currency: params.transaction.currency,
    status: 'PAID' as const,
    paidAt: params.paidAt ?? now(),
    pdfUrl: params.transaction.invoiceUrl,
    updatedAt: now(),
  };

  if (existing) {
    const [updated] = await db
      .update(providerInvoices)
      .set(payload)
      .where(eq(providerInvoices.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(providerInvoices)
    .values({
      id: crypto.randomUUID(),
      ...payload,
      createdAt: now(),
    })
    .returning();

  return created;
}

async function ensureRevenueRecordForTransaction(
  transaction: typeof paymentTransactions.$inferSelect
) {
  const [existing] = await db
    .select({ id: revenueRecords.id })
    .from(revenueRecords)
    .where(eq(revenueRecords.transactionId, transaction.id))
    .limit(1);

  if (existing) {
    return existing;
  }

  const createdAt = now();
  const period = `${createdAt.getUTCFullYear()}-${String(createdAt.getUTCMonth() + 1).padStart(2, '0')}`;

  const [created] = await db
    .insert(revenueRecords)
    .values({
      id: crypto.randomUUID(),
      tenantId: transaction.tenantId,
      providerId: transaction.providerId,
      transactionId: transaction.id,
      grossAmount: transaction.amount,
      platformFee: transaction.platformFee,
      processorFee: transaction.processorFee,
      netAmount: transaction.netAmount,
      currency: transaction.currency,
      period,
      createdAt,
    })
    .returning();

  return created;
}

async function initializeGatewayCheckout(params: {
  gateway: ProviderPaymentGateway;
  reference: string;
  amount: number;
  currency: string;
  email: string;
  callbackUrl?: string | null;
  metadata: Record<string, unknown>;
}) {
  if (params.gateway === 'PAYSTACK') {
    return paystackService.initializePayment({
      reference: params.reference,
      amount: params.amount,
      currency: params.currency,
      email: params.email,
      callbackUrl: params.callbackUrl,
      metadata: params.metadata,
    });
  }

  return paypalService.createOrder({
    reference: params.reference,
    amount: params.amount,
    currency: params.currency,
    email: params.email,
    callbackUrl: params.callbackUrl,
    metadata: params.metadata,
  });
}

async function findCurrentProviderSubscription(tenantId: string, providerId: string) {
  const rows = await db
    .select()
    .from(providerSubscriptions)
    .where(
      and(
        eq(providerSubscriptions.tenantId, tenantId),
        eq(providerSubscriptions.providerId, providerId)
      )
    )
    .orderBy(desc(providerSubscriptions.updatedAt), desc(providerSubscriptions.createdAt));

  return (
    rows.find(row => row.status === 'ACTIVE') ??
    rows.find(row => row.status === 'PENDING') ??
    rows[0] ??
    null
  );
}

export async function getProviderBillingSnapshot(params: {
  tenantId: string;
  providerId: string;
  verificationStatus: ProviderDisplayStatus;
}) {
  const tiers = await getOrCreateDefaultSubscriptionTiers(params.tenantId);
  const currentSubscription = await findCurrentProviderSubscription(
    params.tenantId,
    params.providerId
  );
  const tierById = new Map(tiers.map(tier => [tier.id, tier]));
  const subscriptions = await db
    .select()
    .from(providerSubscriptions)
    .where(
      and(
        eq(providerSubscriptions.tenantId, params.tenantId),
        eq(providerSubscriptions.providerId, params.providerId)
      )
    );
  const subscriptionById = new Map(
    subscriptions.map(subscription => [subscription.id, subscription])
  );

  const transactions = await db
    .select()
    .from(paymentTransactions)
    .where(
      and(
        eq(paymentTransactions.tenantId, params.tenantId),
        eq(paymentTransactions.providerId, params.providerId)
      )
    )
    .orderBy(desc(paymentTransactions.createdAt));

  const charges = await db
    .select()
    .from(providerCharges)
    .where(
      and(
        eq(providerCharges.tenantId, params.tenantId),
        eq(providerCharges.providerId, params.providerId)
      )
    )
    .orderBy(desc(providerCharges.createdAt));

  const invoices = await db
    .select()
    .from(providerInvoices)
    .where(
      and(
        eq(providerInvoices.tenantId, params.tenantId),
        eq(providerInvoices.providerId, params.providerId)
      )
    )
    .orderBy(desc(providerInvoices.createdAt));

  const recentMerits = await db
    .select()
    .from(providerMerits)
    .where(
      and(
        eq(providerMerits.tenantId, params.tenantId),
        eq(providerMerits.providerId, params.providerId)
      )
    )
    .orderBy(desc(providerMerits.createdAt));

  const completedTransactions = transactions.filter(
    transaction => transaction.status === 'COMPLETED'
  );
  const chargeTransactionIds = new Set(
    charges.flatMap(charge => (charge.transactionId ? [charge.transactionId] : []))
  );
  const invoiceTransactionIds = new Set(invoices.map(invoice => invoice.transactionId));
  const feeSummary = completedTransactions.reduce(
    (summary, transaction) => ({
      totalGross: summary.totalGross + decimalToNumber(transaction.amount),
      totalPlatformFees: summary.totalPlatformFees + decimalToNumber(transaction.platformFee),
      totalProcessorFees: summary.totalProcessorFees + decimalToNumber(transaction.processorFee),
      totalNet: summary.totalNet + decimalToNumber(transaction.netAmount),
      completedTransactions: summary.completedTransactions + 1,
    }),
    {
      totalGross: 0,
      totalPlatformFees: 0,
      totalProcessorFees: 0,
      totalNet: 0,
      completedTransactions: 0,
    }
  );

  const subscriptionTier = currentSubscription
    ? (tierById.get(currentSubscription.tierId) ?? null)
    : null;
  const gatewayConfiguration = getGatewayConfiguration();
  const notices: string[] = [];

  if (!gatewayConfiguration.paystackConfigured) {
    notices.push(
      'Paystack is not configured in this environment; Paystack checkout links degrade gracefully to a pending billing record.'
    );
  }

  if (!gatewayConfiguration.paypalConfigured) {
    notices.push(
      'PayPal is not configured in this environment; PayPal checkout links degrade gracefully to a pending billing record.'
    );
  }

  if (!currentSubscription) {
    notices.push('No active provider subscription exists yet. Choose a tier to start billing.');
  }

  return {
    currentSubscription: currentSubscription
      ? {
          id: currentSubscription.id,
          tierId: currentSubscription.tierId,
          tierName: subscriptionTier?.name ?? 'Unknown tier',
          status: currentSubscription.status,
          startDate: toIsoString(currentSubscription.startDate),
          endDate: toIsoString(currentSubscription.endDate),
          nextBillingDate: toIsoString(currentSubscription.nextBillingDate),
          price: decimalToNumber(currentSubscription.price),
          formattedPrice: formatCurrency(currentSubscription.price, currentSubscription.currency),
          currency: currentSubscription.currency,
          paymentGateway: currentSubscription.paymentGateway,
          features: toTierFeatures(subscriptionTier?.features),
        }
      : null,
    availableTiers: tiers.map(tier => ({
      id: tier.id,
      name: tier.name,
      description: tier.description,
      price: decimalToNumber(tier.price),
      formattedPrice: formatCurrency(tier.price, tier.currency),
      currency: tier.currency,
      maxListings: tier.maxListings,
      platformFeePercent: decimalToNumber(tier.platformFeePercent),
      verificationRequired: tier.verificationRequired,
      features: toTierFeatures(tier.features),
      allowedForProvider: canSubscribeToTier({
        verificationStatus: params.verificationStatus,
        tierName: tier.name,
        tierFeatures: tier.features,
      }),
    })),
    feeSummary: {
      ...feeSummary,
      totalGross: Number(feeSummary.totalGross.toFixed(2)),
      totalPlatformFees: Number(feeSummary.totalPlatformFees.toFixed(2)),
      totalProcessorFees: Number(feeSummary.totalProcessorFees.toFixed(2)),
      totalNet: Number(feeSummary.totalNet.toFixed(2)),
      pendingCharges: transactions.filter(transaction => transaction.status === 'PENDING').length,
    },
    invoices: [
      ...invoices.map(invoice => {
        const linkedSubscription = subscriptionById.get(invoice.subscriptionId);
        const linkedTier = linkedSubscription
          ? (tierById.get(linkedSubscription.tierId) ?? null)
          : null;
        return buildPersistedInvoiceView(
          invoice,
          linkedTier?.name ?? subscriptionTier?.name ?? null
        );
      }),
      ...completedTransactions
        .filter(transaction => !invoiceTransactionIds.has(transaction.id))
        .map(transaction => {
          const linkedSubscription = subscriptionById.get(transaction.subscriptionId);
          const linkedTier = linkedSubscription
            ? (tierById.get(linkedSubscription.tierId) ?? null)
            : null;
          return buildInvoiceView(transaction, linkedTier?.name ?? subscriptionTier?.name ?? null);
        }),
    ].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    ),
    charges: [
      ...charges.map(charge => {
        const linkedSubscription = subscriptionById.get(charge.subscriptionId);
        return buildPersistedChargeView(
          charge,
          linkedSubscription?.status ?? currentSubscription?.status ?? null
        );
      }),
      ...transactions
        .filter(transaction => !chargeTransactionIds.has(transaction.id))
        .map(transaction => {
          const linkedSubscription = subscriptionById.get(transaction.subscriptionId);
          const linkedTier = linkedSubscription
            ? (tierById.get(linkedSubscription.tierId) ?? null)
            : null;
          return buildChargeView(
            transaction,
            linkedTier?.name ?? subscriptionTier?.name ?? null,
            linkedSubscription?.status ?? currentSubscription?.status ?? null
          );
        }),
    ].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    ),
    paymentHistory: transactions.map(transaction => ({
      id: transaction.id,
      subscriptionId: transaction.subscriptionId,
      amount: decimalToNumber(transaction.amount),
      currency: transaction.currency,
      platformFee: decimalToNumber(transaction.platformFee),
      processorFee: decimalToNumber(transaction.processorFee),
      netAmount: decimalToNumber(transaction.netAmount),
      status: transaction.status,
      gateway: transaction.gateway,
      externalRef: transaction.externalRef,
      invoiceUrl: transaction.invoiceUrl,
      createdAt: transaction.createdAt.toISOString(),
    })),
    recentMerits: recentMerits.slice(0, 10).map(merit => ({
      id: merit.id,
      meritType: merit.meritType,
      points: merit.points,
      description: merit.description,
      referenceId: merit.referenceId,
      createdAt: merit.createdAt.toISOString(),
    })),
    gatewayConfiguration,
    notices,
  };
}

export async function createProviderSubscriptionCheckout(params: {
  tenantId: string;
  providerId: string;
  providerEmail: string | null;
  verificationStatus: ProviderDisplayStatus;
  tierId: string;
  paymentGateway: ProviderPaymentGateway;
  callbackUrl?: string | null;
}): Promise<
  ProviderBillingActionResult<{
    subscriptionId: string;
    transactionId: string | null;
    status: ProviderSubscriptionStatus;
    paymentUrl: string | null;
    reference: string | null;
    gatewayStatus: 'ready' | 'configuration_required' | 'degraded' | 'not_required';
    message: string;
  }>
> {
  const tiers = await getOrCreateDefaultSubscriptionTiers(params.tenantId);
  const tier = tiers.find(candidate => candidate.id === params.tierId);

  if (!tier) {
    return { ok: false, status: 404, message: 'Subscription tier not found' };
  }

  if (params.verificationStatus === 'SUSPENDED') {
    return {
      ok: false,
      status: 403,
      message: 'Suspended providers cannot subscribe to provider billing tiers.',
    };
  }

  if (
    !canSubscribeToTier({
      verificationStatus: params.verificationStatus,
      tierName: tier.name,
      tierFeatures: tier.features,
    })
  ) {
    return {
      ok: false,
      status: 403,
      message: 'This tier is not available for the provider’s current verification status.',
    };
  }

  const timestamp = now();
  const price = decimalToNumber(tier.price);

  const existing = await db
    .select({ id: providerSubscriptions.id })
    .from(providerSubscriptions)
    .where(
      and(
        eq(providerSubscriptions.tenantId, params.tenantId),
        eq(providerSubscriptions.providerId, params.providerId),
        inArray(providerSubscriptions.status, ['ACTIVE', 'PENDING'])
      )
    );

  if (existing.length > 0) {
    await db
      .update(providerSubscriptions)
      .set({
        status: 'CANCELLED',
        endDate: timestamp,
        updatedAt: timestamp,
      })
      .where(
        inArray(
          providerSubscriptions.id,
          existing.map(row => row.id)
        )
      );
  }

  const subscriptionId = crypto.randomUUID();
  const nextBillingDate = addBillingCycleMonths(timestamp);

  if (price <= 0) {
    const transactionId = crypto.randomUUID();

    await db.transaction(async tx => {
      await tx.insert(providerSubscriptions).values({
        id: subscriptionId,
        providerId: params.providerId,
        tenantId: params.tenantId,
        tierId: tier.id,
        status: 'ACTIVE',
        startDate: timestamp,
        endDate: null,
        nextBillingDate,
        price: tier.price,
        currency: tier.currency,
        paymentGateway: params.paymentGateway,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      await tx.insert(paymentTransactions).values({
        id: transactionId,
        providerId: params.providerId,
        tenantId: params.tenantId,
        subscriptionId,
        amount: '0',
        currency: tier.currency,
        platformFee: '0',
        processorFee: '0',
        netAmount: '0',
        status: 'COMPLETED',
        gateway: params.paymentGateway,
        externalRef: `free-${subscriptionId}`,
        invoiceUrl: null,
        createdAt: timestamp,
      });

      await tx.insert(providerCharges).values({
        id: crypto.randomUUID(),
        providerId: params.providerId,
        tenantId: params.tenantId,
        subscriptionId,
        transactionId,
        description: `${tier.name} billing charge`,
        amount: '0',
        currency: tier.currency,
        status: 'PAID',
        gateway: params.paymentGateway,
        externalRef: `free-${subscriptionId}`,
        dueDate: timestamp,
        paidAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    });

    const [transaction] = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.id, transactionId))
      .limit(1);

    if (transaction) {
      await ensureRevenueRecordForTransaction(transaction);
      await ensureProviderInvoiceRecord({
        transaction,
        tierName: tier.name,
        paidAt: timestamp,
      });
    }

    return {
      ok: true,
      data: {
        subscriptionId,
        transactionId,
        status: 'ACTIVE',
        paymentUrl: null,
        reference: `free-${subscriptionId}`,
        gatewayStatus: 'not_required',
        message: 'Probation tier activated. No payment capture was required for this subscription.',
      },
    };
  }

  if (!params.providerEmail) {
    return {
      ok: false,
      status: 400,
      message:
        'A provider email address is required before a paid subscription can be initialized.',
    };
  }

  const transactionId = crypto.randomUUID();
  const reference = `prov-${subscriptionId.slice(0, 8)}-${transactionId.slice(0, 8)}`;
  const billing = calculateBillingBreakdown({
    amount: tier.price,
    platformFeePercent: tier.platformFeePercent,
    gateway: params.paymentGateway,
  });

  await db.transaction(async tx => {
    await tx.insert(providerSubscriptions).values({
      id: subscriptionId,
      providerId: params.providerId,
      tenantId: params.tenantId,
      tierId: tier.id,
      status: 'PENDING',
      startDate: timestamp,
      endDate: null,
      nextBillingDate,
      price: tier.price,
      currency: tier.currency,
      paymentGateway: params.paymentGateway,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await tx.insert(paymentTransactions).values({
      id: transactionId,
      providerId: params.providerId,
      tenantId: params.tenantId,
      subscriptionId,
      amount: billing.amount.toFixed(2),
      currency: tier.currency,
      platformFee: billing.platformFee.toFixed(2),
      processorFee: billing.processorFee.toFixed(2),
      netAmount: billing.netAmount.toFixed(2),
      status: 'PENDING',
      gateway: params.paymentGateway,
      externalRef: reference,
      invoiceUrl: null,
      createdAt: timestamp,
    });

    await tx.insert(providerCharges).values({
      id: crypto.randomUUID(),
      providerId: params.providerId,
      tenantId: params.tenantId,
      subscriptionId,
      transactionId,
      description: `${tier.name} billing charge`,
      amount: billing.amount.toFixed(2),
      currency: tier.currency,
      status: 'PENDING',
      gateway: params.paymentGateway,
      externalRef: reference,
      dueDate: timestamp,
      paidAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });

  const checkout = await initializeGatewayCheckout({
    gateway: params.paymentGateway,
    reference,
    amount: billing.amount,
    currency: tier.currency,
    email: params.providerEmail,
    callbackUrl: params.callbackUrl,
    metadata: {
      tenantId: params.tenantId,
      providerId: params.providerId,
      subscriptionId,
      transactionId,
      tierId: tier.id,
    },
  });

  if (checkout.reference !== reference) {
    await db
      .update(paymentTransactions)
      .set({ externalRef: checkout.reference })
      .where(eq(paymentTransactions.id, transactionId));

    await db
      .update(providerCharges)
      .set({ externalRef: checkout.reference, updatedAt: now() })
      .where(eq(providerCharges.transactionId, transactionId));
  }

  return {
    ok: true,
    data: {
      subscriptionId,
      transactionId,
      status: 'PENDING',
      paymentUrl: checkout.paymentUrl,
      reference: checkout.reference,
      gatewayStatus: checkout.status,
      message:
        checkout.message ??
        (checkout.paymentUrl
          ? 'Subscription billing initialized successfully.'
          : 'Subscription was recorded, but the selected payment gateway is not fully configured here.'),
    },
  };
}

export async function cancelProviderSubscription(params: {
  tenantId: string;
  providerId: string;
  subscriptionId?: string | null;
}): Promise<
  ProviderBillingActionResult<{
    subscriptionId: string;
    status: ProviderSubscriptionStatus;
    remoteMessage: string | null;
  }>
> {
  const subscription = params.subscriptionId
    ? ((
        await db
          .select()
          .from(providerSubscriptions)
          .where(
            and(
              eq(providerSubscriptions.id, params.subscriptionId),
              eq(providerSubscriptions.tenantId, params.tenantId),
              eq(providerSubscriptions.providerId, params.providerId)
            )
          )
          .limit(1)
      )[0] ?? null)
    : await findCurrentProviderSubscription(params.tenantId, params.providerId);

  if (!subscription) {
    return { ok: false, status: 404, message: 'No provider subscription was found to cancel.' };
  }

  const timestamp = now();
  await db
    .update(providerSubscriptions)
    .set({
      status: 'CANCELLED',
      endDate: timestamp,
      updatedAt: timestamp,
    })
    .where(eq(providerSubscriptions.id, subscription.id));

  await db
    .update(paymentTransactions)
    .set({ status: 'FAILED' })
    .where(
      and(
        eq(paymentTransactions.subscriptionId, subscription.id),
        eq(paymentTransactions.status, 'PENDING')
      )
    );

  await db
    .update(providerCharges)
    .set({ status: 'FAILED', updatedAt: timestamp })
    .where(
      and(
        eq(providerCharges.subscriptionId, subscription.id),
        eq(providerCharges.status, 'PENDING')
      )
    );

  let remoteMessage: string | null = null;
  if (subscription.paymentGateway === 'PAYSTACK') {
    const result = await paystackService.cancelSubscription();
    remoteMessage = result.reason;
  } else if (subscription.paymentGateway === 'PAYPAL') {
    const result = await paypalService.cancelSubscription();
    remoteMessage = result.reason;
  }

  return {
    ok: true,
    data: {
      subscriptionId: subscription.id,
      status: 'CANCELLED',
      remoteMessage,
    },
  };
}

export async function updateProviderSubscriptionStatus(params: {
  tenantId: string;
  providerId: string;
  subscriptionId: string;
  status: ProviderSubscriptionStatus;
  endDate?: Date | null;
  nextBillingDate?: Date | null;
}): Promise<ProviderBillingActionResult<typeof providerSubscriptions.$inferSelect>> {
  const [existing] = await db
    .select()
    .from(providerSubscriptions)
    .where(
      and(
        eq(providerSubscriptions.id, params.subscriptionId),
        eq(providerSubscriptions.tenantId, params.tenantId),
        eq(providerSubscriptions.providerId, params.providerId)
      )
    )
    .limit(1);

  if (!existing) {
    return { ok: false, status: 404, message: 'Subscription not found.' };
  }

  const [updated] = await db
    .update(providerSubscriptions)
    .set({
      status: params.status,
      endDate: params.endDate ?? existing.endDate,
      nextBillingDate: params.nextBillingDate ?? existing.nextBillingDate,
      updatedAt: now(),
    })
    .where(eq(providerSubscriptions.id, existing.id))
    .returning();

  return { ok: true, data: updated };
}

export async function markTransactionCompletedByReference(reference: string) {
  const [transaction] = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.externalRef, reference))
    .limit(1);

  if (!transaction) {
    return {
      ok: false,
      status: 404,
      message: 'Payment transaction not found for reference.',
    } as const;
  }

  const completedAt = now();

  if (transaction.status !== 'COMPLETED') {
    await db
      .update(paymentTransactions)
      .set({ status: 'COMPLETED' })
      .where(eq(paymentTransactions.id, transaction.id));
  }

  const [subscription] = await db
    .select()
    .from(providerSubscriptions)
    .where(eq(providerSubscriptions.id, transaction.subscriptionId))
    .limit(1);

  let tierName: string | null = null;
  if (subscription) {
    const [tier] = await db
      .select({ name: subscriptionTiers.name })
      .from(subscriptionTiers)
      .where(eq(subscriptionTiers.id, subscription.tierId))
      .limit(1);

    tierName = tier?.name ?? null;

    await db
      .update(providerSubscriptions)
      .set({
        status: 'ACTIVE',
        paymentGateway: transaction.gateway,
        endDate: null,
        nextBillingDate: addBillingCycleMonths(completedAt),
        updatedAt: completedAt,
      })
      .where(eq(providerSubscriptions.id, subscription.id));
  }

  const [updatedTransaction] = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.id, transaction.id))
    .limit(1);

  if (updatedTransaction) {
    await ensureProviderChargeRecord({
      transaction: updatedTransaction,
      description: `${tierName ?? 'Provider plan'} billing charge`,
      status: 'PAID',
      dueDate: updatedTransaction.createdAt,
      paidAt: completedAt,
    });
    await ensureProviderInvoiceRecord({
      transaction: updatedTransaction,
      tierName,
      paidAt: completedAt,
    });
    await ensureRevenueRecordForTransaction(updatedTransaction);
  }

  return { ok: true, status: 200, message: 'Transaction marked as completed.' } as const;
}

export async function markTransactionFailedByReference(reference: string) {
  const [transaction] = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.externalRef, reference))
    .limit(1);

  if (!transaction) {
    return {
      ok: false,
      status: 404,
      message: 'Payment transaction not found for reference.',
    } as const;
  }

  const failedAt = now();

  if (transaction.status !== 'FAILED') {
    await db
      .update(paymentTransactions)
      .set({ status: 'FAILED' })
      .where(eq(paymentTransactions.id, transaction.id));
  }

  const [subscription] = await db
    .select()
    .from(providerSubscriptions)
    .where(eq(providerSubscriptions.id, transaction.subscriptionId))
    .limit(1);

  let tierName: string | null = null;
  if (subscription) {
    const [tier] = await db
      .select({ name: subscriptionTiers.name })
      .from(subscriptionTiers)
      .where(eq(subscriptionTiers.id, subscription.tierId))
      .limit(1);

    tierName = tier?.name ?? null;

    await db
      .update(providerSubscriptions)
      .set({
        status: 'EXPIRED',
        endDate: failedAt,
        updatedAt: failedAt,
      })
      .where(eq(providerSubscriptions.id, subscription.id));
  }

  const [updatedTransaction] = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.id, transaction.id))
    .limit(1);

  if (updatedTransaction) {
    await ensureProviderChargeRecord({
      transaction: updatedTransaction,
      description: `${tierName ?? 'Provider plan'} billing charge`,
      status: 'FAILED',
      dueDate: updatedTransaction.createdAt,
      paidAt: null,
    });
  }

  return { ok: true, status: 200, message: 'Transaction marked as failed.' } as const;
}

export async function cancelProviderSubscriptionById(subscriptionId: string) {
  const [subscription] = await db
    .select()
    .from(providerSubscriptions)
    .where(eq(providerSubscriptions.id, subscriptionId))
    .limit(1);

  if (!subscription) {
    return { ok: false, status: 404, message: 'Subscription not found.' } as const;
  }

  const timestamp = now();

  await db
    .update(providerSubscriptions)
    .set({
      status: 'CANCELLED',
      endDate: timestamp,
      updatedAt: timestamp,
    })
    .where(eq(providerSubscriptions.id, subscription.id));

  await db
    .update(paymentTransactions)
    .set({ status: 'FAILED' })
    .where(
      and(
        eq(paymentTransactions.subscriptionId, subscription.id),
        eq(paymentTransactions.status, 'PENDING')
      )
    );

  await db
    .update(providerCharges)
    .set({ status: 'FAILED', updatedAt: timestamp })
    .where(
      and(
        eq(providerCharges.subscriptionId, subscription.id),
        eq(providerCharges.status, 'PENDING')
      )
    );

  return { ok: true, status: 200, message: 'Subscription cancelled.' } as const;
}
