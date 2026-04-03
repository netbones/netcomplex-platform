import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';


// Drizzle imports
import { db, communityServiceListings, users } from '@/lib/db';
import { eq, desc, and, sql } from 'drizzle-orm';

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
    const status = searchParams.get('status') || 'PENDING';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build conditions
    const conditions = [];

    if (status !== 'ALL') {
      conditions.push(eq(communityServiceListings.status, status as any));
    }

    // Get listings using Drizzle
    const listings = await db
      .select({
        id: communityServiceListings.id,
        providerId: communityServiceListings.providerId,
        title: communityServiceListings.title,
        description: communityServiceListings.description,
        category: communityServiceListings.category,
        subcategory: communityServiceListings.subcategory,
        priceType: communityServiceListings.priceType,
        price: communityServiceListings.price,
        status: communityServiceListings.status,
        isPublished: communityServiceListings.isPublished,
        rating: communityServiceListings.rating,
        reviewCount: communityServiceListings.reviewCount,
        verified: communityServiceListings.verified,
        createdAt: communityServiceListings.createdAt,
        updatedAt: communityServiceListings.updatedAt,
        provider: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(communityServiceListings)
      .leftJoin(users, eq(communityServiceListings.providerId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(communityServiceListings.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityServiceListings)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = totalResult?.count || 0;

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

    // Check if user is admin using Drizzle
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user || !['ADMIN', 'BOARD', 'COMMITTEE'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { notes } = await request.json();

    // Update listing with Drizzle
    await db
      .update(communityServiceListings)
      .set({
        status: 'ACTIVE',
        isPublished: true,
        moderatedBy: session.user.id,
        moderatedAt: new Date(),
        moderationNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(communityServiceListings.id, id));

    // Fetch updated listing
    const [listing] = await db
      .select()
      .from(communityServiceListings)
      .where(eq(communityServiceListings.id, id))
      .limit(1);

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

    // Check if user is admin using Drizzle
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user || !['ADMIN', 'BOARD', 'COMMITTEE'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { reason, notes } = await request.json();

    // Update listing with Drizzle
    await db
      .update(communityServiceListings)
      .set({
        status: 'WITHDRAWN',
        isPublished: false,
        moderatedBy: session.user.id,
        moderatedAt: new Date(),
        moderationNotes: `${reason}: ${notes}`,
        updatedAt: new Date(),
      })
      .where(eq(communityServiceListings.id, id));

    // Fetch updated listing
    const [listing] = await db
      .select()
      .from(communityServiceListings)
      .where(eq(communityServiceListings.id, id))
      .limit(1);

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

    // Check if user is admin using Drizzle
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user || !['ADMIN', 'BOARD'].includes(user.role)) {
      return NextResponse.json({ error: 'Board/Admin access required' }, { status: 403 });
    }

    const { reason } = await request.json();

    // Update listing with Drizzle (soft delete)
    await db
      .update(communityServiceListings)
      .set({
        status: 'WITHDRAWN',
        isPublished: false,
        moderatedBy: session.user.id,
        moderatedAt: new Date(),
        moderationNotes: `REMOVED: ${reason}`,
        updatedAt: new Date(),
      })
      .where(eq(communityServiceListings.id, id));

    return NextResponse.json({
      success: true,
      message: 'Listing removed from marketplace',
    });
  } catch (error) {
    console.error('Community service listing removal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
