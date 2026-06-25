import { NextRequest } from 'next/server';
import { requirePlatformAdmin } from '@entities/tenant/server';
import { apiSuccess, apiInternalError, db } from '@api/server';
import { logError } from '@shared/lib';
import { tenantPayments } from '@schema/tenant-payments';
import { tenants } from '@schema/tenants';
import { eq, desc, and, lt } from 'drizzle-orm';

export const maxDuration = 8;

export async function GET(request: NextRequest) {
  const guard = await requirePlatformAdmin(request);
  if (guard) return guard;

  try {
    const { searchParams } = new URL(request.url);
    const tenantIdFilter = searchParams.get('tenantId') || undefined;
    const statusFilter = searchParams.get('status') || undefined;
    const gatewayFilter = searchParams.get('gateway') || undefined;
    const cursor = searchParams.get('cursor') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const filters: Array<ReturnType<typeof eq>> = [];

    if (tenantIdFilter) {
      filters.push(eq(tenantPayments.tenantId, tenantIdFilter));
    }
    if (statusFilter) {
      filters.push(
        eq(tenantPayments.status, statusFilter as (typeof tenantPayments.$inferSelect)['status'])
      );
    }
    if (gatewayFilter) {
      filters.push(
        eq(tenantPayments.gateway, gatewayFilter as (typeof tenantPayments.$inferSelect)['gateway'])
      );
    }
    if (cursor) {
      filters.push(lt(tenantPayments.id, cursor));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const rows = await db
      .select({
        id: tenantPayments.id,
        tenantId: tenantPayments.tenantId,
        subscriptionId: tenantPayments.subscriptionId,
        amount: tenantPayments.amount,
        currency: tenantPayments.currency,
        platformFee: tenantPayments.platformFee,
        processorFee: tenantPayments.processorFee,
        netAmount: tenantPayments.netAmount,
        status: tenantPayments.status,
        gateway: tenantPayments.gateway,
        externalRef: tenantPayments.externalRef,
        invoiceUrl: tenantPayments.invoiceUrl,
        couponId: tenantPayments.couponId,
        createdAt: tenantPayments.createdAt,
        tenantName: tenants.name,
      })
      .from(tenantPayments)
      .leftJoin(tenants, eq(tenantPayments.tenantId, tenants.id))
      .where(whereClause)
      .orderBy(desc(tenantPayments.createdAt))
      .limit(limit);

    return apiSuccess(rows);
  } catch (error) {
    logError(
      { component: 'platform-billing-payments-api', operation: 'GET' },
      'Failed to list payments',
      error
    );
    return apiInternalError();
  }
}
