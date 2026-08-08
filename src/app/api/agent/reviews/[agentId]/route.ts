import { NextRequest } from 'next/server';
import {
  db,
  agentProfiles,
  agentReviews,
  users,
  apiSuccess,
  apiError,
  apiNotFound,
  apiInternalError,
  now,
  notDeleted,
  requireAuth,
} from '@api/server';

import { eq, desc, and, sql } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

/**
 * GET /api/agent/reviews/[agentId]
 *
 * List published reviews for a specific agent (identified by user ID).
 * Returns reviews with reviewer profile data, aggregate stats, and pagination.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    const { tenantId } = await withTenant();

    // Verify agent profile exists in this tenant
    const [profile] = await db
      .select({
        id: agentProfiles.id,
        agentId: agentProfiles.agentId,
      })
      .from(agentProfiles)
      .where(
        and(
          eq(agentProfiles.agentId, agentId),
          eq(agentProfiles.tenantId, tenantId),
          notDeleted(agentProfiles)
        )
      )
      .limit(1);

    if (!profile) {
      return apiNotFound('Agent profile not found');
    }

    // Fetch published reviews for this agent profile
    const reviews = await db
      .select({
        id: agentReviews.id,
        agentProfileId: agentReviews.agentProfileId,
        reviewerId: agentReviews.reviewerId,
        rating: agentReviews.rating,
        title: agentReviews.title,
        comment: agentReviews.comment,
        serviceDate: agentReviews.serviceDate,
        responseQuality: agentReviews.responseQuality,
        isPublished: agentReviews.isPublished,
        createdAt: agentReviews.createdAt,
        reviewer: {
          id: users.id,
          name: users.name,
          avatar: users.avatar,
        },
      })
      .from(agentReviews)
      .leftJoin(users, eq(agentReviews.reviewerId, users.id))
      .where(
        and(
          eq(agentReviews.agentProfileId, profile.id),
          eq(agentReviews.isPublished, true),
          eq(agentReviews.tenantId, tenantId),
          notDeleted(agentReviews)
        )
      )
      .orderBy(desc(agentReviews.createdAt))
      .limit(limit)
      .offset(offset);

    // Total count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentReviews)
      .where(
        and(
          eq(agentReviews.agentProfileId, profile.id),
          eq(agentReviews.isPublished, true),
          eq(agentReviews.tenantId, tenantId),
          notDeleted(agentReviews)
        )
      );

    const total = totalResult?.count || 0;

    // Aggregate rating stats
    const [ratingStats] = await db
      .select({
        avgRating: sql<number>`avg(${agentReviews.rating})`,
        avgResponse: sql<number>`avg(${agentReviews.responseQuality})`,
        count: sql<number>`count(*)`,
      })
      .from(agentReviews)
      .where(
        and(
          eq(agentReviews.agentProfileId, profile.id),
          eq(agentReviews.isPublished, true),
          eq(agentReviews.tenantId, tenantId),
          notDeleted(agentReviews)
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
      { component: 'agent-reviews-api', operation: 'GET' },
      'Agent reviews fetch error',
      error
    );
    return apiInternalError();
  }
}

/**
 * POST /api/agent/reviews/[agentId]
 *
 * Create a review for a specific agent (identified by user ID).
 * - Authenticated users only
 * - Cannot review yourself
 * - One review per agent per reviewer
 * - Rating must be 1-5
 * - Updates the agent profile's rating + reviewCount aggregate
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const authResult = await requireAuth(request);

    if (!authResult.success) return authResult.response;

    const { userId } = authResult.data;

    const body = await request.json();
    const { rating, title, comment, serviceDate, responseQuality } = body;

    // Validate rating
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return apiError('VALIDATION_ERROR', 'Rating must be between 1 and 5', 400);
    }

    const { tenantId } = await withTenant();

    // Verify agent profile exists
    const [profile] = await db
      .select({
        id: agentProfiles.id,
        agentId: agentProfiles.agentId,
      })
      .from(agentProfiles)
      .where(
        and(
          eq(agentProfiles.agentId, agentId),
          eq(agentProfiles.tenantId, tenantId),
          notDeleted(agentProfiles)
        )
      )
      .limit(1);

    if (!profile) {
      return apiNotFound('Agent profile not found');
    }

    // Prevent self-reviews
    if (agentId === userId) {
      return apiError('VALIDATION_ERROR', 'Cannot review yourself', 400);
    }

    // Check for existing review by this reviewer for this agent profile
    const [existingReview] = await db
      .select({ id: agentReviews.id })
      .from(agentReviews)
      .where(
        and(
          eq(agentReviews.agentProfileId, profile.id),
          eq(agentReviews.reviewerId, userId),
          notDeleted(agentReviews)
        )
      )
      .limit(1);

    if (existingReview) {
      return apiError('VALIDATION_ERROR', 'You have already reviewed this agent', 400);
    }

    // Create review
    const reviewId = createId();
    const ts = now();

    await db.insert(agentReviews).values({
      id: reviewId,
      tenantId,
      agentProfileId: profile.id,
      reviewerId: userId,
      rating,
      title: title ?? null,
      comment: comment ?? null,
      serviceDate: serviceDate ? new Date(serviceDate) : null,
      responseQuality: responseQuality ?? null,
      isPublished: true,
      createdAt: ts,
    });

    // Update agent profile aggregate rating
    await updateAgentRating(profile.id);

    // Fetch created review with reviewer join
    const [review] = await db
      .select({
        id: agentReviews.id,
        agentProfileId: agentReviews.agentProfileId,
        reviewerId: agentReviews.reviewerId,
        rating: agentReviews.rating,
        title: agentReviews.title,
        comment: agentReviews.comment,
        serviceDate: agentReviews.serviceDate,
        responseQuality: agentReviews.responseQuality,
        isPublished: agentReviews.isPublished,
        createdAt: agentReviews.createdAt,
        reviewer: {
          id: users.id,
          name: users.name,
          avatar: users.avatar,
        },
      })
      .from(agentReviews)
      .leftJoin(users, eq(agentReviews.reviewerId, users.id))
      .where(eq(agentReviews.id, reviewId))
      .limit(1);

    return apiSuccess({ success: true, review });
  } catch (error) {
    logError(
      { component: 'agent-reviews-api', operation: 'CREATE' },
      'Agent review creation error',
      error
    );
    return apiInternalError();
  }
}

/**
 * Helper: Recalculate and persist the aggregate rating + reviewCount
 * on the AgentProfile from all published, non-deleted reviews.
 */
async function updateAgentRating(profileId: string) {
  const [ratingStats] = await db
    .select({
      avgRating: sql<number>`avg(${agentReviews.rating})`,
      count: sql<number>`count(*)`,
    })
    .from(agentReviews)
    .where(
      and(
        eq(agentReviews.agentProfileId, profileId),
        eq(agentReviews.isPublished, true),
        notDeleted(agentReviews)
      )
    );

  await db
    .update(agentProfiles)
    .set({
      rating: Number(ratingStats?.avgRating) || 0,
      reviewCount: ratingStats?.count || 0,
      updatedAt: now(),
    })
    .where(eq(agentProfiles.id, profileId));
}
