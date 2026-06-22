import { and, eq, isNull } from 'drizzle-orm';

import {
  apiError,
  apiInternalError,
  apiNotFound,
  apiSuccess,
  db,
  now,
  requireAnyPermission,
  serviceProviders,
  writeAuditLog,
  getSessionAndRole,
} from '@api/server';
import { withTenant } from '@entities/tenant/server';
import { getProviderDueDiligenceSnapshot, upsertProviderVerification } from '@shared/api';
import { logError } from '@shared/lib';
import { providerReviewApprovalSchema } from '@shared/lib/providers/registration';

export const maxDuration = 8;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireAnyPermission(['providers']);
    if (authError) {
      return authError;
    }

    const auth = await getSessionAndRole(request);
    const parsed = providerReviewApprovalSchema.safeParse(await request.json());
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
          isNull(serviceProviders.deletedAt)
        )
      )
      .limit(1);

    if (!provider) {
      return apiNotFound('Provider not found');
    }

    const notes = parsed.data.notes.trim() || 'Provider manually verified by admin review.';

    await db
      .update(serviceProviders)
      .set({ isActive: true, updatedAt: now() })
      .where(eq(serviceProviders.id, provider.id));

    const verification = await upsertProviderVerification({
      tenantId,
      providerId: provider.id,
      status: 'VERIFIED',
      notes,
      endDate: null,
    });

    if (auth) {
      writeAuditLog({
        action: 'PROVIDER_APPROVED',
        actorId: auth.userId,
        tenantId,
        targetId: provider.id,
        details: { method: 'verify', notes },
      });
    }

    const dueDiligence = await getProviderDueDiligenceSnapshot(tenantId, provider.id, 'VERIFIED');

    return apiSuccess({ provider, verification, dueDiligence });
  } catch (error) {
    logError(
      { component: 'admin-provider-verify-api', operation: 'POST' },
      'Admin provider verify error',
      error
    );
    return apiInternalError();
  }
}
