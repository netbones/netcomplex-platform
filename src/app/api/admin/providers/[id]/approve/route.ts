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
  users,
  providerVerifications,
  writeAuditLog,
} from '@api/server';
import { withTenant } from '@entities/tenant/server';
import { getProviderDueDiligenceSnapshot, getSessionAndRole } from '@shared/api';
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
        isNull(serviceProviders.deletedAt)
      )
    )
    .limit(1);

  if (!provider) {
    return apiNotFound('Provider not found');
  }

  const approvalNote = parsed.data.notes.trim() || 'Due diligence approved';
  const timestamp = now();

  // ADVISORY-015 Phase 3C: Atomically approve provider — role + verification must be consistent.
  await db.transaction(async tx => {
    await tx
      .update(serviceProviders)
      .set({ isActive: true, updatedAt: timestamp })
      .where(eq(serviceProviders.id, provider.id));

    await tx
      .update(providerVerifications)
      .set({ status: 'VERIFIED', endDate: null, notes: approvalNote, updatedAt: timestamp })
      .where(eq(providerVerifications.providerId, provider.id));

    // Only promote users still at USER stage — never downgrade an already-admitted user.
    if (provider.userId) {
      const [user] = await tx
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, provider.userId))
        .limit(1);
      if (user && user.role === 'USER') {
        await tx.update(users).set({ role: 'PROVIDER' }).where(eq(users.id, provider.userId));
      }
    }
  });

  const dueDiligence = await getProviderDueDiligenceSnapshot(tenantId, provider.id, 'VERIFIED');

  const [verification] = await db
    .select()
    .from(providerVerifications)
    .where(eq(providerVerifications.providerId, provider.id))
    .limit(1);

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
