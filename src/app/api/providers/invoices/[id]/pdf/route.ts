import { NextResponse } from 'next/server';
import { db, apiNotFound, apiUnauthorized, apiInternalError } from '@api/server';
import { providerInvoices } from '@schema/provider-invoices';
import { serviceProviders } from '@schema/service-providers';
import { tenants } from '@schema/tenants';
import { eq } from 'drizzle-orm';
import { buildProviderInvoicePdf } from '@shared/api';
import { auth } from '@api/server';
import { apiLogger } from '@/shared/lib/logger';

export const maxDuration = 8;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth.api.getSession({
    headers: _request.headers,
  });

  if (!session?.user?.id) {
    return apiUnauthorized();
  }

  try {
    const [invoice] = await db
      .select({
        invoice: providerInvoices,
        provider: serviceProviders,
        tenant: { id: tenants.id, name: tenants.name },
      })
      .from(providerInvoices)
      .innerJoin(serviceProviders, eq(providerInvoices.providerId, serviceProviders.id))
      .innerJoin(tenants, eq(providerInvoices.tenantId, tenants.id))
      .where(eq(providerInvoices.id, id))
      .limit(1);

    if (!invoice) {
      return apiNotFound('Invoice not found');
    }

    const items = (invoice.invoice.items as Array<{ description: string; amount: string }>) ?? [];

    const data = {
      invoiceNumber: invoice.invoice.invoiceNumber,
      invoiceDate: invoice.invoice.createdAt.toISOString().split('T')[0],
      providerName: invoice.provider.companyName,
      providerId: invoice.invoice.providerId,
      tenantName: invoice.tenant.name,
      items,
      subtotal: String(invoice.invoice.netAmount),
      platformFee: String(invoice.invoice.platformFee),
      processorFee: String(invoice.invoice.processorFee),
      netAmount: String(invoice.invoice.netAmount),
      total: String(invoice.invoice.total),
      currency: invoice.invoice.currency ?? 'ZAR',
      status: invoice.invoice.status ?? 'PENDING',
      paidAt: invoice.invoice.paidAt?.toISOString()?.split('T')[0] ?? null,
    };

    const pdfBytes = await buildProviderInvoicePdf(data);

    const filename = `${invoice.invoice.invoiceNumber}.pdf`;
    const pdfBuffer = pdfBytes.slice().buffer as ArrayBuffer;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    apiLogger.error({ error }, 'Provider invoice PDF generation failed');
    return apiInternalError('Failed to generate invoice PDF');
  }
}
