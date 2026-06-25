import { NextRequest } from 'next/server';
import { and, desc, eq, lt } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { tenantInvoices } from '@schema/tenant-invoices';
import { apiSuccess, apiInternalError } from '@api/server';
import { db } from '@api/server';
import { logError } from '@shared/lib';

export const maxDuration = 8;

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await withTenant();
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const where = and(
      eq(tenantInvoices.tenantId, tenantId),
      ...(cursor ? [lt(tenantInvoices.id, cursor)] : [])
    );

    const invoices = await db
      .select()
      .from(tenantInvoices)
      .where(where)
      .orderBy(desc(tenantInvoices.createdAt))
      .limit(limit);

    return apiSuccess(invoices);
  } catch (error) {
    logError(
      { component: 'tenant-billing-invoices-api', operation: 'GET' },
      'Failed to list invoices',
      error
    );
    return apiInternalError();
  }
}
