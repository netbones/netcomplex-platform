import { and, eq } from 'drizzle-orm';

import {
  apiError,
  apiForbidden,
  apiNotFound,
  apiSuccess,
  apiUnauthorized,
  db,
  notDeleted,
  now,
  sendEmail,
  serviceProviders,
  writeAuditLog,
  guardSuspension,
} from '@api/server';
import { assertModuleEnabled, withTenant } from '@entities/tenant/server';
import {
  getProviderDueDiligenceSnapshot,
  getSessionAndRole,
  upsertProviderVerification,
} from '@shared/api';
import { providerReviewRejectionSchema } from '@shared/lib/providers/registration';

export const maxDuration = 8;

function canReviewProviders(role: string): boolean {
  return role === 'ADMIN' || role === 'BOARD';
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getSessionAndRole(request);
  if (!auth) {
    return apiUnauthorized();
  }
  const guard = guardSuspension(auth);
  if (guard) return guard;

  const moduleCheck = await assertModuleEnabled('providers');
  if (moduleCheck) return moduleCheck;

  if (!canReviewProviders(auth.role)) {
    return apiForbidden('Board or admin access required');
  }

  const body = await request.json();
  const parsed = providerReviewRejectionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Validation failed', 400, parsed.error.flatten());
  }

  const { tenantId } = await withTenant();
  const { id } = await params;
  const [provider] = await db
    .select({
      id: serviceProviders.id,
      companyName: serviceProviders.companyName,
      email: serviceProviders.email,
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

  await db
    .update(serviceProviders)
    .set({ isActive: false, updatedAt: now() })
    .where(eq(serviceProviders.id, provider.id));

  const verification = await upsertProviderVerification({
    tenantId,
    providerId: provider.id,
    status: 'SUSPENDED',
    notes: parsed.data.reason,
  });

  const dueDiligence = await getProviderDueDiligenceSnapshot(tenantId, provider.id, 'SUSPENDED');

  writeAuditLog({
    action: 'PROVIDER_REJECTED',
    actorId: auth.userId,
    tenantId,
    targetId: provider.id,
    details: { reason: parsed.data.reason, mappedStatus: 'SUSPENDED' },
  });

  if (provider.email) {
    void sendEmail({
      to: provider.email,
      subject: 'Provider Application Update',
      html: `<p>Your provider application for <strong>${provider.companyName}</strong> was not approved at this time.</p><p>Reason: ${parsed.data.reason}</p><p>You may contact the platform administrator for further information.</p>`,
    });
  }

  return apiSuccess({
    provider,
    verification,
    dueDiligence,
    reason: parsed.data.reason,
  });
}
