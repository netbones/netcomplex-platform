import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/premium/upgrade-portfolio - Upgrade to Premium Seat with multi-property portfolio
 * Body: { householdIds: string[] } - Array of household IDs to include in portfolio
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { householdIds } = await request.json();

    if (!Array.isArray(householdIds) || householdIds.length < 2) {
      return NextResponse.json(
        {
          error: 'At least 2 household IDs required for portfolio upgrade',
        },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Verify user owns all specified households
    const households = await prisma.household.findMany({
      where: {
        id: { in: householdIds },
        standardSeats: {
          some: {
            userId,
            isPrimaryOwner: true,
          },
        },
      },
      include: {
        standardSeats: {
          where: { userId, isPrimaryOwner: true },
        },
      },
    });

    if (households.length !== householdIds.length) {
      return NextResponse.json(
        {
          error: 'You do not own all specified households',
        },
        { status: 403 }
      );
    }

    // Check if user already has a Premium Seat
    const existingPremiumSeat = await prisma.premiumSeat.findUnique({
      where: { userId },
    });

    if (existingPremiumSeat) {
      // Update existing Premium Seat to include new households
      await prisma.premiumSeat.update({
        where: { userId },
        data: {
          linkedHouseholds: {
            connect: householdIds.map(id => ({ id })),
          },
        },
      });
    } else {
      // Create new Premium Seat with portfolio
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Generate platform address from user's name
      const platformAddress = `${user.name.toLowerCase().replace(/\s+/g, '.')}@soralia.org`;

      await prisma.premiumSeat.create({
        data: {
          userId,
          platformAddress,
          linkedHouseholds: {
            connect: householdIds.map(id => ({ id })),
          },
        },
      });
    }

    // Get updated portfolio data
    const portfolio = await prisma.premiumSeat.findUnique({
      where: { userId },
      include: {
        linkedHouseholds: {
          include: {
            standardSeats: {
              where: { userId, isPrimaryOwner: true },
              include: {
                user: { select: { name: true } },
              },
            },
            profiles: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully upgraded to Premium Seat with property portfolio',
      portfolio,
    });
  } catch (error) {
    console.error('Premium upgrade error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/premium/portfolio - Get user's premium portfolio
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const portfolio = await prisma.premiumSeat.findUnique({
      where: { userId: session.user.id },
      include: {
        linkedHouseholds: {
          include: {
            standardSeats: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
            profiles: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!portfolio) {
      return NextResponse.json({
        hasPortfolio: false,
        message: 'No Premium Seat portfolio found',
      });
    }

    return NextResponse.json({
      hasPortfolio: true,
      portfolio,
    });
  } catch (error) {
    console.error('Portfolio fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
