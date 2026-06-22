import { and, eq, isNull } from 'drizzle-orm';

import {
  apiError,
  apiForbidden,
  apiNotFound,
  apiSuccess,
  apiUnauthorized,
  db,
  now,
  serviceProviders,
  writeAuditLog,
} from '@api/server';
import { withTenant } from '@entities/tenant/server';
import {
  getProviderDueDiligenceSnapshot,
  getSessionAndRole,
  upsertProviderVerification,
} from '@shared/api';
import { providerReviewApprovalSchema } from '@shared/lib/providers/registration';

export const maxDuration = 8;

function canReviewProviders(role: string): boolean {
  return role === 'ADMIN' || role === 'BOARD';
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getSessionAndRole(request);
  if (!auth) {
    return apiUnauthorized();
  }

  if (!canReviewProviders(auth.role)) {
    return apiForbidden('Board or admin access required');
  }

  const body = await request.json();
  const parsed = providerReviewApprovalSchema.safeParse(body);
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

  const approvalNote = parsed.data.notes.trim() || 'Due diligence approved';

  await db
    .update(serviceProviders)
    .set({ isActive: true, updatedAt: now() })
    .where(eq(serviceProviders.id, provider.id));

  const verification = await upsertProviderVerification({
    tenantId,
    providerId: provider.id,
    status: 'VERIFIED',
    notes: approvalNote,
    endDate: null,
  });

  const dueDiligence = await getProviderDueDiligenceSnapshot(tenantId, provider.id, 'VERIFIED');

  writeAuditLog({
    action: 'PROVIDER_APPROVED',
    actorId: auth.userId,
    tenantId,
    targetId: provider.id,
    details: { method: 'approve', notes: approvalNote },
  });

  return apiSuccess({
    provider,
    verification,
    dueDiligence,
  });
}
