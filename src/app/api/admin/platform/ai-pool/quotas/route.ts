import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { requirePlatformAdmin } from '@entities/tenant/server';
import { db, platformAiTierQuotas, apiSuccess, apiError, apiInternalError } from '@api/server';

export const maxDuration = 8;

export async function GET(request: NextRequest) {
  const guard = await requirePlatformAdmin(request);
  if (guard) return guard;

  try {
    const quotas = await db.select().from(platformAiTierQuotas);
    return apiSuccess(quotas);
  } catch {
    return apiInternalError('Failed to list quotas');
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await requirePlatformAdmin(request);
  if (guard) return guard;

  try {
    const body = await request.json();
    const { tier, monthlyTokens, overagePolicy } = body;

    const validTiers = ['STANDARD', 'PREMIUM', 'ENTERPRISE'];
    if (!tier || !validTiers.includes(tier)) {
      return apiError('VALIDATION_ERROR', 'Invalid tier', 400);
    }

    if (monthlyTokens !== undefined) {
      if (monthlyTokens <= 0 || monthlyTokens > 10_000_000) {
        return apiError('VALIDATION_ERROR', 'monthlyTokens must be between 1 and 10,000,000', 400);
      }
    }

    const updateData: Record<string, unknown> = {};
    if (monthlyTokens !== undefined) updateData.monthlyTokens = monthlyTokens;
    if (overagePolicy !== undefined) updateData.overagePolicy = overagePolicy;

    const [updated] = await db
      .update(platformAiTierQuotas)
      .set(updateData)
      .where(eq(platformAiTierQuotas.tier, tier))
      .returning();

    if (!updated) {
      return apiError('NOT_FOUND', `No quota found for tier: ${tier}`, 404);
    }

    return apiSuccess(updated);
  } catch {
    return apiInternalError('Failed to update quota');
  }
}
