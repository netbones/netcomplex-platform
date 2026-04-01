import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/community-services/listings/[id] - Get a specific service listing
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const listing = await prisma.communityServiceListing.findUnique({
      where: { id },
      include: {
        provider: {
          select: {
            name: true,
            email: true,
            avatar: true,
            phone: true,
          },
        },
        CommunityServiceReview: {
          include: {
            reviewer: {
              select: {
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            reviews: true,
            inquiries: true,
          },
        },
      },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Check if user can view this listing
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    // Only published listings are visible to non-owners
    if (!listing.isPublished && listing.providerId !== session?.user?.id) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    return NextResponse.json({ listing });
  } catch (error) {
    console.error('Community service listing fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/community-services/listings/[id] - Update a service listing
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check ownership
    const existingListing = await prisma.communityServiceListing.findUnique({
      where: { id },
    });

    if (!existingListing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (existingListing.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const updateData: any = {};

    // Only allow updating certain fields
    const allowedFields = [
      'title',
      'description',
      'subcategory',
      'priceType',
      'price',
      'serviceAreas',
      'availability',
      'licenseNumber',
      'insuranceExpiry',
      'responseTime',
      'contactMethods',
      'images',
      'portfolio',
      'termsAndConditions',
      'cancellationPolicy',
    ];

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        if (field === 'price' && body[field] !== null) {
          updateData[field] = parseFloat(body[field]);
        } else if (field === 'insuranceExpiry' && body[field]) {
          updateData[field] = new Date(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    });

    const listing = await prisma.communityServiceListing.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      listing,
    });
  } catch (error) {
    console.error('Community service listing update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/community-services/listings/[id] - Delete a service listing
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check ownership
    const existingListing = await prisma.communityServiceListing.findUnique({
      where: { id },
    });

    if (!existingListing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (existingListing.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await prisma.communityServiceListing.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Listing deleted successfully',
    });
  } catch (error) {
    console.error('Community service listing deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
