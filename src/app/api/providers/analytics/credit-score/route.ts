import { NextRequest } from 'next/server';
import { apiInternalError, apiSuccess } from '@api/server';
import { requireProviderAccess } from '@shared/api';
import { logError } from '@shared/lib';

export const maxDuration = 8;

export async function GET(request: NextRequest) {
  try {
    const providerAccess = await requireProviderAccess(request);
    if ('status' in providerAccess) {
      return providerAccess;
    }

    return apiSuccess({
      verificationStatus: providerAccess.verification.displayStatus,
      creditScore: providerAccess.credits.totalCredits,
      progress: providerAccess.credits,
      verification: providerAccess.verification,
    });
  } catch (error) {
    logError(
      { component: 'provider-credit-score-api', operation: 'GET' },
      'Provider credit score fetch error',
      error
    );
    return apiInternalError();
  }
}
