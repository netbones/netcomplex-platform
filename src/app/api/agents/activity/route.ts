import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@api/auth';
import { db, agentAccesses } from '@api/db';
import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant';

export const maxDuration = 8;

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await withTenant();
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json({ activities: [] });
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

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Failed to fetch agent activity:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
