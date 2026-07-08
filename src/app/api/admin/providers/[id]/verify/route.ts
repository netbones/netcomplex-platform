import { and, eq } from 'drizzle-orm';

import {
  apiError,
  apiInternalError,
  apiNotFound,
  apiSuccess,
  db,
  getSessionAndRole,
  notDeleted,
  providerVerifications,
  requireAnyPermission,
  serviceProviders,
  writeAuditLog,
} from '@api/server';
import { assertModuleEnabled, withTenant } from '@entities/tenant/server';
import { getProviderDueDiligenceSnapshot, activateProvider } from '@shared/api';
import { logError } from '@shared/lib';
import { providerReviewApprovalSchema } from '@shared/lib/providers/registration';

export const maxDuration = 8;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const moduleCheck = await assertModuleEnabled('providers');
    if (moduleCheck) return moduleCheck;

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
      .select({
        id: serviceProviders.id,
        companyName: serviceProviders.companyName,
        userId: serviceProviders.userId,
      })
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

    const notes = parsed.data.notes.trim() || 'Provider manually verified by admin review.';

    await db.transaction(async tx => {
      await activateProvider(tx, provider.id, provider.userId, notes);
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

    const [verification] = await db
      .select()
      .from(providerVerifications)
      .where(eq(providerVerifications.providerId, provider.id))
      .limit(1);

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
