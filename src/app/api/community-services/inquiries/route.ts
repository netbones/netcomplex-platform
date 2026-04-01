import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/community-services/inquiries - Get user's inquiries (as inquirer)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {
      inquirerId: session.user.id,
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const inquiries = await prisma.communityServiceInquiry.findMany({
      where,
      include: {
        listing: {
          include: {
            provider: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.communityServiceInquiry.count({ where });

    return NextResponse.json({
      inquiries,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Community service inquiries fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/community-services/inquiries - Create a service inquiry
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
      listingId,
      serviceType,
      preferredDate,
      preferredTime,
      location,
      description,
      contactMethod,
    } = body;

    // Validate required fields
    if (!listingId || !description) {
      return NextResponse.json(
        { error: 'Listing ID and description are required' },
        { status: 400 }
      );
    }

    // Check if listing exists and is published
    const listing = await prisma.communityServiceListing.findUnique({
      where: { id: listingId },
      select: { id: true, isPublished: true, providerId: true },
    });

    if (!listing || !listing.isPublished) {
      return NextResponse.json({ error: 'Service listing not found' }, { status: 404 });
    }

    // Prevent self-inquiries
    if (listing.providerId === session.user.id) {
      return NextResponse.json({ error: 'Cannot inquire about your own service' }, { status: 400 });
    }

    // Create inquiry
    const inquiry = await prisma.communityServiceInquiry.create({
      data: {
        listingId,
        inquirerId: session.user.id,
        serviceType,
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        preferredTime,
        location,
        description,
        contactMethod: contactMethod || 'PLATFORM_MESSAGE',
        status: 'PENDING',
      },
      include: {
        listing: {
          include: {
            provider: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        inquirer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      inquiry,
    });
  } catch (error) {
    console.error('Community service inquiry creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
