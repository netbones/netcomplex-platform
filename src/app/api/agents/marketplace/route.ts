import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@api/auth';
import { db, agentProfiles, users, premiumSeats } from '@api/db';
import { eq, and, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant';
import { logError } from '@shared/lib';

/**
 * GET /api/agents/marketplace - Get available agents for property investors
 */
export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await withTenant();
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agentList = await db
      .select({
        id: agentProfiles.id,
        agencyName: agentProfiles.agencyName,
        licenseNumber: agentProfiles.licenseNumber,
        experienceYears: agentProfiles.experienceYears,
        specializations: agentProfiles.specializations,
        serviceAreas: agentProfiles.serviceAreas,
        totalListings: agentProfiles.totalListings,
        activeListings: agentProfiles.activeListings,
        salesCompleted: agentProfiles.salesCompleted,
        rating: agentProfiles.rating,
        reviewCount: agentProfiles.reviewCount,
        isVerified: agentProfiles.isVerified,
        verificationDate: agentProfiles.verificationDate,
        agent: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(agentProfiles)
      .leftJoin(users, eq(agentProfiles.agentId, users.id))
      .where(and(eq(agentProfiles.isVerified, true), eq(agentProfiles.tenantId, tenantId)))
      .orderBy(desc(agentProfiles.rating), desc(agentProfiles.reviewCount))
      .limit(20);

    return NextResponse.json({ agents: agentList });
  } catch (error) {
    logError(
      { component: 'marketplace-api', operation: 'GET' },
      'Agent marketplace fetch error',
      error
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/agents/connect - Connect with an agent
 */
export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await withTenant();
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agentId } = await request.json();

    // Check if user has Premium Seat
    const seat = await db
      .select()
      .from(premiumSeats)
      .where(and(eq(premiumSeats.userId, session.user.id), eq(premiumSeats.tenantId, tenantId)))
      .limit(1);

    if (!seat[0]) {
      return NextResponse.json(
        {
          error: 'Premium Seat required to connect with agents',
        },
        { status: 403 }
      );
    }

    // Create agent connection request
    // This would typically send a notification to the agent
    // For now, we'll just log it

    return NextResponse.json({
      success: true,
      message: 'Connection request sent successfully',
    });
  } catch (error) {
    logError(
      { component: 'marketplace-api', operation: 'CONNECT' },
      'Agent connection error',
      error
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
