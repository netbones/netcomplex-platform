import { NextRequest } from 'next/server';
import { apiError, apiInternalError, apiNotFound, apiSuccess } from '@api/server';
import { cancelProviderSubscription, requireProviderAccess } from '@shared/api';
import { providerBillingCancelSchema } from '@shared/lib/providers/billing';
import { logError } from '@shared/lib';

export const maxDuration = 8;

export async function POST(request: NextRequest) {
  try {
    const providerAccess = await requireProviderAccess(request);
    if ('status' in providerAccess) {
      return providerAccess;
    }

    if (!providerAccess.providerRecord) {
      return apiNotFound('Provider registration is not complete for this account');
    }

    const parsed = providerBillingCancelSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Validation failed', 400, parsed.error.flatten());
    }

    const result = await cancelProviderSubscription({
      tenantId: providerAccess.tenantId,
      providerId: providerAccess.providerRecord.id,
      subscriptionId: parsed.data.subscriptionId ?? null,
    });

    if (!result.ok) {
      return apiError('VALIDATION_ERROR', result.message, result.status);
    }

    return apiSuccess(result.data);
  } catch (error) {
    logError(
      { component: 'provider-billing-cancel-api', operation: 'POST' },
      'Provider billing cancellation error',
      error
    );
    return apiInternalError();
  }
}
