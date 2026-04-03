import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';


// Drizzle imports
import {
  db,
  communityServiceListings,
  communityServiceReviews,
  communityServiceInquiries,
  users,
} from '@/lib/db';
import { eq, desc, and, sql } from 'drizzle-orm';

/**
 * GET /api/community-services/analytics - Get marketplace analytics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin using Drizzle
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user || !['ADMIN', 'BOARD', 'COMMITTEE'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, all

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date('2020-01-01'); // All time
    }

    // Get counts using Drizzle
    const [totalListingsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityServiceListings);

    const [activeListingsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityServiceListings)
      .where(
        and(
          eq(communityServiceListings.isPublished, true),
          eq(communityServiceListings.status, 'ACTIVE' as any)
        )
      );

    // Get distinct providers
    const providerListings = await db
      .select({ providerId: communityServiceListings.providerId })
      .from(communityServiceListings)
      .where(eq(communityServiceListings.isPublished, true));

    const uniqueProviders = new Set(providerListings.map(l => l.providerId));
    const totalProviders = uniqueProviders.size;

    // Get reviews count
    const [totalReviewsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityServiceReviews)
      .where(sql`${communityServiceReviews.createdAt} >= ${startDate}`);

    // Get inquiries count
    const [totalInquiriesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityServiceInquiries)
      .where(sql`${communityServiceInquiries.createdAt} >= ${startDate}`);

    // Get category breakdown
    const categoryStats = await db
      .select({
        category: communityServiceListings.category,
        count: sql<number>`count(*)`,
      })
      .from(communityServiceListings)
      .where(
        and(
          eq(communityServiceListings.isPublished, true),
          eq(communityServiceListings.status, 'ACTIVE' as any)
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
      .where(sql`${communityServiceListings.createdAt} >= ${startDate}`)
      .orderBy(desc(communityServiceListings.createdAt))
      .limit(10);

    // Get average rating
    const [ratingStats] = await db
      .select({
        avgRating: sql<number>`avg(${communityServiceReviews.rating})`,
        count: sql<number>`count(*)`,
      })
      .from(communityServiceReviews);

    return NextResponse.json({
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
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Community services analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
