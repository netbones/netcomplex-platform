import { NextRequest } from 'next/server';
import {
  auth,
  db,
  premiumSeats,
  properties,
  propertyListings,
  propertyPremiumSeats,
  apiError,
  apiForbidden,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
  now,
} from '@api/server';

import { eq, sql, and, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

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
      return apiUnauthorized();
    }

    // Get linked properties for this premium seat via junction table
    const linkedProperties = await db
      .select({ id: properties.id })
      .from(properties)
      .innerJoin(propertyPremiumSeats, eq(properties.id, propertyPremiumSeats.propertyId))
      .innerJoin(premiumSeats, eq(premiumSeats.id, propertyPremiumSeats.premiumSeatId))
      .where(and(eq(premiumSeats.userId, session.user.id), eq(premiumSeats.tenantId, tenantId)));

    if (!linkedProperties.length) {
      return apiForbidden('Premium Seat required to access listings');
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

    return apiSuccess({ listings: transformedListings });
  } catch (error) {
    logError(
      { component: 'premium-listings-api', operation: 'GET' },
      'Listings fetch error',
      error
    );
    return apiInternalError();
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
      return apiUnauthorized();
    }

    // Check if user has Premium Seat
    const premiumSeatExists = await db
      .select({ id: premiumSeats.id })
      .from(premiumSeats)
      .where(and(eq(premiumSeats.userId, session.user.id), eq(premiumSeats.tenantId, tenantId)))
      .limit(1);

    if (!premiumSeatExists.length) {
      return apiForbidden('Premium Seat required to create listings');
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
      return apiError('VALIDATION_ERROR', 'Property ID required', 400);
    }

    // Use Drizzle insert
    const [newListing] = await db
      .insert(propertyListings)
      .values({
        id: createId(),
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
        createdAt: now(),
        updatedAt: now(),
      })
      .returning();

    return apiSuccess({
      success: true,
      listing: newListing,
    });
  } catch (error) {
    logError(
      { component: 'premium-listings-api', operation: 'CREATE' },
      'Listing creation error',
      error
    );
    return apiInternalError();
  }
}
