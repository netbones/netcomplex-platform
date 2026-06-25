import { NextRequest } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { requirePlatformAdmin } from '@entities/tenant/server';
import {
  db,
  tenantAiUsages,
  aiUsageEvents,
  tenants,
  apiSuccess,
  apiNotFound,
  apiInternalError,
  getCurrentBillingMonth,
} from '@api/server';

export const maxDuration = 8;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const guard = await requirePlatformAdmin(request);
  if (guard) return guard;

  try {
    const { tenantId } = await params;
    const url = new URL(request.url);
    const month = url.searchParams.get('month') || getCurrentBillingMonth();

    const [usage] = await db
      .select()
      .from(tenantAiUsages)
      .where(and(eq(tenantAiUsages.tenantId, tenantId), eq(tenantAiUsages.billingMonth, month)))
      .limit(1);

    if (!usage) {
      return apiNotFound(`No usage record found for tenant ${tenantId} in ${month}`);
    }

    const events = await db
      .select()
      .from(aiUsageEvents)
      .where(eq(aiUsageEvents.usageId, usage.id))
      .orderBy(desc(aiUsageEvents.createdAt))
      .limit(100);

    const [tenant] = await db
      .select({ name: tenants.name, tier: tenants.tier })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const usagePercent =
      usage.tokensAllotted > 0 ? Math.round((usage.tokensUsed / usage.tokensAllotted) * 100) : 0;

    return apiSuccess({
      usage: {
        ...usage,
        tenantName: tenant?.name ?? null,
        tier: tenant?.tier ?? null,
        usagePercent,
      },
      events,
    });
  } catch {
    return apiInternalError('Failed to fetch tenant usage');
  }
}
