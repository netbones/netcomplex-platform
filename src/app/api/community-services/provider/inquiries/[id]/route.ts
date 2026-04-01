import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/community-services/provider/inquiries - Get inquiries for provider's listings
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

    // Get all listing IDs for this provider
    const providerListings = await prisma.communityServiceListing.findMany({
      where: { providerId: session.user.id },
      select: { id: true },
    });

    const listingIds = providerListings.map(l => l.id);

    if (listingIds.length === 0) {
      return NextResponse.json({
        inquiries: [],
        pagination: { total: 0, limit, offset, hasMore: false },
      });
    }

    const where: any = {
      listingId: { in: listingIds },
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const inquiries = await prisma.communityServiceInquiry.findMany({
      where,
      include: {
        listing: {
          select: {
            title: true,
            category: true,
          },
        },
        inquirer: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // PENDING first
        { createdAt: 'desc' },
      ],
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
    console.error('Community service provider inquiries fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/community-services/provider/inquiries/[id]/respond - Respond to an inquiry
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { response, status } = await request.json();

    // Check if inquiry exists and belongs to provider's listing
    const inquiry = await prisma.communityServiceInquiry.findUnique({
      where: { id },
      include: {
        listing: {
          select: { providerId: true },
        },
      },
    });

    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    if (inquiry.listing.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update inquiry
    const updatedInquiry = await prisma.communityServiceInquiry.update({
      where: { id },
      data: {
        providerResponse: response,
        status: status || 'RESPONDED',
        respondedAt: new Date(),
      },
      include: {
        listing: {
          select: {
            title: true,
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
      inquiry: updatedInquiry,
    });
  } catch (error) {
    console.error('Community service inquiry response error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
