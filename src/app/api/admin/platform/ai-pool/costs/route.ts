import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { requirePlatformAdmin } from '@entities/tenant/server';
import { db, aiCapabilityCosts, apiSuccess, apiError, apiInternalError } from '@api/server';

export const maxDuration = 8;

export async function GET(request: NextRequest) {
  const guard = await requirePlatformAdmin(request);
  if (guard) return guard;

  try {
    const costs = await db.select().from(aiCapabilityCosts);
    return apiSuccess(costs);
  } catch {
    return apiInternalError('Failed to list capability costs');
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await requirePlatformAdmin(request);
  if (guard) return guard;

  try {
    const body = await request.json();
    const { capability, estimatedTokens, maxTokens, notes } = body;

    if (!capability || typeof capability !== 'string') {
      return apiError('VALIDATION_ERROR', 'capability is required', 400);
    }

    const updateData: Record<string, unknown> = {};
    if (estimatedTokens !== undefined) updateData.estimatedTokens = estimatedTokens;
    if (maxTokens !== undefined) updateData.maxTokens = maxTokens;
    if (notes !== undefined) updateData.notes = notes;

    const [updated] = await db
      .update(aiCapabilityCosts)
      .set(updateData)
      .where(eq(aiCapabilityCosts.capability, capability))
      .returning();

    if (!updated) {
      return apiError('NOT_FOUND', `No capability cost found for: ${capability}`, 404);
    }

    return apiSuccess(updated);
  } catch {
    return apiInternalError('Failed to update capability cost');
  }
}
