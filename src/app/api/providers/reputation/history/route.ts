import { NextRequest } from 'next/server';
import { apiInternalError, apiNotFound, apiSuccess, db, providerMerits } from '@api/server';
import { requireProviderAccess } from '@shared/api';
import { logError } from '@shared/lib';
import { and, desc, eq, gte, lte } from 'drizzle-orm';

export const maxDuration = 8;

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * @deprecated Use trpc.providers.getReputationHistory instead.
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

    const searchParams = new URL(request.url).searchParams;
    const requestedLimit = Number(searchParams.get('limit') ?? 30);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 30;
    const from = parseDateParam(searchParams.get('from'));
    const to = parseDateParam(searchParams.get('to'));

    const conditions = [
      eq(providerMerits.tenantId, providerAccess.tenantId),
      eq(providerMerits.providerId, providerAccess.providerRecord.id),
    ];

    if (from) {
      conditions.push(gte(providerMerits.createdAt, from));
    }

    if (to) {
      conditions.push(lte(providerMerits.createdAt, to));
    }

    const merits = await db
      .select()
      .from(providerMerits)
      .where(and(...conditions))
      .orderBy(desc(providerMerits.createdAt))
      .limit(limit);

    return apiSuccess({
      merits: merits.map(merit => ({
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
      { component: 'provider-reputation-history-api', operation: 'GET' },
      'Provider reputation history fetch error',
      error
    );
    return apiInternalError();
  }
}
