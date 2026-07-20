import { NextRequest } from 'next/server';
import { requirePlatformAdmin } from '@entities/tenant/server';
import { apiSuccess, apiInternalError, db } from '@api/server';
import { logError } from '@shared/lib';
import { tenantInvoices } from '@schema/tenant-invoices';
import { tenants } from '@schema/tenants';
import { tenantSubscriptions } from '@schema/tenant-subscriptions';
import { billingPlans } from '@schema/billing-plans';
import { eq, desc, and, lt } from 'drizzle-orm';

export const maxDuration = 8;

/**
 * @deprecated Use trpc.admin.billing.listInvoices instead.
 */
export async function GET(request: NextRequest) {
  const guard = await requirePlatformAdmin(request);
  if (guard) return guard;

  try {
    const { searchParams } = new URL(request.url);
    const tenantIdFilter = searchParams.get('tenantId') || undefined;
    const subscriptionIdFilter = searchParams.get('subscriptionId') || undefined;
    const statusFilter = searchParams.get('status') || undefined;
    const cursor = searchParams.get('cursor') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const filters: Array<ReturnType<typeof eq>> = [];

    if (tenantIdFilter) {
      filters.push(eq(tenantInvoices.tenantId, tenantIdFilter));
    }
    if (subscriptionIdFilter) {
      filters.push(eq(tenantInvoices.subscriptionId, subscriptionIdFilter));
    }
    if (statusFilter) {
      filters.push(
        eq(tenantInvoices.status, statusFilter as (typeof tenantInvoices.$inferSelect)['status'])
      );
    }

    if (cursor) {
      filters.push(lt(tenantInvoices.id, cursor));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const rows = await db
      .select({
        id: tenantInvoices.id,
        tenantId: tenantInvoices.tenantId,
        subscriptionId: tenantInvoices.subscriptionId,
        transactionId: tenantInvoices.transactionId,
        invoiceNumber: tenantInvoices.invoiceNumber,
        items: tenantInvoices.items,
        subtotal: tenantInvoices.subtotal,
        taxAmount: tenantInvoices.taxAmount,
        total: tenantInvoices.total,
        currency: tenantInvoices.currency,
        status: tenantInvoices.status,
        paidAt: tenantInvoices.paidAt,
        pdfUrl: tenantInvoices.pdfUrl,
        downloadReady: tenantInvoices.downloadReady,
        createdAt: tenantInvoices.createdAt,
        updatedAt: tenantInvoices.updatedAt,
        tenantName: tenants.name,
        subscriptionPlanName: billingPlans.name,
      })
      .from(tenantInvoices)
      .leftJoin(tenants, eq(tenantInvoices.tenantId, tenants.id))
      .leftJoin(tenantSubscriptions, eq(tenantInvoices.subscriptionId, tenantSubscriptions.id))
      .leftJoin(billingPlans, eq(tenantSubscriptions.planId, billingPlans.id))
      .where(whereClause)
      .orderBy(desc(tenantInvoices.createdAt))
      .limit(limit);

    return apiSuccess(rows);
  } catch (error) {
    logError(
      { component: 'platform-billing-invoices-api', operation: 'GET' },
      'Failed to list invoices',
      error
    );
    return apiInternalError();
  }
}
