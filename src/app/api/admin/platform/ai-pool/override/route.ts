import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { requirePlatformAdmin } from '@entities/tenant/server';
import {
  db,
  tenantAiUsages,
  apiSuccess,
  apiError,
  apiInternalError,
  writeAuditLog,
  auth,
} from '@api/server';
import { getCurrentBillingMonth } from '@api/server';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

export async function POST(request: NextRequest) {
  const guard = await requirePlatformAdmin(request);
  if (guard) return guard;

  try {
    const body = await request.json();
    const { tenantId, customTokens, reason } = body;

    if (!tenantId || typeof tenantId !== 'string') {
      return apiError('VALIDATION_ERROR', 'tenantId is required', 400);
    }
    if (!customTokens || customTokens <= 0) {
      return apiError('VALIDATION_ERROR', 'customTokens must be greater than 0', 400);
    }

    const month = getCurrentBillingMonth();
    const [existing] = await db
      .select()
      .from(tenantAiUsages)
      .where(eq(tenantAiUsages.tenantId, tenantId))
      .limit(1);

    // ponytail: For the override case, update existing record's tokensAllotted in-place.
    // getOrCreateUsage is available for creating a new record but we just patch the field directly.
    if (existing) {
      await db
        .update(tenantAiUsages)
        .set({
          tokensAllotted: customTokens,
          updatedAt: new Date(),
        })
        .where(eq(tenantAiUsages.id, existing.id))
        .returning();

      // Audit log
      const session = await auth.api.getSession({ headers: request.headers });
      writeAuditLog({
        action: 'AI_POOL_OVERRIDE',
        actorId: session?.user?.id || 'unknown',
        targetId: tenantId,
        details: {
          operation: 'AI_POOL_OVERRIDE',
          previousTokens: existing.tokensAllotted,
          newTokens: customTokens,
          reason,
        },
      });

      return apiSuccess({
        updated: true,
        tokensAllotted: customTokens,
        previous: existing.tokensAllotted,
      });
    }

    // No existing record — create one
    await db
      .insert(tenantAiUsages)
      .values({
        id: createId(),
        tenantId,
        billingMonth: month,
        tokensAllotted: customTokens,
        tokensUsed: 0,
        overageTokens: 0,
        overageCostZAR: '0',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const session = await auth.api.getSession({ headers: request.headers });
    writeAuditLog({
      action: 'AI_POOL_OVERRIDE',
      actorId: session?.user?.id || 'unknown',
      targetId: tenantId,
      details: {
        operation: 'AI_POOL_OVERRIDE',
        newTokens: customTokens,
        reason,
        createdNew: true,
      },
    });

    return apiSuccess({ updated: true, tokensAllotted: customTokens, created: true });
  } catch {
    return apiInternalError('Failed to apply override');
  }
}
