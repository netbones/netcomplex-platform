import { NextRequest, NextResponse } from 'next/server';
import {
  auth,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiInternalError,
  db,
  users,
  tenantAiUsages,
  tenants,
  getSessionAndRole,
} from '@api/server';
import { requirePlatformAdmin, withTenant } from '@entities/tenant/server';
import { tenantInvoices } from '@schema/tenant-invoices';
import { eq, and } from 'drizzle-orm';
import { buildOverageInvoicePdf } from '@shared/api/ai/build-overage-invoice-pdf';
import type { OverageInvoiceData } from '@shared/api/ai/build-overage-invoice-pdf';
import { getTierQuota } from '@shared/api/ai/pool';

export const maxDuration = 8;

/** Get session and role from request headers (inline pattern per dispute export route). */
/**
 * GET /api/admin/platform/billing/invoices/[id]/pdf
 *
 * Serves an AI pool overage surcharge invoice as a binary PDF download.
 *
 * Auth: platform admin (any tenant) OR tenant-scoped (own tenant only).
 * The `id` parameter is the invoice number (e.g. INV-AI-2026-05-abc12345).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // ── Auth gate: platform admin OR tenant-scoped ──
  const platformGuard = await requirePlatformAdmin(request);
  let allowedTenantId: string | null = null;

  if (platformGuard !== null) {
    // Not platform admin — try tenant-scoped access
    const authData = await getSessionAndRole(request);
    if (!authData) return apiUnauthorized();

    const { tenantId } = await withTenant();
    allowedTenantId = tenantId;
  }

  // ── Look up invoice by invoice number ──
  const [invoice] = await db
    .select()
    .from(tenantInvoices)
    .where(eq(tenantInvoices.invoiceNumber, id))
    .limit(1);

  if (!invoice) return apiNotFound('Invoice not found');

  // ── Tenant-scoped access check ──
  if (allowedTenantId && invoice.tenantId !== allowedTenantId) {
    return apiForbidden();
  }

  // ── Extract billing month from invoice number pattern ──
  // Format: INV-AI-YYYY-MM-{tenantIdPrefix}
  const monthMatch = invoice.invoiceNumber.match(/INV-AI-(\d{4}-\d{2})-/);
  const billingMonth = monthMatch?.[1] ?? null;
  if (!billingMonth) {
    return apiInternalError('Invalid invoice number format');
  }

  // ── Load usage data for this tenant + billing period ──
  const [usage] = await db
    .select()
    .from(tenantAiUsages)
    .where(
      and(
        eq(tenantAiUsages.tenantId, invoice.tenantId),
        eq(tenantAiUsages.billingMonth, billingMonth)
      )
    )
    .limit(1);

  if (!usage) {
    return apiNotFound('Usage data not available for this billing period');
  }

  // ── Load tier quota for monthly allotment context ──
  const quota = await getTierQuota(invoice.tenantId);

  // ── Load tenant name ──
  const [tenant] = await db
    .select({ name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, invoice.tenantId))
    .limit(1);

  // ── Build PDF data and generate ──
  const pdfData: OverageInvoiceData = {
    tenantName: tenant?.name ?? 'Unknown Tenant',
    billingMonth,
    quota: quota?.monthlyTokens ?? usage.tokensAllotted,
    tokensUsed: usage.tokensUsed,
    overageTokens: usage.overageTokens,
    overageCostZAR: String(usage.overageCostZAR),
    costPerThousandTokens: 0.38, // ZAR 0.38 per 1k tokens (agent discretion)
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.createdAt.toISOString().substring(0, 10),
  };

  const pdfBytes = await buildOverageInvoicePdf(pdfData);
  const pdfBuffer = pdfBytes.slice().buffer as ArrayBuffer;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      'Content-Length': pdfBytes.byteLength.toString(),
    },
  });
}
