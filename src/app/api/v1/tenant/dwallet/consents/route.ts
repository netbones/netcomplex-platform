import {
  db,
  dataConsents,
  dataRevenueStreams,
  apiSuccess,
  apiUnauthorized,
  withErrorHandler,
  getSessionAndRole,
  guardSuspension,
} from '@api/server';

import { eq, and, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { getOrCreateWallet } from '@entities/dwallet/server';
import type { ConsentState } from '@entities/dwallet';

export const maxDuration = 8;

export const GET = withErrorHandler(async (request: Request) => {
  const sessionData = await getSessionAndRole(request);
  if (!sessionData) return apiUnauthorized();
  const guard = guardSuspension(sessionData);
  if (guard) return guard;

  const { tenantId } = await withTenant();

  const wallet = await getOrCreateWallet(sessionData.userId, tenantId);

  // Fetch all active streams
  const streams = await db
    .select()
    .from(dataRevenueStreams)
    .where(and(eq(dataRevenueStreams.tenantId, tenantId), eq(dataRevenueStreams.isActive, true)));

  // Fetch current consent state per stream
  const consents: ConsentState[] = await Promise.all(
    streams.map(async stream => {
      const [latestConsent] = await db
        .select()
        .from(dataConsents)
        .where(and(eq(dataConsents.walletId, wallet.id), eq(dataConsents.streamKey, stream.key)))
        .orderBy(desc(dataConsents.createdAt))
        .limit(1);

      return {
        streamKey: stream.key,
        label: stream.label,
        description: stream.description,
        granted: latestConsent?.granted ?? false,
        grantedAt: latestConsent?.grantedAt?.toISOString() ?? null,
        revokedAt: latestConsent?.revokedAt?.toISOString() ?? null,
      };
    })
  );

  return apiSuccess(consents);
});
