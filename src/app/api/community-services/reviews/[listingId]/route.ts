import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    const reviews = await prisma.communityServiceReview.findMany({
      where: {
        listingId,
        isPublished: true,
      },
      include: {
        reviewer: {
          select: {
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.communityServiceReview.count({
      where: {
        listingId,
        isPublished: true,
      },
    });

    // Calculate average rating
    const ratingStats = await prisma.communityServiceReview.aggregate({
      where: {
        listingId,
        isPublished: true,
      },
      _avg: {
        rating: true,
        responseQuality: true,
      },
      _count: true,
    });

    return NextResponse.json({
      reviews,
      stats: {
        averageRating: ratingStats._avg.rating || 0,
        averageResponse: ratingStats._avg.responseQuality || 0,
        totalReviews: ratingStats._count,
      },
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Community service reviews fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { rating, title, comment, serviceDate, responseQuality } = body;

    // Validate rating
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Check if listing exists and is published
    const listing = await prisma.communityServiceListing.findUnique({
      where: { id: listingId },
      select: { id: true, isPublished: true, providerId: true },
    });

    if (!listing || !listing.isPublished) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Prevent self-reviews
    if (listing.providerId === session.user.id) {
      return NextResponse.json({ error: 'Cannot review your own service' }, { status: 400 });
    }

    // Check if user already reviewed this listing
    const existingReview = await prisma.communityServiceReview.findFirst({
      where: {
        listingId,
        reviewerId: session.user.id,
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this service' },
        { status: 400 }
      );
    }

    // Create review
    const review = await prisma.communityServiceReview.create({
      data: {
        listingId,
        reviewerId: session.user.id,
        rating,
        title,
        comment,
        serviceDate: serviceDate ? new Date(serviceDate) : null,
        responseQuality,
      },
      include: {
        reviewer: {
          select: {
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Update listing rating
    await updateListingRating(listingId);

    return NextResponse.json({
      success: true,
      review,
    });
  } catch (error) {
    console.error('Community service review creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Helper function to update listing rating
 */
async function updateListingRating(listingId: string) {
  const ratingStats = await prisma.communityServiceReview.aggregate({
    where: {
      listingId,
      isPublished: true,
    },
    _avg: {
      rating: true,
    },
    _count: true,
  });

  await prisma.communityServiceListing.update({
    where: { id: listingId },
    data: {
      rating: ratingStats._avg.rating || 0,
      reviewCount: ratingStats._count,
    },
  });
}
