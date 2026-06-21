import { NextRequest } from 'next/server';
import {
  auth,
  db,
  communityServiceListings,
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

type ListingStatus = (typeof communityServiceListings.status.enumValues)[number];

/**
 * GET /api/community-services/moderation/listings - Get listings requiring moderation
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
    const status = searchParams.get('status') || 'PENDING';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build conditions (with tenant filter)
    const conditions = [eq(communityServiceListings.tenantId, tenantId)];

    if (status !== 'ALL') {
      conditions.push(eq(communityServiceListings.status, status as ListingStatus));
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
      .where(and(...conditions))
      .orderBy(desc(communityServiceListings.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityServiceListings)
      .where(and(...conditions));

    const total = totalResult?.count || 0;

    return apiSuccess({
      listings,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logError(
      { component: 'moderation-api', operation: 'GET' },
      'Community services moderation listings fetch error',
      error
    );
    return apiInternalError();
  }
}

/**
 * POST /api/community-services/moderation/listings/[id]/approve - Approve a listing
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

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

    const { notes } = await request.json();

    // Update listing with Drizzle (with tenant filter)
    await db
      .update(communityServiceListings)
      .set({
        status: 'ACTIVE',
        isPublished: true,
        moderatedBy: session.user.id,
        moderatedAt: now(),
        moderationNotes: notes,
        updatedAt: now(),
      })
      .where(
        and(eq(communityServiceListings.id, id), eq(communityServiceListings.tenantId, tenantId))
      );

    // Fetch updated listing
    const [listing] = await db
      .select()
      .from(communityServiceListings)
      .where(
        and(eq(communityServiceListings.id, id), eq(communityServiceListings.tenantId, tenantId))
      )
      .limit(1);

    return apiSuccess({
      success: true,
      listing,
      message: 'Listing approved and published',
    });
  } catch (error) {
    logError(
      { component: 'moderation-api', operation: 'APPROVE' },
      'Community service listing approval error',
      error
    );
    return apiInternalError();
  }
}

/**
 * POST /api/community-services/moderation/listings/[id]/reject - Reject a listing
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

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

    const { reason, notes } = await request.json();

    // Update listing with Drizzle (with tenant filter)
    await db
      .update(communityServiceListings)
      .set({
        status: 'WITHDRAWN',
        isPublished: false,
        moderatedBy: session.user.id,
        moderatedAt: now(),
        moderationNotes: `${reason}: ${notes}`,
        updatedAt: now(),
      })
      .where(
        and(eq(communityServiceListings.id, id), eq(communityServiceListings.tenantId, tenantId))
      );

    // Fetch updated listing
    const [listing] = await db
      .select()
      .from(communityServiceListings)
      .where(
        and(eq(communityServiceListings.id, id), eq(communityServiceListings.tenantId, tenantId))
      )
      .limit(1);

    return apiSuccess({
      success: true,
      listing,
      message: 'Listing rejected',
    });
  } catch (error) {
    logError(
      { component: 'moderation-api', operation: 'REJECT' },
      'Community service listing rejection error',
      error
    );
    return apiInternalError();
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

    if (!user || !['ADMIN', 'BOARD'].includes(user.role)) {
      return apiForbidden('Board/Admin access required');
    }

    const { reason } = await request.json();

    // Update listing with Drizzle (soft delete with tenant filter)
    await db
      .update(communityServiceListings)
      .set({
        status: 'WITHDRAWN',
        isPublished: false,
        moderatedBy: session.user.id,
        moderatedAt: now(),
        moderationNotes: `REMOVED: ${reason}`,
        updatedAt: now(),
      })
      .where(
        and(eq(communityServiceListings.id, id), eq(communityServiceListings.tenantId, tenantId))
      );

    return apiSuccess({
      success: true,
      message: 'Listing removed from marketplace',
    });
  } catch (error) {
    logError(
      { component: 'moderation-api', operation: 'DELETE' },
      'Community service listing removal error',
      error
    );
    return apiInternalError();
  }
}
