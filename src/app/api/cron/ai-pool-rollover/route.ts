import { eq, and, inArray } from 'drizzle-orm';
import { db, tenantAiUsages, apiSuccess, apiError, apiInternalError } from '@api/server';
import { getTierQuota } from '@shared/api/ai/pool';
import { ensureOverageInvoiceRecord, recordBillingEvent } from '@api/server';
import { tenantSubscriptions } from '@schema/tenant-subscriptions';

export const maxDuration = 30;

/** Returns previous billing month as 'YYYY-MM'. */
function getPreviousBillingMonth(): string {
  const d = new Date();
  // Go back to previous month
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Deploy: configure Vercel Cron Job to POST /api/cron/ai-pool-rollover on 1st of month at 00:00 UTC
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expected || !process.env.CRON_SECRET) {
    return apiError('UNAUTHORIZED', 'Invalid cron secret', 401);
  }

  try {
    const prevMonth = getPreviousBillingMonth();

    // Step 1: Settle ACTIVE usage records for the previous month
    const result = await db
      .update(tenantAiUsages)
      .set({ status: 'SETTLED' as const, updatedAt: new Date() })
      .where(and(eq(tenantAiUsages.billingMonth, prevMonth), eq(tenantAiUsages.status, 'ACTIVE')))
      .returning({
        id: tenantAiUsages.id,
        tenantId: tenantAiUsages.tenantId,
        overageTokens: tenantAiUsages.overageTokens,
        overageCostZAR: tenantAiUsages.overageCostZAR,
      });

    // Step 2: Generate surcharge invoices for overage tenants
    const surchargeResults: Array<{
      tenantId: string;
      overageTokens: number;
      overageCostZAR: string;
      invoiceNumber: string;
      invoiceId: string;
      status:
        | 'surcharged'
        | 'skipped_quota'
        | 'skipped_policy'
        | 'skipped_no_subscription'
        | 'error';
    }> = [];

    for (const row of result) {
      try {
        // Only generate surcharge for tenants with overage > 0
        if (row.overageTokens <= 0) continue;

        // Load tier quota
        const quota = await getTierQuota(row.tenantId);
        if (!quota) {
          surchargeResults.push({
            tenantId: row.tenantId,
            overageTokens: row.overageTokens,
            overageCostZAR: String(row.overageCostZAR),
            invoiceNumber: '',
            invoiceId: '',
            status: 'skipped_quota',
          });
          continue;
        }

        // Only SURCHARGE policy generates billing
        if (quota.overagePolicy !== 'SURCHARGE') {
          surchargeResults.push({
            tenantId: row.tenantId,
            overageTokens: row.overageTokens,
            overageCostZAR: String(row.overageCostZAR),
            invoiceNumber: '',
            invoiceId: '',
            status: 'skipped_policy',
          });
          continue;
        }

        // Find active subscription (prefer ACTIVE, then PENDING, then TRIALING)
        const [subscription] = await db
          .select()
          .from(tenantSubscriptions)
          .where(
            and(
              eq(tenantSubscriptions.tenantId, row.tenantId),
              inArray(tenantSubscriptions.status, ['ACTIVE', 'PENDING', 'TRIALING'])
            )
          )
          .limit(1);

        if (!subscription) {
          surchargeResults.push({
            tenantId: row.tenantId,
            overageTokens: row.overageTokens,
            overageCostZAR: String(row.overageCostZAR),
            invoiceNumber: '',
            invoiceId: '',
            status: 'skipped_no_subscription',
          });
          continue;
        }

        // Determine invoice ID (predictable: same pattern as invoiceNumber)
        const invoiceNumber = `INV-AI-${prevMonth}-${row.tenantId.slice(0, 8)}`;
        const pdfUrl = `/api/admin/platform/billing/invoices/${invoiceNumber}/pdf`;

        // Record billing event
        await recordBillingEvent({
          tenantId: row.tenantId,
          subscriptionId: subscription.id,
          planId: subscription.planId,
          eventType: 'AI_OVERAGE_CHARGED',
          metadata: {
            billingMonth: prevMonth,
            overageTokens: row.overageTokens,
            overageCostZAR: String(row.overageCostZAR),
          },
        });

        // Create invoice record
        const invoice = await ensureOverageInvoiceRecord({
          tenantId: row.tenantId,
          subscriptionId: subscription.id,
          billingMonth: prevMonth,
          overageTokens: row.overageTokens,
          overageCostZAR: String(row.overageCostZAR),
          pdfUrl,
        });

        surchargeResults.push({
          tenantId: row.tenantId,
          overageTokens: row.overageTokens,
          overageCostZAR: String(row.overageCostZAR),
          invoiceNumber: invoice.invoiceNumber,
          invoiceId: invoice.id,
          status: 'surcharged',
        });
      } catch {
        surchargeResults.push({
          tenantId: row.tenantId,
          overageTokens: row.overageTokens,
          overageCostZAR: String(row.overageCostZAR),
          invoiceNumber: '',
          invoiceId: '',
          status: 'error',
        });
      }
    }

    return apiSuccess({
      settled: prevMonth,
      count: result.length,
      surcharged: surchargeResults,
    });
  } catch {
    return apiInternalError('Failed to settle previous month');
  }
}
