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
} from '@api/server';
import { withTenant } from '@entities/tenant/server';
import { getProviderDueDiligenceSnapshot, getSessionAndRole, upsertProviderVerification } from '@shared/api';
import { providerReviewRejectionSchema } from '@shared/lib/providers/registration';

export const maxDuration = 8;

function canReviewProviders(role: string): boolean {
  return role === 'ADMIN' || role === 'BOARD';
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getSessionAndRole(request);
  if (!auth) {
    return apiUnauthorized();
  }

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

  return apiSuccess({
    provider,
    verification,
    dueDiligence,
    reason: parsed.data.reason,
  });
}
