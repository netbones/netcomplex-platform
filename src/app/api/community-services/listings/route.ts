import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma, ServiceCategory } from '@prisma/client';
import { apiLogger } from '@/lib/logger';

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

    // If id is provided, return single listing
    if (id) {
      const listing = await prisma.communityServiceListing.findUnique({
        where: { id },
        include: {
          provider: {
            select: {
              name: true,
              email: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              reviews: true,
            },
          },
        },
      });

      if (!listing) {
        return NextResponse.json({ error: 'Service not found' }, { status: 404 });
      }

      return NextResponse.json({ listing });
    }

    const where: Prisma.CommunityServiceListingWhereInput = {
      isPublished: true,
      status: 'ACTIVE',
    };

    if (category && category !== 'ALL') {
      // Prisma enum filter - using cast to handle the enum type properly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where.category = category as any;
    }

    if (verified) {
      where.verified = true;
    }

    if (featured) {
      where.isFeatured = true;
    }

    if (providerId) {
      where.providerId = providerId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { provider: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const listings = await prisma.communityServiceListing.findMany({
      where,
      include: {
        provider: {
          select: {
            name: true,
            email: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
      orderBy: [{ isFeatured: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const total = await prisma.communityServiceListing.count({ where });

    return NextResponse.json({
      listings,
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Create listing
    const listing = await prisma.communityServiceListing.create({
      data: {
        providerId: session.user.id,
        title,
        description,
        category,
        subcategory,
        priceType,
        price: price ? parseFloat(price) : null,
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
      },
    });

    return NextResponse.json({
      success: true,
      listing,
    });
  } catch (error) {
    apiLogger.error(
      { err: error, path: '/api/community-services/listings' },
      'Listing creation error'
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
