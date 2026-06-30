import { NextRequest } from 'next/server';
import {
  auth,
  db,
  communityServiceListings,
  communityServiceReviews,
  users,
  apiError,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  now,
} from '@api/server';

// Drizzle imports

import { eq, desc, and, sql } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

/**
 * GET /api/community-services/reviews/[listingId] - Get reviews for a listing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { tenantId } = await withTenant();

    // Get reviews using Drizzle
    const reviews = await db
      .select({
        id: communityServiceReviews.id,
        listingId: communityServiceReviews.listingId,
        reviewerId: communityServiceReviews.reviewerId,
        rating: communityServiceReviews.rating,
        title: communityServiceReviews.title,
        comment: communityServiceReviews.comment,
        serviceDate: communityServiceReviews.serviceDate,
        responseQuality: communityServiceReviews.responseQuality,
        isPublished: communityServiceReviews.isPublished,
        createdAt: communityServiceReviews.createdAt,
        reviewer: {
          id: users.id,
          name: users.name,
          avatar: users.avatar,
        },
      })
      .from(communityServiceReviews)
      .leftJoin(users, eq(communityServiceReviews.reviewerId, users.id))
      .where(
        and(
          eq(communityServiceReviews.listingId, listingId),
          eq(communityServiceReviews.isPublished, true),
          eq(communityServiceReviews.tenantId, tenantId)
        )
      )
      .orderBy(desc(communityServiceReviews.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityServiceReviews)
      .where(
        and(
          eq(communityServiceReviews.listingId, listingId),
          eq(communityServiceReviews.isPublished, true),
          eq(communityServiceReviews.tenantId, tenantId)
        )
      );

    const total = totalResult?.count || 0;

    // Calculate average rating using Drizzle
    const [ratingStats] = await db
      .select({
        avgRating: sql<number>`avg(${communityServiceReviews.rating})`,
        avgResponse: sql<number>`avg(${communityServiceReviews.responseQuality})`,
        count: sql<number>`count(*)`,
      })
      .from(communityServiceReviews)
      .where(
        and(
          eq(communityServiceReviews.listingId, listingId),
          eq(communityServiceReviews.isPublished, true),
          eq(communityServiceReviews.tenantId, tenantId)
        )
      );

    return apiSuccess({
      reviews,
      stats: {
        averageRating: ratingStats?.avgRating || 0,
        averageResponse: ratingStats?.avgResponse || 0,
        totalReviews: ratingStats?.count || 0,
      },
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logError(
      { component: 'reviews-api', operation: 'GET' },
      'Community service reviews fetch error',
      error
    );
    return apiInternalError();
  }
}

/**
 * POST /api/community-services/reviews/[listingId] - Create a review for a listing
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const body = await request.json();
    const { rating, title, comment, serviceDate, responseQuality } = body;

    // Validate rating
    if (rating < 1 || rating > 5) {
      return apiError('VALIDATION_ERROR', 'Rating must be between 1 and 5', 400);
    }

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    // Check if listing exists and is published using Drizzle
    const [listing] = await db
      .select({
        id: communityServiceListings.id,
        isPublished: communityServiceListings.isPublished,
        providerId: communityServiceListings.providerId,
      })
      .from(communityServiceListings)
      .where(
        and(
          eq(communityServiceListings.id, listingId),
          eq(communityServiceListings.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!listing || !listing.isPublished) {
      return apiNotFound('Listing not found');
    }

    // Prevent self-reviews
    if (listing.providerId === session.user.id) {
      return apiError('VALIDATION_ERROR', 'Cannot review your own service', 400);
    }

    // Check if user already reviewed this listing using Drizzle
    const [existingReview] = await db
      .select({ id: communityServiceReviews.id })
      .from(communityServiceReviews)
      .where(
        and(
          eq(communityServiceReviews.listingId, listingId),
          eq(communityServiceReviews.reviewerId, session.user.id)
        )
      )
      .limit(1);

    if (existingReview) {
      return apiError('VALIDATION_ERROR', 'You have already reviewed this service', 400);
    }

    // Create review with Drizzle
    const reviewId = createId();
    const ts = now();

    await db.insert(communityServiceReviews).values({
      id: reviewId,
      tenantId,
      listingId,
      reviewerId: session.user.id,
      rating,
      title,
      comment,
      serviceDate: serviceDate ? new Date(serviceDate) : null,
      responseQuality,
      isPublished: true,
      createdAt: ts,
    });

    // Update listing rating
    await updateListingRating(listingId, tenantId);

    // Fetch created review
    const [review] = await db
      .select({
        id: communityServiceReviews.id,
        listingId: communityServiceReviews.listingId,
        reviewerId: communityServiceReviews.reviewerId,
        rating: communityServiceReviews.rating,
        title: communityServiceReviews.title,
        comment: communityServiceReviews.comment,
        serviceDate: communityServiceReviews.serviceDate,
        responseQuality: communityServiceReviews.responseQuality,
        isPublished: communityServiceReviews.isPublished,
        createdAt: communityServiceReviews.createdAt,
        reviewer: {
          id: users.id,
          name: users.name,
          avatar: users.avatar,
        },
      })
      .from(communityServiceReviews)
      .leftJoin(users, eq(communityServiceReviews.reviewerId, users.id))
      .where(eq(communityServiceReviews.id, reviewId))
      .limit(1);

    return apiSuccess({
      success: true,
      review,
    });
  } catch (error) {
    logError(
      { component: 'reviews-api', operation: 'CREATE' },
      'Community service review creation error',
      error
    );
    return apiInternalError();
  }
}

/**
 * Helper function to update listing rating
 */
async function updateListingRating(listingId: string, tenantId: string) {
  const [ratingStats] = await db
    .select({
      avgRating: sql<number>`avg(${communityServiceReviews.rating})`,
      count: sql<number>`count(*)`,
    })
    .from(communityServiceReviews)
    .where(
      and(
        eq(communityServiceReviews.listingId, listingId),
        eq(communityServiceReviews.isPublished, true)
      )
    );

  await db
    .update(communityServiceListings)
    .set({
      rating: Number(ratingStats?.avgRating) || 0,
      reviewCount: ratingStats?.count || 0,
      updatedAt: now(),
    })
    .where(
      and(
        eq(communityServiceListings.id, listingId),
        eq(communityServiceListings.tenantId, tenantId)
      )
    );
}
