import { NextRequest } from 'next/server';
import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm';

import {
  apiInternalError,
  apiSuccess,
  db,
  paymentTransactions,
  providerReputations,
  providerVerifications,
  requireAnyPermission,
  serviceProviders,
} from '@api/server';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';
import { decimalToNumber } from '@shared/lib/providers/billing';
import {
  buildRevenueBucketKey,
  getDateRangeFromSearchParams,
  normalizeRevenueGrouping,
} from '@shared/lib/providers/admin';

export const maxDuration = 8;

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAnyPermission(['providers']);
    if (authError) {
      return authError;
    }

    const { tenantId } = await withTenant();
    const searchParams = request.nextUrl.searchParams;
    const grouping = normalizeRevenueGrouping(searchParams.get('grouping'));
    const { startDate, endDate } = getDateRangeFromSearchParams(searchParams, 180);

    const providerRows = await db
      .select({
        id: serviceProviders.id,
        companyName: serviceProviders.companyName,
        createdAt: serviceProviders.createdAt,
        status: sql<string>`coalesce(${providerVerifications.status}::text, 'PENDING')`,
        reputationScore: sql<number>`coalesce(${providerReputations.totalScore}, 0)`,
      })
      .from(serviceProviders)
      .leftJoin(
        providerVerifications,
        and(
          eq(providerVerifications.tenantId, serviceProviders.tenantId),
          eq(providerVerifications.providerId, serviceProviders.id)
        )
      )
      .leftJoin(
        providerReputations,
        and(
          eq(providerReputations.tenantId, serviceProviders.tenantId),
          eq(providerReputations.providerId, serviceProviders.id)
        )
      )
      .where(and(eq(serviceProviders.tenantId, tenantId), isNull(serviceProviders.deletedAt)));

    const totalProviders = providerRows.length;
    const statusCounts = providerRows.reduce(
      (acc, provider) => {
        const key = provider.status as 'PENDING' | 'PROBATION' | 'VERIFIED' | 'SUSPENDED';
        if (key in acc) {
          acc[key] += 1;
        }
        return acc;
      },
      { PENDING: 0, PROBATION: 0, VERIFIED: 0, SUSPENDED: 0 }
    );

    const verificationRate =
      totalProviders > 0 ? Number(((statusCounts.VERIFIED / totalProviders) * 100).toFixed(1)) : 0;
    const averageReputationScore =
      totalProviders > 0
        ? Number(
            (
              providerRows.reduce((sum, provider) => sum + (provider.reputationScore ?? 0), 0) /
              totalProviders
            ).toFixed(1)
          )
        : 0;

    const newProvidersThisMonth = providerRows.filter(
      provider => provider.createdAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;
    const newProvidersThisQuarter = providerRows.filter(
      provider => provider.createdAt >= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    ).length;

    const topProviders = [...providerRows]
      .sort((left, right) => (right.reputationScore ?? 0) - (left.reputationScore ?? 0))
      .slice(0, 5);

    const paymentFilters = [eq(paymentTransactions.tenantId, tenantId)];
    if (startDate) {
      paymentFilters.push(gte(paymentTransactions.createdAt, startDate));
    }
    if (endDate) {
      paymentFilters.push(sql`${paymentTransactions.createdAt} <= ${endDate}`);
    }

    const paymentRows = await db
      .select({
        id: paymentTransactions.id,
        providerId: paymentTransactions.providerId,
        amount: paymentTransactions.amount,
        platformFee: paymentTransactions.platformFee,
        processorFee: paymentTransactions.processorFee,
        netAmount: paymentTransactions.netAmount,
        status: paymentTransactions.status,
        gateway: paymentTransactions.gateway,
        createdAt: paymentTransactions.createdAt,
      })
      .from(paymentTransactions)
      .where(and(...paymentFilters))
      .orderBy(desc(paymentTransactions.createdAt));

    const revenueMetrics = paymentRows.reduce(
      (acc, row) => {
        if (row.status === 'COMPLETED') {
          acc.totalRevenue += decimalToNumber(row.amount);
          acc.totalPlatformFees += decimalToNumber(row.platformFee);
          acc.totalProcessorFees += decimalToNumber(row.processorFee);
          acc.totalNetPayout += decimalToNumber(row.netAmount);
        }
        return acc;
      },
      {
        totalRevenue: 0,
        totalPlatformFees: 0,
        totalProcessorFees: 0,
        totalNetPayout: 0,
      }
    );

    const paymentMethodDistribution = paymentRows.reduce(
      (acc, row) => {
        const bucket = acc[row.gateway] ?? { gateway: row.gateway, count: 0, revenue: 0 };
        bucket.count += 1;
        if (row.status === 'COMPLETED') {
          bucket.revenue += decimalToNumber(row.amount);
        }
        acc[row.gateway] = bucket;
        return acc;
      },
      {} as Record<string, { gateway: string; count: number; revenue: number }>
    );

    const registrationTimeline = providerRows.reduce(
      (acc, provider) => {
        if (!startDate || provider.createdAt >= startDate) {
          const bucket = buildRevenueBucketKey(provider.createdAt, grouping);
          acc[bucket] = (acc[bucket] ?? 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    const suspendedReasons = providerRows
      .filter(provider => provider.status === 'SUSPENDED')
      .map(provider => ({
        companyName: provider.companyName,
        reason: 'See moderation notes in provider detail.',
      }))
      .slice(0, 5);

    return apiSuccess({
      dateRange: {
        start: startDate?.toISOString() ?? null,
        end: endDate?.toISOString() ?? null,
        grouping,
      },
      metrics: {
        totalProviders,
        newProvidersThisMonth,
        newProvidersThisQuarter,
        verificationRate,
        averageReputationScore,
        suspendedCount: statusCounts.SUSPENDED,
        revenueMetrics,
      },
      statusCounts,
      topProviders,
      suspendedReasons,
      paymentMethodDistribution: Object.values(paymentMethodDistribution),
      registrationTimeline: Object.entries(registrationTimeline)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([label, value]) => ({ label, value })),
    });
  } catch (error) {
    logError(
      { component: 'admin-provider-analytics-api', operation: 'GET' },
      'Admin provider analytics fetch error',
      error
    );
    return apiInternalError();
  }
}
