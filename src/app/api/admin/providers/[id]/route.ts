import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import {
  apiInternalError,
  apiNotFound,
  apiSuccess,
  db,
  paymentTransactions,
  providerReputations,
  providerLegalAgreements,
  providerMerits,
  providerSubscriptions,
  requireAnyPermission,
  serviceProviders,
  subscriptionTiers,
} from '@api/server';
import { assertModuleEnabled, withTenant } from '@entities/tenant/server';
import {
  getProviderDueDiligenceSnapshot,
  getProviderLegalAgreementStatus,
  getProviderVerificationSnapshot,
} from '@shared/api';
import { logError } from '@shared/lib';
import { decimalToNumber } from '@shared/lib/providers/billing';

export const maxDuration = 8;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const moduleCheck = await assertModuleEnabled('providers');
    if (moduleCheck) return moduleCheck;

    const authError = await requireAnyPermission(['providers']);
    if (authError) {
      return authError;
    }

    const { tenantId } = await withTenant();
    const { id } = await params;

    const [provider] = await db
      .select()
      .from(serviceProviders)
      .where(
        and(
          eq(serviceProviders.tenantId, tenantId),
          eq(serviceProviders.id, id),
          isNull(serviceProviders.deletedAt)
        )
      )
      .limit(1);

    if (!provider) {
      return apiNotFound('Provider not found');
    }

    const verification = await getProviderVerificationSnapshot(tenantId, provider.id);
    const legalStatus = await getProviderLegalAgreementStatus(tenantId, provider.id);
    const dueDiligence = await getProviderDueDiligenceSnapshot(
      tenantId,
      provider.id,
      verification.rawStatus
    );

    const [reputation] = await db
      .select()
      .from(providerReputations)
      .where(
        and(
          eq(providerReputations.tenantId, tenantId),
          eq(providerReputations.providerId, provider.id)
        )
      )
      .limit(1);

    const merits = await db
      .select()
      .from(providerMerits)
      .where(and(eq(providerMerits.tenantId, tenantId), eq(providerMerits.providerId, provider.id)))
      .orderBy(desc(providerMerits.createdAt))
      .limit(20);

    const subscriptions = await db
      .select({
        id: providerSubscriptions.id,
        status: providerSubscriptions.status,
        price: providerSubscriptions.price,
        currency: providerSubscriptions.currency,
        paymentGateway: providerSubscriptions.paymentGateway,
        startDate: providerSubscriptions.startDate,
        endDate: providerSubscriptions.endDate,
        nextBillingDate: providerSubscriptions.nextBillingDate,
        createdAt: providerSubscriptions.createdAt,
        updatedAt: providerSubscriptions.updatedAt,
        tierId: providerSubscriptions.tierId,
        tierName: subscriptionTiers.name,
        tierDescription: subscriptionTiers.description,
        platformFeePercent: subscriptionTiers.platformFeePercent,
      })
      .from(providerSubscriptions)
      .leftJoin(subscriptionTiers, eq(subscriptionTiers.id, providerSubscriptions.tierId))
      .where(
        and(
          eq(providerSubscriptions.tenantId, tenantId),
          eq(providerSubscriptions.providerId, provider.id)
        )
      )
      .orderBy(desc(providerSubscriptions.updatedAt), desc(providerSubscriptions.createdAt));

    const paymentHistory = await db
      .select({
        id: paymentTransactions.id,
        subscriptionId: paymentTransactions.subscriptionId,
        amount: paymentTransactions.amount,
        currency: paymentTransactions.currency,
        platformFee: paymentTransactions.platformFee,
        processorFee: paymentTransactions.processorFee,
        netAmount: paymentTransactions.netAmount,
        status: paymentTransactions.status,
        gateway: paymentTransactions.gateway,
        externalRef: paymentTransactions.externalRef,
        invoiceUrl: paymentTransactions.invoiceUrl,
        createdAt: paymentTransactions.createdAt,
        tierName: subscriptionTiers.name,
      })
      .from(paymentTransactions)
      .leftJoin(
        providerSubscriptions,
        eq(providerSubscriptions.id, paymentTransactions.subscriptionId)
      )
      .leftJoin(subscriptionTiers, eq(subscriptionTiers.id, providerSubscriptions.tierId))
      .where(
        and(
          eq(paymentTransactions.tenantId, tenantId),
          eq(paymentTransactions.providerId, provider.id)
        )
      )
      .orderBy(desc(paymentTransactions.createdAt))
      .limit(50);

    const [revenueSummary] = await db
      .select({
        totalRevenue: sql<string>`coalesce(sum(case when ${paymentTransactions.status} = 'COMPLETED' then ${paymentTransactions.amount} else 0 end), 0)`,
        totalPlatformFees: sql<string>`coalesce(sum(case when ${paymentTransactions.status} = 'COMPLETED' then ${paymentTransactions.platformFee} else 0 end), 0)`,
        totalProcessorFees: sql<string>`coalesce(sum(case when ${paymentTransactions.status} = 'COMPLETED' then ${paymentTransactions.processorFee} else 0 end), 0)`,
        totalNetPayout: sql<string>`coalesce(sum(case when ${paymentTransactions.status} = 'COMPLETED' then ${paymentTransactions.netAmount} else 0 end), 0)`,
      })
      .from(paymentTransactions)
      .where(
        and(
          eq(paymentTransactions.tenantId, tenantId),
          eq(paymentTransactions.providerId, provider.id)
        )
      );

    const legalAgreements = await db
      .select({
        id: providerLegalAgreements.id,
        agreementType: providerLegalAgreements.agreementType,
        version: providerLegalAgreements.version,
        acceptedAt: providerLegalAgreements.acceptedAt,
        ipAddress: providerLegalAgreements.ipAddress,
        userAgent: providerLegalAgreements.userAgent,
      })
      .from(providerLegalAgreements)
      .where(
        and(
          eq(providerLegalAgreements.tenantId, tenantId),
          eq(providerLegalAgreements.providerId, provider.id)
        )
      )
      .orderBy(desc(providerLegalAgreements.acceptedAt));

    const verificationHistory = [
      {
        id: `verification-${provider.id}`,
        status: verification.displayStatus,
        notes: verification.notes,
        createdAt: verification.startDate,
        updatedAt: verification.endDate,
      },
    ];

    const activityTimeline = [
      {
        id: `provider-created-${provider.id}`,
        type: 'REGISTRATION',
        title: 'Provider registration submitted',
        description: `${provider.companyName} entered the moderation workflow.`,
        createdAt: provider.createdAt.toISOString(),
      },
      ...legalAgreements.map(agreement => ({
        id: `legal-${agreement.id}`,
        type: 'LEGAL',
        title: `${agreement.agreementType} accepted`,
        description: `Accepted ${agreement.agreementType} v${agreement.version}`,
        createdAt: agreement.acceptedAt.toISOString(),
      })),
      ...merits.map(merit => ({
        id: `merit-${merit.id}`,
        type: 'CREDIT',
        title: `${merit.meritType.replace('_', ' ')} merit recorded`,
        description: merit.description ?? `${merit.points} points applied.`,
        createdAt: merit.createdAt.toISOString(),
      })),
      ...paymentHistory.slice(0, 10).map(payment => ({
        id: `payment-${payment.id}`,
        type: 'PAYMENT',
        title: `${payment.gateway} transaction ${payment.status.toLowerCase()}`,
        description: `${payment.tierName ?? 'Provider plan'} • ${decimalToNumber(payment.amount).toFixed(2)} ${payment.currency}`,
        createdAt: payment.createdAt.toISOString(),
      })),
    ].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    const linkedGateways = Array.from(
      new Set(
        [
          ...subscriptions.map(subscription => subscription.paymentGateway).filter(Boolean),
          ...paymentHistory.map(payment => payment.gateway).filter(Boolean),
        ].filter(Boolean)
      )
    );

    return apiSuccess({
      provider: {
        ...provider,
        verificationStatus: verification.displayStatus,
      },
      verification,
      verificationHistory,
      dueDiligence,
      legalStatus,
      legalAgreements: legalAgreements.map(agreement => ({
        ...agreement,
        acceptedAt: agreement.acceptedAt.toISOString(),
      })),
      reputation: reputation
        ? {
            ...reputation,
            lastCalculatedAt: reputation.lastCalculatedAt?.toISOString() ?? null,
          }
        : null,
      reputationHistory: merits.map(merit => ({
        ...merit,
        createdAt: merit.createdAt.toISOString(),
      })),
      subscriptions: subscriptions.map(subscription => ({
        ...subscription,
        price: decimalToNumber(subscription.price),
        platformFeePercent: decimalToNumber(subscription.platformFeePercent),
        startDate: subscription.startDate?.toISOString() ?? null,
        endDate: subscription.endDate?.toISOString() ?? null,
        nextBillingDate: subscription.nextBillingDate?.toISOString() ?? null,
        createdAt: subscription.createdAt.toISOString(),
        updatedAt: subscription.updatedAt.toISOString(),
      })),
      paymentHistory: paymentHistory.map(payment => ({
        ...payment,
        amount: decimalToNumber(payment.amount),
        platformFee: decimalToNumber(payment.platformFee),
        processorFee: decimalToNumber(payment.processorFee),
        netAmount: decimalToNumber(payment.netAmount),
        createdAt: payment.createdAt.toISOString(),
      })),
      paymentProfile: {
        linkedGateways,
        currentGateway: subscriptions[0]?.paymentGateway ?? paymentHistory[0]?.gateway ?? null,
        currentTier: subscriptions[0]?.tierName ?? null,
        note:
          linkedGateways.length > 0
            ? 'Gateway linkage is inferred from recorded subscriptions and transactions. External merchant account metadata is not persisted yet.'
            : 'No recorded gateway activity yet for this provider.',
      },
      revenueSummary: {
        totalRevenue: decimalToNumber(revenueSummary?.totalRevenue),
        totalPlatformFees: decimalToNumber(revenueSummary?.totalPlatformFees),
        totalProcessorFees: decimalToNumber(revenueSummary?.totalProcessorFees),
        totalNetPayout: decimalToNumber(revenueSummary?.totalNetPayout),
      },
      activityTimeline,
    });
  } catch (error) {
    logError(
      { component: 'admin-provider-detail-api', operation: 'GET' },
      'Admin provider detail fetch error',
      error
    );
    return apiInternalError();
  }
}
