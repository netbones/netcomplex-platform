import { NextRequest } from 'next/server';
import {
  apiError,
  apiInternalError,
  apiNotFound,
  apiSuccess,
  requireAnyPermission,
  serviceProviders,
  db,
} from '@api/server';
import {
  requireProviderAccess,
  upsertProviderVerification,
  type ProviderVerificationStatus,
} from '@shared/api';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';
import { and, eq, isNull } from 'drizzle-orm';

export const maxDuration = 8;

const VALID_STATUSES = ['PENDING', 'PROBATION', 'VERIFIED', 'SUSPENDED'] as const;

function normalizeStatus(value: string | null | undefined): ProviderVerificationStatus | null {
  if (!value) return null;
  if (value === 'UNVERIFIED') return 'PENDING';
  return VALID_STATUSES.includes(value as ProviderVerificationStatus)
    ? (value as ProviderVerificationStatus)
    : null;
}

export async function GET(request: NextRequest) {
  try {
    const providerAccess = await requireProviderAccess(request);
    if ('status' in providerAccess) {
      return providerAccess;
    }

    return apiSuccess({
      providerRecordExists: Boolean(providerAccess.providerRecord),
      verificationStatus: providerAccess.verification.displayStatus,
      verification: providerAccess.verification,
      creditProgress: providerAccess.credits,
      accessMode: providerAccess.accessMode,
    });
  } catch (error) {
    logError(
      { component: 'provider-verification-api', operation: 'GET' },
      'Provider verification fetch error',
      error
    );
    return apiInternalError();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authError = await requireAnyPermission(['providers']);
    if (authError) {
      return authError;
    }

    const { tenantId } = await withTenant();
    const body = (await request.json()) as {
      providerId?: string;
      status?: string;
      notes?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      verificationThreshold?: number;
      probationThreshold?: number;
    };

    if (!body.providerId) {
      return apiError('VALIDATION_ERROR', 'providerId is required', 400);
    }

    const status = normalizeStatus(body.status);
    if (!status) {
      return apiError(
        'VALIDATION_ERROR',
        'status must be PENDING, PROBATION, VERIFIED, or SUSPENDED',
        400
      );
    }

    const [providerRecord] = await db
      .select({ id: serviceProviders.id, companyName: serviceProviders.companyName })
      .from(serviceProviders)
      .where(
        and(
          eq(serviceProviders.tenantId, tenantId),
          eq(serviceProviders.id, body.providerId),
          isNull(serviceProviders.deletedAt)
        )
      )
      .limit(1);

    if (!providerRecord) {
      return apiNotFound('Provider not found');
    }

    const verification = await upsertProviderVerification({
      tenantId,
      providerId: body.providerId,
      status,
      notes: body.notes ?? null,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : null,
      verificationThreshold: body.verificationThreshold,
      probationThreshold: body.probationThreshold,
    });

    return apiSuccess({
      provider: providerRecord,
      verification,
    });
  } catch (error) {
    logError(
      { component: 'provider-verification-api', operation: 'PATCH' },
      'Provider verification update error',
      error
    );
    return apiInternalError();
  }
}
