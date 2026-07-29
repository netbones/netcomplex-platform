import { and, eq } from 'drizzle-orm';

import {
  apiError,
  apiForbidden,
  apiNotFound,
  apiSuccess,
  db,
  notDeleted,
  providerVerifications,
  sendEmail,
  serviceProviders,
  writeAuditLog,
} from '@api/server';
import { withTenant } from '@entities/tenant/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { getProviderDueDiligenceSnapshot, activateProvider } from '@shared/api';
import { providerReviewApprovalSchema } from '@shared/lib/providers';

export const maxDuration = 8;

function canReviewProviders(role: string): boolean {
  return role === 'ADMIN' || role === 'BOARD';
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, { permission: 'admin' });
  if (!auth.success) return auth.response;

  if (!canReviewProviders(auth.data.role)) {
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
      email: serviceProviders.email,
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

  const approvalNote = parsed.data.notes.trim() || 'Due diligence approved';

  await db.transaction(async tx => {
    await activateProvider(tx, provider.id, provider.userId, approvalNote);
  });

  const dueDiligence = await getProviderDueDiligenceSnapshot(tenantId, provider.id, 'VERIFIED');

  const [verification] = await db
    .select()
    .from(providerVerifications)
    .where(eq(providerVerifications.providerId, provider.id))
    .limit(1);

  writeAuditLog({
    action: 'PROVIDER_APPROVED',
    actorId: auth.data.userId,
    tenantId,
    targetId: provider.id,
    details: { method: 'approve', notes: approvalNote },
  });

  if (provider.email) {
    void sendEmail({
      to: provider.email,
      subject: 'Provider Account Approved',
      html: `<p>Your provider account <strong>${provider.companyName}</strong> has been approved.</p><p>You can now access your provider dashboard and manage your services.</p>`,
    });
  }

  return apiSuccess({
    provider,
    verification,
    dueDiligence,
  });
}
