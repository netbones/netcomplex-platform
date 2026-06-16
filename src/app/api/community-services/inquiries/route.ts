import { NextRequest } from 'next/server';
import {
  auth,
  db,
  communityServiceInquiries,
  communityServiceListings,
  conversations,
  conversationParticipants,
  messages,
  users,
  apiError,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
} from '@api/server';

// Drizzle imports

import { eq, desc, and, sql } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';

type InquiryStatus = (typeof communityServiceInquiries.status.enumValues)[number];

/**
 * GET /api/community-services/inquiries - Get user's inquiries (as inquirer)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    // Build conditions
    const conditions = [
      eq(communityServiceInquiries.tenantId, tenantId),
      eq(communityServiceInquiries.inquirerId, session.user.id),
    ];

    if (status && status !== 'ALL') {
      conditions.push(eq(communityServiceInquiries.status, status as InquiryStatus));
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
      })
      .from(communityServiceInquiries)
      .where(and(...conditions))
      .orderBy(desc(communityServiceInquiries.createdAt))
      .limit(limit)
      .offset(offset);

    function resolveLocaleText(
      value: Record<string, string> | null | undefined,
      preferredLocale: string
    ): string {
      if (!value || typeof value !== 'object') return '';
      return value[preferredLocale] || Object.values(value)[0] || '';
    }

    const preferredLocale =
      new URL(request.url).searchParams.get('locale') ||
      request.headers.get('accept-language')?.split(',')[0]?.split('-')[0] ||
      'en';

    // Get listing and provider info separately
    const inquiriesWithDetails = await Promise.all(
      inquiries.map(async inquiry => {
        const [listing] = await db
          .select({
            id: communityServiceListings.id,
            title: communityServiceListings.title,
            category: communityServiceListings.category,
            providerId: communityServiceListings.providerId,
          })
          .from(communityServiceListings)
          .where(eq(communityServiceListings.id, inquiry.listingId))
          .limit(1);

        let providerInfo = null;
        if (listing?.providerId) {
          const [provider] = await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
            })
            .from(users)
            .where(eq(users.id, listing.providerId))
            .limit(1);
          providerInfo = provider;
        }

        return {
          ...inquiry,
          listing: listing
            ? {
                id: listing.id,
                title: resolveLocaleText(listing.title as Record<string, string>, preferredLocale),
                category: listing.category,
              }
            : null,
          provider: providerInfo,
        };
      })
    );

    // Get total count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityServiceInquiries)
      .where(and(...conditions));

    const total = totalResult?.count || 0;

    return apiSuccess({
      inquiries: inquiriesWithDetails,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logError(
      { component: 'inquiries-api', operation: 'GET' },
      'Community service inquiries fetch error',
      error
    );
    return apiInternalError();
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
      return apiUnauthorized();
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
      return apiError('VALIDATION_ERROR', 'Listing ID and description are required', 400);
    }

    // Check if listing exists and is published using Drizzle
    const [listing] = await db
      .select({
        id: communityServiceListings.id,
        isPublished: communityServiceListings.isPublished,
        providerId: communityServiceListings.providerId,
      })
      .from(communityServiceListings)
      .where(eq(communityServiceListings.id, listingId))
      .limit(1);

    if (!listing || !listing.isPublished) {
      return apiNotFound('Service listing not found');
    }

    // Prevent self-inquiries
    if (listing.providerId === session.user.id) {
      return apiError('VALIDATION_ERROR', 'Cannot inquire about your own service', 400);
    }

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    // Create inquiry with Drizzle
    const inquiryId = crypto.randomUUID();
    const now = new Date();

    await db.insert(communityServiceInquiries).values({
      id: inquiryId,
      tenantId,
      listingId,
      inquirerId: session.user.id,
      serviceType,
      preferredDate: preferredDate ? new Date(preferredDate) : null,
      preferredTime,
      location,
      description,
      contactMethod: contactMethod || 'PLATFORM_MESSAGE',
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    });

    // Auto-create conversation if platform message is preferred
    let conversationId: string | null = null;
    if (contactMethod === 'PLATFORM_MESSAGE' && listing.providerId) {
      const participantIds = [session.user.id, listing.providerId];
      const [existingConv] = await db
        .select({ id: conversations.id })
        .from(conversations)
        .innerJoin(
          conversationParticipants,
          eq(conversations.id, conversationParticipants.conversationId)
        )
        .where(
          and(
            eq(conversations.type, 'DIRECT'),
            eq(conversations.tenantId, tenantId),
            sql`${conversationParticipants.userId} IN ${participantIds}`
          )
        )
        .having(sql`COUNT(DISTINCT ${conversationParticipants.userId}) = 2`)
        .groupBy(conversations.id)
        .limit(1);

      if (!existingConv) {
        conversationId = crypto.randomUUID();
        await db.insert(conversations).values({
          id: conversationId,
          tenantId,
          type: 'DIRECT',
          createdAt: now,
          updatedAt: now,
        });
        await db.insert(conversationParticipants).values([
          {
            id: crypto.randomUUID(),
            tenantId,
            conversationId,
            userId: session.user.id,
            joinedAt: now,
          },
          {
            id: crypto.randomUUID(),
            tenantId,
            conversationId,
            userId: listing.providerId,
            joinedAt: now,
          },
        ]);
      } else {
        conversationId = existingConv.id;
      }

      // Insert initial inquiry message
      if (conversationId) {
        await db.insert(messages).values({
          id: crypto.randomUUID(),
          tenantId,
          conversationId,
          senderId: session.user.id,
          content: description,
          type: 'TEXT',
          createdAt: now,
        });
      }
    }

    // Fetch created inquiry
    const [inquiry] = await db
      .select()
      .from(communityServiceInquiries)
      .where(eq(communityServiceInquiries.id, inquiryId))
      .limit(1);

    // Get listing details
    const [listingDetails] = await db
      .select({
        id: communityServiceListings.id,
        title: communityServiceListings.title,
        category: communityServiceListings.category,
        providerId: communityServiceListings.providerId,
      })
      .from(communityServiceListings)
      .where(eq(communityServiceListings.id, listingId))
      .limit(1);

    // Get provider info
    let providerInfo = null;
    if (listingDetails?.providerId) {
      const [provider] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, listingDetails.providerId))
        .limit(1);
      providerInfo = provider;
    }

    // Get inquirer info
    const [inquirer] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    return apiSuccess({
      success: true,
      inquiry: {
        ...inquiry,
        conversationId,
        listing: listingDetails
          ? {
              id: listingDetails.id,
              title: listingDetails.title,
              category: listingDetails.category,
            }
          : null,
        provider: providerInfo,
        inquirer: inquirer,
      },
    });
  } catch (error) {
    logError(
      { component: 'inquiries-api', operation: 'CREATE' },
      'Community service inquiry creation error',
      error
    );
    return apiInternalError();
  }
}
