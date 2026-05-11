import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@api/auth';
import { db, premiumSeats, properties, propertyListings, propertiesTopremiumSeats } from '@api/db';
import { eq, sql, and, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { logError } from '@shared/lib';

/**
 * GET /api/premium/listings - Get property listings for premium user
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

    // Get linked properties for this premium seat via junction table
    const linkedProperties = await db
      .select({ id: properties.id })
      .from(properties)
      .innerJoin(propertiesTopremiumSeats, eq(properties.id, propertiesTopremiumSeats.B))
      .innerJoin(premiumSeats, eq(premiumSeats.id, propertiesTopremiumSeats.A))
      .where(and(eq(premiumSeats.userId, session.user.id), eq(premiumSeats.tenantId, tenantId)));

    if (!linkedProperties.length) {
      return NextResponse.json(
        { error: 'Premium Seat required to access listings' },
        { status: 403 }
      );
    }

    const propertyIds = linkedProperties.map(p => p.id);

    // Get all listings for user's properties using Drizzle (joining with properties)
    const listings = await db
      .select({
        listing: propertyListings,
        property: properties,
      })
      .from(propertyListings)
      .innerJoin(properties, eq(propertyListings.propertyId, properties.id))
      .where(
        and(
          eq(propertyListings.ownerId, session.user.id),
          eq(propertyListings.tenantId, tenantId),
          sql`${propertyListings.propertyId} IN ${propertyIds}`
        )
      )
      .orderBy(desc(propertyListings.createdAt));

    const transformedListings = listings.map(l => ({
      ...l.listing,
      street: l.property.street,
      unit: l.property.unit,
      homeImage: l.property.homeImage,
    }));

    return NextResponse.json({ listings: transformedListings });
  } catch (error) {
    logError(
      { component: 'premium-listings-api', operation: 'GET' },
      'Listings fetch error',
      error
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/premium/listings - Create a new property listing
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

    // Check if user has Premium Seat
    const premiumSeatExists = await db
      .select({ id: premiumSeats.id })
      .from(premiumSeats)
      .where(and(eq(premiumSeats.userId, session.user.id), eq(premiumSeats.tenantId, tenantId)))
      .limit(1);

    if (!premiumSeatExists.length) {
      return NextResponse.json(
        { error: 'Premium Seat required to create listings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      propertyId,
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

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID required' }, { status: 400 });
    }

    // Use Drizzle insert
    const [newListing] = await db
      .insert(propertyListings)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        propertyId,
        ownerId: session.user.id,
        listingType: listingType || 'SALE',
        title,
        description,
        price: price ? price.toString() : null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        parkingSpaces: parkingSpaces ? parseInt(parkingSpaces) : null,
        gardenSize: gardenSize ? parseFloat(gardenSize) : null,
        petFriendly: petFriendly || false,
        status: 'DRAFT',
        isPublished: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      listing: newListing,
    });
  } catch (error) {
    logError(
      { component: 'premium-listings-api', operation: 'CREATE' },
      'Listing creation error',
      error
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
