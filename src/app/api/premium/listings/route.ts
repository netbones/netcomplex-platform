import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/premium/listings - Get property listings for premium user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has Premium Seat
    const premiumSeat = await prisma.premiumSeat.findUnique({
      where: { userId: session.user.id },
      include: {
        linkedHouseholds: {
          select: { id: true },
        },
      },
    });

    if (!premiumSeat) {
      return NextResponse.json(
        { error: 'Premium Seat required to access listings' },
        { status: 403 }
      );
    }

    const householdIds = premiumSeat.linkedHouseholds.map(h => h.id);

    // Get all listings for user's properties
    const listings = await prisma.propertyListing.findMany({
      where: {
        ownerId: session.user.id,
        householdId: { in: householdIds },
      },
      include: {
        household: {
          select: {
            street: true,
            unit: true,
            homeImage: true,
          },
        },
        assignedAgent: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ listings });
  } catch (error) {
    console.error('Listings fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/premium/listings - Create a new property listing
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has Premium Seat
    const premiumSeat = await prisma.premiumSeat.findUnique({
      where: { userId: session.user.id },
      include: {
        linkedHouseholds: {
          select: { id: true },
        },
      },
    });

    if (!premiumSeat) {
      return NextResponse.json(
        { error: 'Premium Seat required to create listings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      householdId,
      listingType,
      title,
      description,
      price,
      bedrooms,
      bathrooms,
      parkingSpaces,
      gardenSize,
      petFriendly,
    } = body;

    // Validate household ownership
    const householdIds = premiumSeat.linkedHouseholds.map(h => h.id);
    if (!householdIds.includes(householdId)) {
      return NextResponse.json({ error: 'You do not own this property' }, { status: 403 });
    }

    // Create listing
    const listing = await prisma.propertyListing.create({
      data: {
        householdId,
        ownerId: session.user.id,
        listingType: listingType || 'SALE',
        title,
        description,
        price: price ? parseFloat(price) : null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        parkingSpaces: parkingSpaces ? parseInt(parkingSpaces) : null,
        gardenSize: gardenSize ? parseFloat(gardenSize) : null,
        petFriendly: petFriendly || false,
        status: 'DRAFT',
        isPublished: false,
      },
    });

    return NextResponse.json({
      success: true,
      listing,
    });
  } catch (error) {
    console.error('Listing creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
