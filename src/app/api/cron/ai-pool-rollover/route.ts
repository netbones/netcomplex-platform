import { eq, and } from 'drizzle-orm';
import { db, tenantAiUsages, apiSuccess, apiError, apiInternalError } from '@api/server';

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

    const result = await db
      .update(tenantAiUsages)
      .set({ status: 'SETTLED' as const, updatedAt: new Date() })
      .where(and(eq(tenantAiUsages.billingMonth, prevMonth), eq(tenantAiUsages.status, 'ACTIVE')))
      .returning({ id: tenantAiUsages.id });

    return apiSuccess({ settled: prevMonth, count: result.length });
  } catch {
    return apiInternalError('Failed to settle previous month');
  }
}
