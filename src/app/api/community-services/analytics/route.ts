import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

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

    // Basic marketplace statistics
    const [
      totalListings,
      activeListings,
      totalProviders,
      totalReviews,
      totalInquiries,
      categoryStats,
      recentActivity,
    ] = await Promise.all([
      // Total listings
      prisma.communityServiceListing.count(),

      // Active published listings
      prisma.communityServiceListing.count({
        where: { isPublished: true, status: 'ACTIVE' },
      }),

      // Total providers
      prisma.communityServiceListing
        .findMany({
          select: { providerId: true },
          distinct: ['providerId'],
        })
        .then(results => results.length),

      // Total reviews
      prisma.communityServiceReview.count({
        where: { createdAt: { gte: startDate } },
      }),

      // Total inquiries
      prisma.communityServiceInquiry.count({
        where: { createdAt: { gte: startDate } },
      }),

      // Category breakdown
      prisma.communityServiceListing.groupBy({
        by: ['category'],
        where: { isPublished: true, status: 'ACTIVE' },
        _count: true,
      }),

      // Recent activity (last 30 days)
      prisma.communityServiceListing.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          id: true,
          title: true,
          category: true,
          createdAt: true,
          provider: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Average rating
    const ratingStats = await prisma.communityServiceReview.aggregate({
      _avg: { rating: true },
      _count: true,
    });

    return NextResponse.json({
      overview: {
        totalListings,
        activeListings,
        totalProviders,
        totalReviews,
        totalInquiries,
        averageRating: ratingStats._avg.rating || 0,
        totalRatingCount: ratingStats._count,
      },
      categories: categoryStats,
      recentActivity,
      period,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Community services analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
