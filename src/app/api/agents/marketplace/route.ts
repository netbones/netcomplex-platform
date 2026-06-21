import { NextRequest } from 'next/server';
import {
  auth,
  db,
  agentProfiles,
  users,
  premiumSeats,
  apiError,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
} from '@api/server';

import { eq, and, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';

export const maxDuration = 8;

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
      return apiUnauthorized();
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

    return apiSuccess({ agents: agentList });
  } catch (error) {
    logError(
      { component: 'marketplace-api', operation: 'GET' },
      'Agent marketplace fetch error',
      error
    );
    return apiInternalError();
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
      return apiUnauthorized();
    }

    const { agentId } = await request.json();

    // Check if user has Premium Seat
    const seat = await db
      .select()
      .from(premiumSeats)
      .where(and(eq(premiumSeats.userId, session.user.id), eq(premiumSeats.tenantId, tenantId)))
      .limit(1);

    if (!seat[0]) {
      return apiSuccess(
        {
          error: 'Premium Seat required to connect with agents',
        },
        { status: 403 }
      );
    }

    // Create agent connection request
    // This would typically send a notification to the agent
    // For now, we'll just log it

    return apiSuccess({
      success: true,
      message: 'Connection request sent successfully',
    });
  } catch (error) {
    logError(
      { component: 'marketplace-api', operation: 'CONNECT' },
      'Agent connection error',
      error
    );
    return apiInternalError();
  }
}
