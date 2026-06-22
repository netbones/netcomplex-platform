import { NextRequest } from 'next/server';
import {
  apiError,
  apiInternalError,
  apiNotFound,
  apiSuccess,
  requireAnyPermission,
} from '@api/server';
import {
  getProviderBillingSnapshot,
  requireProviderAccess,
  updateProviderSubscriptionStatus,
} from '@shared/api';
import { providerBillingPatchSchema } from '@shared/lib/providers/billing';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';

export const maxDuration = 8;

export async function GET(request: NextRequest) {
  try {
    const providerAccess = await requireProviderAccess(request);
    if ('status' in providerAccess) {
      return providerAccess;
    }

    if (!providerAccess.providerRecord) {
      return apiNotFound('Provider registration is not complete for this account');
    }

    const billing = await getProviderBillingSnapshot({
      tenantId: providerAccess.tenantId,
      providerId: providerAccess.providerRecord.id,
      verificationStatus: providerAccess.verification.displayStatus,
    });

    return apiSuccess({
      providerId: providerAccess.providerRecord.id,
      companyName: providerAccess.providerRecord.companyName,
      verificationStatus: providerAccess.verification.displayStatus,
      verification: providerAccess.verification,
      creditProgress: providerAccess.credits,
      ...billing,
    });
  } catch (error) {
    logError(
      { component: 'provider-billing-api', operation: 'GET' },
      'Provider billing fetch error',
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

    const parsed = providerBillingPatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Validation failed', 400, parsed.error.flatten());
    }

    const { tenantId } = await withTenant();
    const result = await updateProviderSubscriptionStatus({
      tenantId,
      providerId: parsed.data.providerId,
      subscriptionId: parsed.data.subscriptionId,
      status: parsed.data.status,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      nextBillingDate: parsed.data.nextBillingDate
        ? new Date(parsed.data.nextBillingDate)
        : null,
    });

    if (!result.ok) {
      return apiError('VALIDATION_ERROR', result.message, result.status);
    }

    return apiSuccess({ subscription: result.data });
  } catch (error) {
    logError(
      { component: 'provider-billing-api', operation: 'PATCH' },
      'Provider billing update error',
      error
    );
    return apiInternalError();
  }
}
