import { NextRequest } from 'next/server';
import { auth } from '@api/auth';

import { apiLogger } from '@shared/lib';

// Drizzle imports
import { db, communityServiceListings, users } from '@api/db';
import { eq, desc, and, or, sql, ilike } from 'drizzle-orm';
import { communityServiceReviews } from '@api/db';
import { withTenant } from '@entities/tenant/api/with-tenant';

import {
  apiError,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
} from '@api/api-response';
type ListingStatus = (typeof communityServiceListings.status.enumValues)[number];
type ServiceCategory = (typeof communityServiceListings.category.enumValues)[number];

/**
 * GET /api/community-services/listings - Get community service listings
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const verified = searchParams.get('verified') === 'true';
    const featured = searchParams.get('featured') === 'true';
    const providerId = searchParams.get('providerId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { tenantId } = await withTenant();

    // If id is provided, return single listing
    if (id) {
      // Drizzle query
      const [listing] = await db
        .select({
          id: communityServiceListings.id,
          providerId: communityServiceListings.providerId,
          title: communityServiceListings.title,
          description: communityServiceListings.description,
          category: communityServiceListings.category,
          subcategory: communityServiceListings.subcategory,
          priceType: communityServiceListings.priceType,
          price: communityServiceListings.price,
          currency: communityServiceListings.currency,
          serviceAreas: communityServiceListings.serviceAreas,
          availability: communityServiceListings.availability,
          licenseNumber: communityServiceListings.licenseNumber,
          insuranceExpiry: communityServiceListings.insuranceExpiry,
          verified: communityServiceListings.verified,
          verificationDate: communityServiceListings.verificationDate,
          responseTime: communityServiceListings.responseTime,
          contactMethods: communityServiceListings.contactMethods,
          images: communityServiceListings.images,
          portfolio: communityServiceListings.portfolio,
          status: communityServiceListings.status,
          isPublished: communityServiceListings.isPublished,
          isFeatured: communityServiceListings.isFeatured,
          rating: communityServiceListings.rating,
          reviewCount: communityServiceListings.reviewCount,
          termsAndConditions: communityServiceListings.termsAndConditions,
          cancellationPolicy: communityServiceListings.cancellationPolicy,
          createdAt: communityServiceListings.createdAt,
          updatedAt: communityServiceListings.updatedAt,
          provider: {
            id: users.id,
            name: users.name,
            email: users.email,
            avatar: users.avatar,
          },
        })
        .from(communityServiceListings)
        .leftJoin(users, eq(communityServiceListings.providerId, users.id))
        .where(
          and(eq(communityServiceListings.id, id), eq(communityServiceListings.tenantId, tenantId))
        )
        .limit(1);

      if (!listing) {
        return apiNotFound('Service not found');
      }

      // Get review count separately (Drizzle doesn't support count in select for relates)
      const [reviewCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(communityServiceReviews)
        .where(eq(communityServiceReviews.listingId, id));

      return apiSuccess({
        listing: { ...listing, _count: { reviews: reviewCountResult?.count || 0 } },
      });
    }

    // Build where conditions for list query
    const conditions = [
      eq(communityServiceListings.tenantId, tenantId),
      eq(communityServiceListings.isPublished, true),
      eq(communityServiceListings.status, 'ACTIVE' as ListingStatus),
    ];

    if (category && category !== 'ALL') {
      conditions.push(eq(communityServiceListings.category, category as ServiceCategory));
    }

    if (verified) {
      conditions.push(eq(communityServiceListings.verified, true));
    }

    if (featured) {
      conditions.push(eq(communityServiceListings.isFeatured, true));
    }

    if (providerId) {
      conditions.push(eq(communityServiceListings.providerId, providerId));
    }

    if (search) {
      const searchLower = `%${search}%`;
      const searchCondition = or(
        ilike(communityServiceListings.title, searchLower),
        ilike(sql`coalesce(${communityServiceListings.description}, '')`, searchLower)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    // Get listings with pagination
    const listings = await db
      .select({
        id: communityServiceListings.id,
        providerId: communityServiceListings.providerId,
        title: communityServiceListings.title,
        description: communityServiceListings.description,
        category: communityServiceListings.category,
        subcategory: communityServiceListings.subcategory,
        priceType: communityServiceListings.priceType,
        price: communityServiceListings.price,
        currency: communityServiceListings.currency,
        serviceAreas: communityServiceListings.serviceAreas,
        verified: communityServiceListings.verified,
        rating: communityServiceListings.rating,
        reviewCount: communityServiceListings.reviewCount,
        isFeatured: communityServiceListings.isFeatured,
        images: communityServiceListings.images,
        createdAt: communityServiceListings.createdAt,
        provider: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
        },
      })
      .from(communityServiceListings)
      .leftJoin(users, eq(communityServiceListings.providerId, users.id))
      .where(and(...conditions))
      .orderBy(
        desc(communityServiceListings.isFeatured),
        desc(communityServiceListings.rating),
        desc(communityServiceListings.createdAt)
      )
      .limit(limit)
      .offset(offset);

    // Get total count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityServiceListings)
      .where(and(...conditions));

    const total = totalResult?.count || 0;

    // Get review counts for each listing
    const listingsWithCounts = await Promise.all(
      listings.map(async listing => {
        const [countResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(communityServiceReviews)
          .where(eq(communityServiceReviews.listingId, listing.id));
        return { ...listing, _count: { reviews: countResult?.count || 0 } };
      })
    );

    return apiSuccess({
      listings: listingsWithCounts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    apiLogger.error(
      { err: error, path: '/api/community-services/listings' },
      'Listings fetch error'
    );
    return apiInternalError();
  }
}

/**
 * POST /api/community-services/listings - Create a new service listing
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      subcategory,
      priceType,
      price,
      serviceAreas,
      availability,
      licenseNumber,
      insuranceExpiry,
      responseTime,
      contactMethods,
      images,
      portfolio,
      termsAndConditions,
      cancellationPolicy,
    } = body;

    // Create listing with Drizzle
    const listingId = crypto.randomUUID();
    const now = new Date();

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    await db.insert(communityServiceListings).values({
      id: listingId,
      tenantId,
      providerId: session.user.id,
      title,
      description,
      category,
      subcategory,
      priceType,
      price: price ? String(price) : null,
      serviceAreas: serviceAreas || [],
      availability,
      licenseNumber,
      insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
      responseTime: responseTime || 24,
      contactMethods: contactMethods || ['PLATFORM_MESSAGE'],
      images: images || [],
      portfolio: portfolio || [],
      termsAndConditions,
      cancellationPolicy,
      status: 'DRAFT',
      isPublished: false,
      rating: 0,
      reviewCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Fetch the created listing
    const [listing] = await db
      .select()
      .from(communityServiceListings)
      .where(eq(communityServiceListings.id, listingId))
      .limit(1);

    return apiSuccess({
      success: true,
      listing,
    });
  } catch (error) {
    apiLogger.error(
      { err: error, path: '/api/community-services/listings' },
      'Listing creation error'
    );
    return apiInternalError();
  }
}
