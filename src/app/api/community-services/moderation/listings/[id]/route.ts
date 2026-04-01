import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/community-services/moderation/listings - Get listings requiring moderation
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
    const status = searchParams.get('status') || 'PENDING';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};

    if (status !== 'ALL') {
      where.status = status;
    }

    const listings = await prisma.communityServiceListing.findMany({
      where,
      include: {
        provider: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

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
    console.error('Community services moderation listings fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/community-services/moderation/listings/[id]/approve - Approve a listing
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

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !['ADMIN', 'BOARD', 'COMMITTEE'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { notes } = await request.json();

    const listing = await prisma.communityServiceListing.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        isPublished: true,
        moderatedBy: session.user.id,
        moderatedAt: new Date(),
        moderationNotes: notes,
      },
    });

    return NextResponse.json({
      success: true,
      listing,
      message: 'Listing approved and published',
    });
  } catch (error) {
    console.error('Community service listing approval error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/community-services/moderation/listings/[id]/reject - Reject a listing
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

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !['ADMIN', 'BOARD', 'COMMITTEE'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { reason, notes } = await request.json();

    const listing = await prisma.communityServiceListing.update({
      where: { id },
      data: {
        status: 'WITHDRAWN',
        isPublished: false,
        moderatedBy: session.user.id,
        moderatedAt: new Date(),
        moderationNotes: `${reason}: ${notes}`,
      },
    });

    return NextResponse.json({
      success: true,
      listing,
      message: 'Listing rejected',
    });
  } catch (error) {
    console.error('Community service listing rejection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/community-services/moderation/listings/[id] - Remove a listing (admin only)
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

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !['ADMIN', 'BOARD'].includes(user.role)) {
      return NextResponse.json({ error: 'Board/Admin access required' }, { status: 403 });
    }

    const { reason } = await request.json();

    // Log the removal reason
    await prisma.communityServiceListing.update({
      where: { id },
      data: {
        status: 'WITHDRAWN',
        isPublished: false,
        moderatedBy: session.user.id,
        moderatedAt: new Date(),
        moderationNotes: `REMOVED: ${reason}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Listing removed from marketplace',
    });
  } catch (error) {
    console.error('Community service listing removal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
