import { NextRequest } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';

import {
  apiInternalError,
  apiSuccess,
  db,
  paymentTransactions,
  requireAnyPermission,
  serviceProviders,
} from '@api/server';
import { assertModuleEnabled, withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';
import { decimalToNumber } from '@shared/lib/providers';
import {
  getDateRangeFromSearchParams,
  getRefundableAmount,
  parsePositiveInt,
} from '@shared/lib/providers';

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
    const status = searchParams.get('status')?.trim().toUpperCase() || null;
    const gateway = searchParams.get('gateway')?.trim().toUpperCase() || null;
    const { startDate, endDate } = getDateRangeFromSearchParams(searchParams, 90);

    const filters = [
      eq(paymentTransactions.tenantId, tenantId),
      sql`${paymentTransactions.createdAt} >= ${startDate}`,
      sql`${paymentTransactions.createdAt} <= ${endDate}`,
    ];

    if (status) {
      filters.push(
        eq(paymentTransactions.status, status as 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED')
      );
    }

    if (gateway) {
      filters.push(eq(paymentTransactions.gateway, gateway as 'PAYSTACK' | 'PAYPAL'));
    }

    const rows = await db
      .select({
        id: paymentTransactions.id,
        providerId: paymentTransactions.providerId,
        providerCompanyName: serviceProviders.companyName,
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
      })
      .from(paymentTransactions)
      .leftJoin(serviceProviders, eq(serviceProviders.id, paymentTransactions.providerId))
      .where(and(...filters))
      .orderBy(sql`${paymentTransactions.createdAt} desc`)
      .limit(limit)
      .offset(offset);

    const statusCountsRows = await db
      .select({
        status: paymentTransactions.status,
        total: sql<number>`count(*)`,
      })
      .from(paymentTransactions)
      .where(and(eq(paymentTransactions.tenantId, tenantId)))
      .groupBy(paymentTransactions.status);

    const [countRow] = await db
      .select({ total: sql<number>`count(*)` })
      .from(paymentTransactions)
      .where(and(...filters));

    const summary = rows.reduce(
      (acc, row) => {
        acc.totalAmount += decimalToNumber(row.amount);
        acc.totalRefundable += getRefundableAmount({
          amount: decimalToNumber(row.amount),
          netAmount: decimalToNumber(row.netAmount),
        });
        return acc;
      },
      { totalAmount: 0, totalRefundable: 0 }
    );

    return apiSuccess({
      transactions: rows.map(row => ({
        ...row,
        amount: decimalToNumber(row.amount),
        platformFee: decimalToNumber(row.platformFee),
        processorFee: decimalToNumber(row.processorFee),
        netAmount: decimalToNumber(row.netAmount),
        refundableAmount: getRefundableAmount({
          amount: decimalToNumber(row.amount),
          netAmount: decimalToNumber(row.netAmount),
        }),
        createdAt: row.createdAt.toISOString(),
      })),
      statusCounts: statusCountsRows.reduce(
        (acc, row) => ({ ...acc, [row.status]: row.total }),
        {} as Record<string, number>
      ),
      summary,
      pagination: {
        page,
        limit,
        total: countRow?.total ?? 0,
        totalPages: Math.max(1, Math.ceil((countRow?.total ?? 0) / limit)),
      },
    });
  } catch (error) {
    logError(
      { component: 'admin-transactions-api', operation: 'GET' },
      'Admin transactions fetch error',
      error
    );
    return apiInternalError();
  }
}
