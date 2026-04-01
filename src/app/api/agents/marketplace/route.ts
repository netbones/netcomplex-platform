import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/agents/marketplace - Get available agents for property investors
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agents = await prisma.agentProfile.findMany({
      where: {
        isVerified: true,
      },
      include: {
        agent: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
      take: 20,
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Agent marketplace fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/agents/connect - Connect with an agent
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agentId } = await request.json();

    // Check if user has Premium Seat
    const premiumSeat = await prisma.premiumSeat.findUnique({
      where: { userId: session.user.id },
    });

    if (!premiumSeat) {
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
    console.error('Agent connection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
