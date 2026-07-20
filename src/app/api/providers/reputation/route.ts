import { NextRequest } from 'next/server';
import { apiInternalError, apiNotFound, apiSuccess, db, providerMerits } from '@api/server';
import { requireProviderAccess } from '@shared/api';
import { logError } from '@shared/lib';
import { and, desc, eq } from 'drizzle-orm';

export const maxDuration = 8;

/**
 * @deprecated Use trpc.providers.getReputation instead.
 */
export async function GET(request: NextRequest) {
  try {
    const providerAccess = await requireProviderAccess(request);
    if ('status' in providerAccess) {
      return providerAccess;
    }

    if (!providerAccess.providerRecord) {
      return apiNotFound('Provider registration is not complete for this account');
    }

    const merits = await db
      .select()
      .from(providerMerits)
      .where(
        and(
          eq(providerMerits.tenantId, providerAccess.tenantId),
          eq(providerMerits.providerId, providerAccess.providerRecord.id)
        )
      )
      .orderBy(desc(providerMerits.createdAt));

    return apiSuccess({
      verificationStatus: providerAccess.verification.displayStatus,
      reputationScore: providerAccess.reputation.totalScore,
      progress: providerAccess.reputation,
      verification: providerAccess.verification,
      eligibleForVerification:
        providerAccess.reputation.totalScore >= providerAccess.verification.verificationThreshold,
      band:
        providerAccess.reputation.totalScore >= providerAccess.verification.verificationThreshold
          ? 'VERIFIED_CANDIDATE'
          : providerAccess.reputation.totalScore >= 100
            ? 'EMERGING'
            : 'PROBATION',
      merits: merits.slice(0, 10).map(merit => ({
        id: merit.id,
        meritType: merit.meritType,
        points: merit.points,
        description: merit.description,
        referenceId: merit.referenceId,
        createdAt: merit.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    logError(
      { component: 'provider-reputation-api', operation: 'GET' },
      'Provider reputation fetch error',
      error
    );
    return apiInternalError();
  }
}
