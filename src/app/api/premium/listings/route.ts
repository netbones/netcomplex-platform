import { NextRequest } from 'next/server';
import { z } from 'zod/v4';
import {
  auth,
  db,
  premiumSeats,
  properties,
  propertyListings,
  propertyPremiumSeats,
  apiForbidden,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
  apiValidationError,
  now,
  rateLimitByUser,
} from '@api/server';

import { eq, sql, and, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';
import { createId } from '@shared/lib/id';

const listingCreateSchema = z.object({
  propertyId: z.string().min(1, 'Property ID is required'),
  listingType: z.enum(['SALE', 'RENT', 'LEASE']).optional().default('SALE'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  parkingSpaces: z.number().int().nonnegative().optional(),
  gardenSize: z.number().nonnegative().optional(),
  petFriendly: z.boolean().optional().default(false),
});

export const maxDuration = 8;

/**
 * @deprecated Use trpc.marketplace.listPremiumListings instead.
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
 * @deprecated Use trpc.marketplace.createPremiumListing instead.
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

    const rateLimit = await rateLimitByUser(session.user.id, {
      windowMs: 60_000,
      maxRequests: 10,
    });
    if (rateLimit) return rateLimit;

    const body = await request.json();

    const parsed = listingCreateSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error.issues);
    }

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
    } = parsed.data;

    const [newListing] = await db
      .insert(propertyListings)
      .values({
        id: createId(),
        tenantId,
        propertyId,
        ownerId: session.user.id,
        listingType,
        title,
        description: description ?? (null as string | null),
        price: price ? String(price) : null,
        bedrooms: bedrooms ?? null,
        bathrooms: bathrooms ?? null,
        parkingSpaces: parkingSpaces ?? null,
        gardenSize: gardenSize ?? null,
        petFriendly,
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
