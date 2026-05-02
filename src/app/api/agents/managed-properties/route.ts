import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@api/auth';
import { db, agentAccesses, users, properties } from '@api/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { withTenant } from '@api/tenant/server';

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

    const results = await db
      .select({
        agentAccess: agentAccesses,
        property: properties,
        grantedBy: users,
      })
      .from(agentAccesses)
      .leftJoin(properties, eq(agentAccesses.propertyId, properties.id))
      .leftJoin(users, eq(agentAccesses.grantedById, users.id))
      .where(and(eq(agentAccesses.agentId, session.user.id), eq(agentAccesses.tenantId, tenantId)))
      .orderBy(desc(agentAccesses.createdAt));

    const managedProperties = results.map(row => ({
      id: row.property?.id ?? '',
      street: row.property?.street ?? '',
      unit: row.property?.unit ?? '',
      platformAddress: row.property?.platformAddress ?? '',
      homeImage: row.property?.homeImage ?? null,
      accessExpiresAt: row.agentAccess.expiresAt.toISOString(),
      accessLevel: row.agentAccess.accessLevel,
      grantedBy: {
        id: row.grantedBy?.id ?? '',
        name: row.grantedBy?.name ?? 'Unknown',
      },
      grantedAt: row.agentAccess.createdAt.toISOString(),
    }));

    return NextResponse.json({ properties: managedProperties });
  } catch (error) {
    console.error('Failed to fetch managed properties:', error);
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
  }
}
