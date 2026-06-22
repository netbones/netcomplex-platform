import { NextRequest } from 'next/server';
import { apiInternalError, apiNotFound, apiSuccess } from '@api/server';
import { getProviderBillingSnapshot, requireProviderAccess } from '@shared/api';
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

    return apiSuccess({ charges: billing.charges, paymentHistory: billing.paymentHistory });
  } catch (error) {
    logError(
      { component: 'provider-billing-charges-api', operation: 'GET' },
      'Provider billing charges fetch error',
      error
    );
    return apiInternalError();
  }
}
