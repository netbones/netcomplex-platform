import { NextRequest } from 'next/server';
import {
  auth,
  db,
  communityServiceListings,
  communityServiceReviews,
  communityServiceInquiries,
  users,
  apiError,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  now,
} from '@api/server';

// Drizzle imports

import { eq, desc, and, sql } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';

export const maxDuration = 8;

/**
 * GET /api/community-services/analytics - Get marketplace analytics
 */
export async function GET(request: NextRequest) {
  try {
    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    // Check if user is admin using Drizzle
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user || !['ADMIN', 'BOARD', 'COMMITTEE'].includes(user.role)) {
      return apiForbidden('Admin access required');
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, all

    // Calculate date range
    const ts = now();
    let startDate: Date;

    switch (period) {
      case '7d':
        startDate = new Date(ts.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(ts.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(ts.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date('2020-01-01'); // All time
    }

    // Get counts using Drizzle (filtered by tenant)
    const [totalListingsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityServiceListings)
      .where(eq(communityServiceListings.tenantId, tenantId));

    const [activeListingsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityServiceListings)
      .where(
        and(
          eq(communityServiceListings.tenantId, tenantId),
          eq(communityServiceListings.isPublished, true),
          eq(communityServiceListings.status, 'ACTIVE' as const)
        )
      );

    // Get distinct providers
    const providerListings = await db
      .select({ providerId: communityServiceListings.providerId })
      .from(communityServiceListings)
      .where(
        and(
          eq(communityServiceListings.tenantId, tenantId),
          eq(communityServiceListings.isPublished, true)
        )
      );

    const uniqueProviders = new Set(providerListings.map(l => l.providerId));
    const totalProviders = uniqueProviders.size;

    // Get reviews count
    const [totalReviewsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityServiceReviews)
      .where(
        and(
          sql`${communityServiceReviews.createdAt} >= ${startDate}`,
          sql`EXISTS (SELECT 1 FROM "communityServiceListings" WHERE "communityServiceListings"."id" = ${communityServiceReviews.listingId} AND "communityServiceListings"."tenantId" = ${tenantId})`
        )
      );

    // Get inquiries count
    const [totalInquiriesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityServiceInquiries)
      .where(
        and(
          sql`${communityServiceInquiries.createdAt} >= ${startDate}`,
          sql`EXISTS (SELECT 1 FROM "communityServiceListings" WHERE "communityServiceListings"."id" = ${communityServiceInquiries.listingId} AND "communityServiceListings"."tenantId" = ${tenantId})`
        )
      );

    // Get category breakdown
    const categoryStats = await db
      .select({
        category: communityServiceListings.category,
        count: sql<number>`count(*)`,
      })
      .from(communityServiceListings)
      .where(
        and(
          eq(communityServiceListings.tenantId, tenantId),
          eq(communityServiceListings.isPublished, true),
          eq(communityServiceListings.status, 'ACTIVE' as const)
        )
      )
      .groupBy(communityServiceListings.category);

    // Get recent activity
    const recentActivity = await db
      .select({
        id: communityServiceListings.id,
        title: communityServiceListings.title,
        category: communityServiceListings.category,
        createdAt: communityServiceListings.createdAt,
        provider: {
          id: users.id,
          name: users.name,
        },
      })
      .from(communityServiceListings)
      .leftJoin(users, eq(communityServiceListings.providerId, users.id))
      .where(
        and(
          eq(communityServiceListings.tenantId, tenantId),
          sql`${communityServiceListings.createdAt} >= ${startDate}`
        )
      )
      .orderBy(desc(communityServiceListings.createdAt))
      .limit(10);

    // Get average rating
    const [ratingStats] = await db
      .select({
        avgRating: sql<number>`avg(${communityServiceReviews.rating})`,
        count: sql<number>`count(*)`,
      })
      .from(communityServiceReviews)
      .where(
        sql`EXISTS (SELECT 1 FROM "communityServiceListings" WHERE "communityServiceListings"."id" = ${communityServiceReviews.listingId} AND "communityServiceListings"."tenantId" = ${tenantId})`
      );

    return apiSuccess({
      overview: {
        totalListings: totalListingsResult?.count || 0,
        activeListings: activeListingsResult?.count || 0,
        totalProviders,
        totalReviews: totalReviewsResult?.count || 0,
        totalInquiries: totalInquiriesResult?.count || 0,
        averageRating: ratingStats?.avgRating || 0,
        totalRatingCount: ratingStats?.count || 0,
      },
      categories: categoryStats.map(c => ({ category: c.category, _count: c.count })),
      recentActivity,
      period,
      generatedAt: now().toISOString(),
    });
  } catch (error) {
    logError(
      { component: 'analytics-api', operation: 'GET' },
      'Community services analytics error',
      error
    );
    return apiInternalError();
  }
}
