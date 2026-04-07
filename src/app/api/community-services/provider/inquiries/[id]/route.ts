import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// Drizzle imports
import { db, communityServiceInquiries, communityServiceListings, users } from '@/lib/db';
import { eq, and, sql, inArray, desc } from 'drizzle-orm';
import { withTenant } from '@/lib/tenant/with-tenant';

/**
 * GET /api/community-services/provider/inquiries - Get inquiries for provider's listings
 */
export async function GET(request: NextRequest) {
  try {
    // Enforce tenant isolation
    const { tenantId } = await withTenant();

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

    // Get all listing IDs for this provider using Drizzle (with tenant filter)
    const providerListings = await db
      .select({ id: communityServiceListings.id })
      .from(communityServiceListings)
      .where(
        and(
          eq(communityServiceListings.providerId, session.user.id),
          eq(communityServiceListings.tenantId, tenantId)
        )
      );

    const listingIds = providerListings.map(l => l.id);

    if (listingIds.length === 0) {
      return NextResponse.json({
        inquiries: [],
        pagination: { total: 0, limit, offset, hasMore: false },
      });
    }

    // Build conditions
    const conditions = [inArray(communityServiceInquiries.listingId, listingIds)];

    if (status && status !== 'ALL') {
      conditions.push(eq(communityServiceInquiries.status, status as any));
    }

    // Get inquiries using Drizzle
    const inquiries = await db
      .select({
        id: communityServiceInquiries.id,
        listingId: communityServiceInquiries.listingId,
        inquirerId: communityServiceInquiries.inquirerId,
        serviceType: communityServiceInquiries.serviceType,
        preferredDate: communityServiceInquiries.preferredDate,
        preferredTime: communityServiceInquiries.preferredTime,
        location: communityServiceInquiries.location,
        description: communityServiceInquiries.description,
        contactMethod: communityServiceInquiries.contactMethod,
        status: communityServiceInquiries.status,
        providerResponse: communityServiceInquiries.providerResponse,
        respondedAt: communityServiceInquiries.respondedAt,
        createdAt: communityServiceInquiries.createdAt,
        listing: {
          id: communityServiceListings.id,
          title: communityServiceListings.title,
          category: communityServiceListings.category,
        },
        inquirer: {
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
        },
      })
      .from(communityServiceInquiries)
      .leftJoin(
        communityServiceListings,
        eq(communityServiceInquiries.listingId, communityServiceListings.id)
      )
      .leftJoin(users, eq(communityServiceInquiries.inquirerId, users.id))
      .where(and(...conditions))
      .orderBy(desc(communityServiceInquiries.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityServiceInquiries)
      .where(and(...conditions));

    const total = totalResult?.count || 0;

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

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { response, status } = await request.json();

    // Check if inquiry exists and belongs to provider's listing using Drizzle (with tenant filter)
    const [inquiry] = await db
      .select({
        id: communityServiceInquiries.id,
        listingId: communityServiceInquiries.listingId,
      })
      .from(communityServiceInquiries)
      .innerJoin(
        communityServiceListings,
        and(
          eq(communityServiceInquiries.listingId, communityServiceListings.id),
          eq(communityServiceListings.tenantId, tenantId)
        )
      )
      .where(eq(communityServiceInquiries.id, id))
      .limit(1);

    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    // Get listing to check ownership (with tenant filter)
    const [listing] = await db
      .select({ providerId: communityServiceListings.providerId })
      .from(communityServiceListings)
      .where(
        and(
          eq(communityServiceListings.id, inquiry.listingId),
          eq(communityServiceListings.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!listing || listing.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update inquiry with Drizzle
    await db
      .update(communityServiceInquiries)
      .set({
        providerResponse: response,
        status: status || 'RESPONDED',
        respondedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(communityServiceInquiries.id, id));

    // Fetch updated inquiry
    const [updatedInquiry] = await db
      .select({
        id: communityServiceInquiries.id,
        listingId: communityServiceInquiries.listingId,
        inquirerId: communityServiceInquiries.inquirerId,
        serviceType: communityServiceInquiries.serviceType,
        preferredDate: communityServiceInquiries.preferredDate,
        preferredTime: communityServiceInquiries.preferredTime,
        location: communityServiceInquiries.location,
        description: communityServiceInquiries.description,
        contactMethod: communityServiceInquiries.contactMethod,
        status: communityServiceInquiries.status,
        providerResponse: communityServiceInquiries.providerResponse,
        respondedAt: communityServiceInquiries.respondedAt,
        createdAt: communityServiceInquiries.createdAt,
        listing: {
          id: communityServiceListings.id,
          title: communityServiceListings.title,
        },
        inquirer: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(communityServiceInquiries)
      .leftJoin(
        communityServiceListings,
        eq(communityServiceInquiries.listingId, communityServiceListings.id)
      )
      .leftJoin(users, eq(communityServiceInquiries.inquirerId, users.id))
      .where(eq(communityServiceInquiries.id, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      inquiry: updatedInquiry,
    });
  } catch (error) {
    console.error('Community service inquiry response error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
