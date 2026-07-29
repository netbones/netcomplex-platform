import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import {
  apiError,
  apiInternalError,
  apiNotFound,
  apiSuccess,
  db,
  notDeleted,
  now,
  serviceProviders,
  writeAuditLog,
} from '@api/server';
import { withTenant } from '@entities/tenant/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { getProviderDueDiligenceSnapshot, upsertProviderVerification } from '@shared/api';
import { logError } from '@shared/lib';

export const maxDuration = 8;

const suspendProviderSchema = z.object({
  action: z.enum(['SUSPEND', 'REINSTATE']).default('SUSPEND'),
  reason: z.string().trim().min(3).max(1000).optional(),
  restoreStatus: z.enum(['PROBATION', 'VERIFIED']).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request, { permission: 'admin' });
    if (!auth.success) return auth.response;
    const parsed = suspendProviderSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Validation failed', 400, parsed.error.flatten());
    }

    const { tenantId } = await withTenant();
    const { id } = await params;
    const [provider] = await db
      .select({ id: serviceProviders.id, companyName: serviceProviders.companyName })
      .from(serviceProviders)
      .where(
        and(
          eq(serviceProviders.tenantId, tenantId),
          eq(serviceProviders.id, id),
          notDeleted(serviceProviders)
        )
      )
      .limit(1);

    if (!provider) {
      return apiNotFound('Provider not found');
    }

    const action = parsed.data.action;
    const nextStatus =
      action === 'REINSTATE' ? (parsed.data.restoreStatus ?? 'PROBATION') : 'SUSPENDED';
    const notes =
      parsed.data.reason?.trim() ||
      (action === 'REINSTATE'
        ? 'Provider reinstated after moderation review.'
        : 'Provider suspended after moderation review.');

    await db
      .update(serviceProviders)
      .set({ isActive: action === 'REINSTATE', updatedAt: now() })
      .where(eq(serviceProviders.id, provider.id));

    const verification = await upsertProviderVerification({
      tenantId,
      providerId: provider.id,
      status: nextStatus,
      notes,
      endDate: action === 'REINSTATE' ? null : now(),
    });

    writeAuditLog({
      action: action === 'REINSTATE' ? 'PROVIDER_REINSTATED' : 'PROVIDER_SUSPENDED',
      actorId: auth.data.userId,
      tenantId,
      targetId: provider.id,
      details: { action, notes, restoreStatus: parsed.data.restoreStatus ?? null },
    });

    const dueDiligence = await getProviderDueDiligenceSnapshot(tenantId, provider.id, nextStatus);

    return apiSuccess({ provider, verification, dueDiligence, action });
  } catch (error) {
    logError(
      { component: 'admin-provider-suspend-api', operation: 'PATCH' },
      'Admin provider suspend error',
      error
    );
    return apiInternalError();
  }
}
