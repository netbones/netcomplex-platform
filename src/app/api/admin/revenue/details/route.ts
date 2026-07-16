import { NextRequest } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';

import {
  apiInternalError,
  apiSuccess,
  db,
  paymentTransactions,
  providerSubscriptions,
  requireAnyPermission,
  serviceProviders,
  subscriptionTiers,
} from '@api/server';
import { assertModuleEnabled, withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';
import { decimalToNumber } from '@shared/lib/providers';
import { getDateRangeFromSearchParams, parsePositiveInt } from '@shared/lib/providers';

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
    const page = parsePositiveInt(searchParams.get('page'), 1, { min: 1, max: 1000 });
    const limit = parsePositiveInt(searchParams.get('limit'), 20, { min: 1, max: 100 });
    const offset = (page - 1) * limit;
    const gateway = searchParams.get('gateway')?.trim().toUpperCase() || null;
    const status = searchParams.get('status')?.trim().toUpperCase() || null;
    const search = searchParams.get('search')?.trim() || null;
    const { startDate, endDate } = getDateRangeFromSearchParams(searchParams, 180);

    const baseFilters = [
      eq(paymentTransactions.tenantId, tenantId),
      sql`${paymentTransactions.createdAt} >= ${startDate}`,
      sql`${paymentTransactions.createdAt} <= ${endDate}`,
    ];

    if (gateway) {
      baseFilters.push(eq(paymentTransactions.gateway, gateway as 'PAYSTACK' | 'PAYPAL'));
    }

    if (status) {
      baseFilters.push(
        eq(paymentTransactions.status, status as 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED')
      );
    }

    if (search) {
      baseFilters.push(
        sql`(${serviceProviders.companyName} ilike ${`%${search}%`} or ${paymentTransactions.externalRef} ilike ${`%${search}%`})`
      );
    }

    const rows = await db
      .select({
        id: paymentTransactions.id,
        providerId: paymentTransactions.providerId,
        providerCompanyName: serviceProviders.companyName,
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
      .leftJoin(serviceProviders, eq(serviceProviders.id, paymentTransactions.providerId))
      .leftJoin(
        providerSubscriptions,
        eq(providerSubscriptions.id, paymentTransactions.subscriptionId)
      )
      .leftJoin(subscriptionTiers, eq(subscriptionTiers.id, providerSubscriptions.tierId))
      .where(and(...baseFilters))
      .orderBy(sql`${paymentTransactions.createdAt} desc`)
      .limit(limit)
      .offset(offset);

    const [countRow] = await db
      .select({ total: sql<number>`count(*)` })
      .from(paymentTransactions)
      .leftJoin(serviceProviders, eq(serviceProviders.id, paymentTransactions.providerId))
      .where(and(...baseFilters));

    return apiSuccess({
      transactions: rows.map(row => ({
        ...row,
        amount: decimalToNumber(row.amount),
        platformFee: decimalToNumber(row.platformFee),
        processorFee: decimalToNumber(row.processorFee),
        netAmount: decimalToNumber(row.netAmount),
        createdAt: row.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total: countRow?.total ?? 0,
        totalPages: Math.max(1, Math.ceil((countRow?.total ?? 0) / limit)),
      },
    });
  } catch (error) {
    logError(
      { component: 'admin-revenue-details-api', operation: 'GET' },
      'Admin revenue details fetch error',
      error
    );
    return apiInternalError();
  }
}
