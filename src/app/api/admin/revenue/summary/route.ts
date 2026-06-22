import { NextRequest } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';

import {
  apiInternalError,
  apiSuccess,
  db,
  paymentTransactions,
  providerSubscriptions,
  requireAnyPermission,
  subscriptionTiers,
} from '@api/server';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';
import { decimalToNumber } from '@shared/lib/providers/billing';
import {
  buildRevenueBucketKey,
  calculateGatewayHealth,
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
    const gatewayFilter = searchParams.get('gateway')?.trim().toUpperCase() || null;
    const tierFilter = searchParams.get('tier')?.trim() || null;
    const { startDate, endDate } = getDateRangeFromSearchParams(searchParams, 180);

    const rows = await db
      .select({
        id: paymentTransactions.id,
        amount: paymentTransactions.amount,
        platformFee: paymentTransactions.platformFee,
        processorFee: paymentTransactions.processorFee,
        netAmount: paymentTransactions.netAmount,
        status: paymentTransactions.status,
        gateway: paymentTransactions.gateway,
        currency: paymentTransactions.currency,
        createdAt: paymentTransactions.createdAt,
        tierName: subscriptionTiers.name,
      })
      .from(paymentTransactions)
      .leftJoin(providerSubscriptions, eq(providerSubscriptions.id, paymentTransactions.subscriptionId))
      .leftJoin(subscriptionTiers, eq(subscriptionTiers.id, providerSubscriptions.tierId))
      .where(and(eq(paymentTransactions.tenantId, tenantId), sql`${paymentTransactions.createdAt} >= ${startDate}`, sql`${paymentTransactions.createdAt} <= ${endDate}`));

    const filteredRows = rows.filter(row => {
      if (gatewayFilter && row.gateway !== gatewayFilter) {
        return false;
      }

      if (tierFilter && row.tierName !== tierFilter) {
        return false;
      }

      return true;
    });

    const totals = filteredRows.reduce(
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

    const byGateway = filteredRows.reduce(
      (acc, row) => {
        const bucket = acc[row.gateway] ?? {
          gateway: row.gateway,
          transactionCount: 0,
          totalRevenue: 0,
          totalPlatformFees: 0,
          totalProcessorFees: 0,
          totalNetPayout: 0,
        };
        bucket.transactionCount += 1;
        if (row.status === 'COMPLETED') {
          bucket.totalRevenue += decimalToNumber(row.amount);
          bucket.totalPlatformFees += decimalToNumber(row.platformFee);
          bucket.totalProcessorFees += decimalToNumber(row.processorFee);
          bucket.totalNetPayout += decimalToNumber(row.netAmount);
        }
        acc[row.gateway] = bucket;
        return acc;
      },
      {} as Record<string, {
        gateway: string;
        transactionCount: number;
        totalRevenue: number;
        totalPlatformFees: number;
        totalProcessorFees: number;
        totalNetPayout: number;
      }>
    );

    const byTier = filteredRows.reduce(
      (acc, row) => {
        const key = row.tierName ?? 'Unassigned';
        const bucket = acc[key] ?? { tierName: key, totalRevenue: 0, totalPlatformFees: 0, transactionCount: 0 };
        bucket.transactionCount += 1;
        if (row.status === 'COMPLETED') {
          bucket.totalRevenue += decimalToNumber(row.amount);
          bucket.totalPlatformFees += decimalToNumber(row.platformFee);
        }
        acc[key] = bucket;
        return acc;
      },
      {} as Record<string, { tierName: string; totalRevenue: number; totalPlatformFees: number; transactionCount: number }>
    );

    const timeline = filteredRows.reduce(
      (acc, row) => {
        const bucketKey = buildRevenueBucketKey(row.createdAt, grouping);
        const bucket = acc[bucketKey] ?? {
          label: bucketKey,
          totalRevenue: 0,
          totalPlatformFees: 0,
          totalProcessorFees: 0,
          totalNetPayout: 0,
        };
        if (row.status === 'COMPLETED') {
          bucket.totalRevenue += decimalToNumber(row.amount);
          bucket.totalPlatformFees += decimalToNumber(row.platformFee);
          bucket.totalProcessorFees += decimalToNumber(row.processorFee);
          bucket.totalNetPayout += decimalToNumber(row.netAmount);
        }
        acc[bucketKey] = bucket;
        return acc;
      },
      {} as Record<string, {
        label: string;
        totalRevenue: number;
        totalPlatformFees: number;
        totalProcessorFees: number;
        totalNetPayout: number;
      }>
    );

    const recentGatewayStats = filteredRows.reduce(
      (acc, row) => {
        const bucket = acc[row.gateway] ?? { completed: 0, failed: 0, pending: 0 };
        if (row.status === 'COMPLETED') bucket.completed += 1;
        if (row.status === 'FAILED') bucket.failed += 1;
        if (row.status === 'PENDING') bucket.pending += 1;
        acc[row.gateway] = bucket;
        return acc;
      },
      {} as Record<string, { completed: number; failed: number; pending: number }>
    );

    const gatewayHealth = {
      PAYSTACK: calculateGatewayHealth({
        configured: Boolean(process.env.PAYSTACK_SECRET_KEY?.trim()),
        ...(recentGatewayStats.PAYSTACK ?? { completed: 0, failed: 0, pending: 0 }),
      }),
      PAYPAL: calculateGatewayHealth({
        configured: Boolean(
          process.env.PAYPAL_CLIENT_ID?.trim() && process.env.PAYPAL_CLIENT_SECRET?.trim()
        ),
        ...(recentGatewayStats.PAYPAL ?? { completed: 0, failed: 0, pending: 0 }),
      }),
    };

    return apiSuccess({
      dateRange: {
        start: startDate?.toISOString() ?? null,
        end: endDate?.toISOString() ?? null,
        grouping,
      },
      filters: {
        gateway: gatewayFilter,
        tier: tierFilter,
      },
      totals,
      byGateway: Object.values(byGateway),
      byTier: Object.values(byTier),
      timeline: Object.values(timeline).sort((left, right) => left.label.localeCompare(right.label)),
      gatewayHealth,
      licenseCompliance: {
        reference: 'SaaS License Agreement §4.7',
        status: 'tracked',
        trackedBasis: 'Platform-fee and net-payout figures are derived from persisted provider billing transactions.',
        notes: [
          'Revenue sharing reporting is limited to recorded transaction data in this phase.',
          'External settlement workflows and gateway operational probes remain manual.',
        ],
      },
      dataNotes: [
        'Gateway health is inferred from environment configuration plus recent transaction outcomes.',
      ],
    });
  } catch (error) {
    logError(
      { component: 'admin-revenue-summary-api', operation: 'GET' },
      'Admin revenue summary fetch error',
      error
    );
    return apiInternalError();
  }
}
