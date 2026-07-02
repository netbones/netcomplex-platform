import { NextRequest } from 'next/server';
import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';

import {
  apiInternalError,
  apiSuccess,
  db,
  notDeleted,
  paymentTransactions,
  providerReputations,
  providerVerifications,
  requireAnyPermission,
  serviceProviders,
} from '@api/server';
import { assertModuleEnabled, withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';
import { decimalToNumber } from '@shared/lib/providers/billing';
import { normalizeAdminProviderStatus, parsePositiveInt } from '@shared/lib/providers/admin';

export const maxDuration = 8;

export async function GET(request: NextRequest) {
  try {
    const moduleCheck = await assertModuleEnabled('providers');
    if (moduleCheck) return moduleCheck;

    const authError = await requireAnyPermission(['providers']);
    if (authError) {
      return authError;
    }

    const { tenantId } = await withTenant();
    const searchParams = request.nextUrl.searchParams;
    const status = normalizeAdminProviderStatus(searchParams.get('status'));
    const search = searchParams.get('search')?.trim();
    const page = parsePositiveInt(searchParams.get('page'), 1, { min: 1, max: 1000 });
    const limit = parsePositiveInt(searchParams.get('limit'), 20, { min: 1, max: 50 });
    const offset = (page - 1) * limit;

    const filters = [eq(serviceProviders.tenantId, tenantId), notDeleted(serviceProviders)];

    if (search) {
      filters.push(
        or(
          ilike(serviceProviders.companyName, `%${search}%`),
          ilike(serviceProviders.contactName, `%${search}%`),
          ilike(serviceProviders.email, `%${search}%`),
          ilike(serviceProviders.trade, `%${search}%`)
        )!
      );
    }

    if (status) {
      filters.push(sql`coalesce(${providerVerifications.status}::text, 'PENDING') = ${status}`);
    }

    const rows = await db
      .select({
        id: serviceProviders.id,
        companyName: serviceProviders.companyName,
        contactName: serviceProviders.contactName,
        email: serviceProviders.email,
        trade: serviceProviders.trade,
        isActive: serviceProviders.isActive,
        createdAt: serviceProviders.createdAt,
        verificationStatus: sql<string>`coalesce(${providerVerifications.status}::text, 'PENDING')`,
        verificationNotes: providerVerifications.notes,
        reputationScore: sql<number>`coalesce(${providerReputations.totalScore}, 0)`,
        revenueTotal: sql<string>`coalesce(sum(case when ${paymentTransactions.status} = 'COMPLETED' then ${paymentTransactions.amount} else 0 end), 0)`,
        platformFeeTotal: sql<string>`coalesce(sum(case when ${paymentTransactions.status} = 'COMPLETED' then ${paymentTransactions.platformFee} else 0 end), 0)`,
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
      .leftJoin(
        paymentTransactions,
        and(
          eq(paymentTransactions.tenantId, serviceProviders.tenantId),
          eq(paymentTransactions.providerId, serviceProviders.id)
        )
      )
      .where(and(...filters))
      .groupBy(
        serviceProviders.id,
        providerVerifications.status,
        providerVerifications.notes,
        providerReputations.totalScore
      )
      .orderBy(desc(serviceProviders.createdAt))
      .limit(limit)
      .offset(offset);

    const [countRow] = await db
      .select({ total: sql<number>`count(*)` })
      .from(serviceProviders)
      .leftJoin(
        providerVerifications,
        and(
          eq(providerVerifications.tenantId, serviceProviders.tenantId),
          eq(providerVerifications.providerId, serviceProviders.id)
        )
      )
      .where(and(...filters));

    const statusRows = await db
      .select({
        status: sql<string>`coalesce(${providerVerifications.status}::text, 'PENDING')`,
        total: sql<number>`count(*)`,
      })
      .from(serviceProviders)
      .leftJoin(
        providerVerifications,
        and(
          eq(providerVerifications.tenantId, serviceProviders.tenantId),
          eq(providerVerifications.providerId, serviceProviders.id)
        )
      )
      .where(and(eq(serviceProviders.tenantId, tenantId), notDeleted(serviceProviders)))
      .groupBy(sql`coalesce(${providerVerifications.status}::text, 'PENDING')`);

    const [revenueSummary] = await db
      .select({
        totalRevenue: sql<string>`coalesce(sum(case when ${paymentTransactions.status} = 'COMPLETED' then ${paymentTransactions.amount} else 0 end), 0)`,
        totalPlatformFees: sql<string>`coalesce(sum(case when ${paymentTransactions.status} = 'COMPLETED' then ${paymentTransactions.platformFee} else 0 end), 0)`,
        monthlyRevenue: sql<string>`coalesce(sum(case when ${paymentTransactions.status} = 'COMPLETED' and ${paymentTransactions.createdAt} >= now() - interval '30 day' then ${paymentTransactions.amount} else 0 end), 0)`,
        yearlyRevenue: sql<string>`coalesce(sum(case when ${paymentTransactions.status} = 'COMPLETED' and ${paymentTransactions.createdAt} >= now() - interval '365 day' then ${paymentTransactions.amount} else 0 end), 0)`,
      })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.tenantId, tenantId));

    const counts = {
      ALL: countRow?.total ?? 0,
      PENDING: 0,
      PROBATION: 0,
      VERIFIED: 0,
      SUSPENDED: 0,
    };

    for (const row of statusRows) {
      if (row.status in counts) {
        counts[row.status as keyof typeof counts] = row.total ?? 0;
      }
    }

    return apiSuccess({
      providers: rows.map(row => ({
        ...row,
        reputationScore: row.reputationScore ?? 0,
        revenueTotal: decimalToNumber(row.revenueTotal),
        platformFeeTotal: decimalToNumber(row.platformFeeTotal),
      })),
      pagination: {
        page,
        limit,
        total: countRow?.total ?? 0,
        totalPages: Math.max(1, Math.ceil((countRow?.total ?? 0) / limit)),
      },
      counts,
      summary: {
        totalProviders: countRow?.total ?? 0,
        pendingProviders: counts.PENDING,
        probationProviders: counts.PROBATION,
        verifiedProviders: counts.VERIFIED,
        suspendedProviders: counts.SUSPENDED,
        totalRevenue: decimalToNumber(revenueSummary?.totalRevenue),
        totalPlatformFees: decimalToNumber(revenueSummary?.totalPlatformFees),
        monthlyRevenue: decimalToNumber(revenueSummary?.monthlyRevenue),
        yearlyRevenue: decimalToNumber(revenueSummary?.yearlyRevenue),
      },
    });
  } catch (error) {
    logError(
      { component: 'admin-provider-list-api', operation: 'GET' },
      'Admin provider list fetch error',
      error
    );
    return apiInternalError();
  }
}
