import { NextRequest } from 'next/server';
import {
  db,
  agentReviews,
  agentProfiles,
  users,
  apiSuccess,
  apiNotFound,
  apiForbidden,
  apiInternalError,
  now,
  notDeleted,
  requireAuth,
} from '@api/server';

import { eq, and, sql } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';

export const maxDuration = 8;

/**
 * DELETE /api/agent/reviews/[reviewId]
 *
 * Soft-delete a review. Allowed for:
 * - The reviewer themselves
 * - Admin/Board users (moderation)
 *
 * After deletion, recalculates the agent profile's aggregate rating.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params;
    const authResult = await requireAuth(request);

    if (!authResult.success) return authResult.response;

    const { userId, role } = authResult.data;

    const { tenantId } = await withTenant();

    // Find the review
    const [review] = await db
      .select({
        id: agentReviews.id,
        agentProfileId: agentReviews.agentProfileId,
        reviewerId: agentReviews.reviewerId,
      })
      .from(agentReviews)
      .where(
        and(
          eq(agentReviews.id, reviewId),
          eq(agentReviews.tenantId, tenantId),
          notDeleted(agentReviews)
        )
      )
      .limit(1);

    if (!review) {
      return apiNotFound('Review not found');
    }

    // Check authorization: reviewer or admin/board can delete
    const isReviewer = review.reviewerId === userId;
    const isAdmin = ['ADMIN', 'BOARD'].includes(role);

    // If not reviewer and role from session isn't admin, double-check in DB
    if (!isReviewer && !isAdmin) {
      const [userRow] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!userRow || !['ADMIN', 'BOARD'].includes(userRow.role ?? '')) {
        return apiForbidden('You can only delete your own reviews');
      }
    }

    // Soft-delete
    await db.update(agentReviews).set({ deletedAt: now() }).where(eq(agentReviews.id, reviewId));

    // Recalculate agent profile aggregate rating
    await updateAgentRating(review.agentProfileId);

    return apiSuccess({ success: true });
  } catch (error) {
    logError(
      { component: 'agent-reviews-api', operation: 'DELETE' },
      'Agent review deletion error',
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
