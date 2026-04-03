import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  db,
  premiumSeats,
  households,
  propertyListings,
  users,
  householdsTopremiumSeats,
} from '@/lib/db';
import { eq, sql, and } from 'drizzle-orm';

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

    // Get linked households for this premium seat via junction table
    const linkedHouseholds = await db
      .select({ id: households.id })
      .from(households)
      .innerJoin(householdsTopremiumSeats, eq(households.id, householdsTopremiumSeats.B))
      .innerJoin(premiumSeats, eq(premiumSeats.id, householdsTopremiumSeats.A))
      .where(eq(premiumSeats.userId, session.user.id));

    if (!linkedHouseholds.length) {
      return NextResponse.json(
        { error: 'Premium Seat required to access listings' },
        { status: 403 }
      );
    }

    const householdIds = linkedHouseholds.map(h => h.id);

    // Get all listings for user's properties using raw SQL
    const listings = await db.execute(sql`
      SELECT pl.*, h.street, h.unit, h.homeImage
      FROM "propertyListing" pl
      JOIN "household" h ON pl."householdId" = h.id
      WHERE pl."ownerId" = ${session.user.id}
      AND pl."householdId" IN ${sql`${householdIds}`}
      ORDER BY pl."createdAt" DESC
    `);

    return NextResponse.json({ listings: listings as any });
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
    const premiumSeatExists = await db
      .select({ id: premiumSeats.id })
      .from(premiumSeats)
      .where(eq(premiumSeats.userId, session.user.id))
      .limit(1);

    if (!premiumSeatExists.length) {
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

    if (!householdId) {
      return NextResponse.json({ error: 'Household ID required' }, { status: 400 });
    }

    // Create listing via raw SQL
    const result = (await db.execute(sql`
      INSERT INTO "propertyListing" (
        "householdId", "ownerId", "listingType", "title", "description",
        "price", "bedrooms", "bathrooms", "parkingSpaces", "gardenSize",
        "petFriendly", "status", "isPublished"
      ) VALUES (
        ${householdId}, ${session.user.id}, ${listingType || 'SALE'}, ${title},
        ${description}, ${price ? parseFloat(price) : null},
        ${bedrooms ? parseInt(bedrooms) : null},
        ${bathrooms ? parseInt(bathrooms) : null},
        ${parkingSpaces ? parseInt(parkingSpaces) : null},
        ${gardenSize ? parseFloat(gardenSize) : null},
        ${petFriendly || false}, 'DRAFT', false
      )
      RETURNING *
    `)) as any;

    return NextResponse.json({
      success: true,
      listing: result.rows?.[0],
    });
  } catch (error) {
    console.error('Listing creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
