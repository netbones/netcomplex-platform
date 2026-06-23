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
      reputationScore: providerAccess.reputation.totalScore,
      progress: providerAccess.reputation,
      verification: providerAccess.verification,
    });
  } catch (error) {
    logError(
      { component: 'provider-reputation-score-api', operation: 'GET' },
      'Provider reputation score fetch error',
      error
    );
    return apiInternalError();
  }
}
