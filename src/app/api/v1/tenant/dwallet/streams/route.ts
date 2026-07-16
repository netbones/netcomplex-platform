import {
  db,
  dataRevenueStreams,
  apiSuccess,
  apiUnauthorized,
  withErrorHandler,
  getSessionAndRole,
  guardSuspension,
} from '@api/server';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import type { StreamConfig } from '@entities/dwallet';

export const maxDuration = 8;

export const GET = withErrorHandler(async (request: Request) => {
  const sessionData = await getSessionAndRole(request);
  if (!sessionData) return apiUnauthorized();
  const guard = guardSuspension(sessionData);
  if (guard) return guard;

  const { tenantId } = await withTenant();

  // Query all active streams for this tenant
  const streams = await db
    .select()
    .from(dataRevenueStreams)
    .where(and(eq(dataRevenueStreams.tenantId, tenantId), eq(dataRevenueStreams.isActive, true)));

  const configs: StreamConfig[] = streams.map(stream => ({
    id: stream.id,
    key: stream.key,
    label: stream.label,
    description: stream.description,
    residentSharePct: stream.residentSharePct,
    isActive: stream.isActive,
  }));

  return apiSuccess(configs);
});
