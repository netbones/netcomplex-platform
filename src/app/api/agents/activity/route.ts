import { NextRequest } from 'next/server';
import {
  auth,
  db,
  agentAccesses,
  apiError,
  apiSuccess,
  apiUnauthorized,
  apiInternalError,
} from '@api/server';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { apiLogger } from '@shared/lib';

export const maxDuration = 8;

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await withTenant();
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const userAgentAccess = await db
      .select({
        agentId: agentAccesses.agentId,
      })
      .from(agentAccesses)
      .where(
        and(eq(agentAccesses.grantedById, session.user.id), eq(agentAccesses.tenantId, tenantId))
      )
      .limit(1);

    if (userAgentAccess.length === 0) {
      return apiSuccess({ activities: [] });
    }

    const activities = [
      {
        id: '1',
        type: 'communication',
        description: 'Sent monthly status report',
        propertyId: 'prop-1',
        propertyUnit: '101',
        performedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        agentName: 'John Agent',
      },
      {
        id: '2',
        type: 'maintenance',
        description: 'Scheduled HVAC inspection',
        propertyId: 'prop-1',
        propertyUnit: '101',
        performedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        agentName: 'John Agent',
      },
    ];

    return apiSuccess({ activities });
  } catch (error) {
    apiLogger.error({ error }, 'Failed to fetch agent activity');
    return apiInternalError('Failed to fetch activity');
  }
}
