import { and, desc, eq, isNull, or } from 'drizzle-orm';

import {
  apiForbidden,
  apiSuccess,
  db,
  notDeleted,
  providerVerifications,
  serviceProviders,
} from '@api/server';
import { withTenant } from '@entities/tenant/server';
import { requireAuth } from '@/shared/api/auth-utils';
import {
  getProviderDueDiligenceSnapshot,
  getProviderLegalAgreementStatus,
  type ProviderVerificationStatus,
} from '@shared/api';

export const maxDuration = 8;

function canReviewProviders(role: string): boolean {
  return role === 'ADMIN' || role === 'BOARD';
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  if (!canReviewProviders(auth.data.role)) {
    return apiForbidden('Board or admin access required');
  }

  const { tenantId } = await withTenant();

  const pendingProviders = await db
    .select({
      id: serviceProviders.id,
      companyName: serviceProviders.companyName,
      contactName: serviceProviders.contactName,
      email: serviceProviders.email,
      phone: serviceProviders.phone,
      trade: serviceProviders.trade,
      isActive: serviceProviders.isActive,
      createdAt: serviceProviders.createdAt,
      verificationStatus: providerVerifications.status,
      verificationNotes: providerVerifications.notes,
    })
    .from(serviceProviders)
    .leftJoin(
      providerVerifications,
      and(
        eq(providerVerifications.tenantId, serviceProviders.tenantId),
        eq(providerVerifications.providerId, serviceProviders.id)
      )
    )
    .where(
      and(
        eq(serviceProviders.tenantId, tenantId),
        notDeleted(serviceProviders),
        or(
          eq(providerVerifications.status, 'PENDING'),
          eq(providerVerifications.status, 'PROBATION'),
          isNull(providerVerifications.id)
        )
      )
    )
    .orderBy(desc(serviceProviders.createdAt));

  const rows = await Promise.all(
    pendingProviders.map(async provider => {
      const legalStatus = await getProviderLegalAgreementStatus(tenantId, provider.id);
      const dueDiligence = await getProviderDueDiligenceSnapshot(
        tenantId,
        provider.id,
        (provider.verificationStatus ?? 'PROBATION') as ProviderVerificationStatus
      );

      return {
        ...provider,
        dueDiligence,
        legalStatus,
      };
    })
  );

  return apiSuccess({ providers: rows });
}
