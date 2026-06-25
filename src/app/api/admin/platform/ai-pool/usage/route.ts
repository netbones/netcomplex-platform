import { NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { requirePlatformAdmin } from '@entities/tenant/server';
import {
  db,
  tenantAiUsages,
  tenants,
  apiSuccess,
  apiInternalError,
  getCurrentBillingMonth,
} from '@api/server';

export const maxDuration = 8;

export async function GET(request: NextRequest) {
  const guard = await requirePlatformAdmin(request);
  if (guard) return guard;

  try {
    const url = new URL(request.url);
    const month = url.searchParams.get('month') || getCurrentBillingMonth();

    const rows = await db
      .select({
        tenantId: tenantAiUsages.tenantId,
        tenantName: tenants.name,
        tier: tenants.tier,
        tokensUsed: tenantAiUsages.tokensUsed,
        tokensAllotted: tenantAiUsages.tokensAllotted,
        overageTokens: tenantAiUsages.overageTokens,
        overageCostZAR: tenantAiUsages.overageCostZAR,
        status: tenantAiUsages.status,
      })
      .from(tenantAiUsages)
      .innerJoin(tenants, eq(tenantAiUsages.tenantId, tenants.id))
      .where(eq(tenantAiUsages.billingMonth, month))
      .orderBy(desc(tenantAiUsages.tokensUsed));

    const results = rows.map(r => {
      const usagePercent =
        r.tokensAllotted > 0 ? Math.round((r.tokensUsed / r.tokensAllotted) * 100) : 0;
      return { ...r, usagePercent };
    });

    return apiSuccess(results);
  } catch {
    return apiInternalError('Failed to fetch usage data');
  }
}
