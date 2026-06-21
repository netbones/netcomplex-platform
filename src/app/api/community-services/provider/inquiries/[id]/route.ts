import { NextRequest } from 'next/server';
import {
  auth,
  db,
  communityServiceInquiries,
  communityServiceListings,
  users,
  apiError,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  now,
} from '@api/server';

// Drizzle imports

import { eq, and, sql, inArray, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';

export const maxDuration = 8;

type InquiryStatus = (typeof communityServiceInquiries.status.enumValues)[number];

function resolveLocaleText(
  value: Record<string, string> | null | undefined,
  preferredLocale: string
): string {
  if (!value || typeof value !== 'object') return '';
  return value[preferredLocale] || Object.values(value)[0] || '';
}

function getPreferredLocale(request: Request): string {
  return (
    new URL(request.url).searchParams.get('locale') ||
    request.headers.get('accept-language')?.split(',')[0]?.split('-')[0] ||
    'en'
  );
}

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
      return apiUnauthorized();
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
      return apiSuccess({
        inquiries: [],
        pagination: { total: 0, limit, offset, hasMore: false },
      });
    }

    // Build conditions
    const conditions = [inArray(communityServiceInquiries.listingId, listingIds)];

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

    // Resolve locale text for listing titles
    const preferredLocale = getPreferredLocale(request);

    const localizedInquiries = inquiries.map(inquiry => ({
      ...inquiry,
      listing: inquiry.listing
        ? {
            ...inquiry.listing,
            title: resolveLocaleText(
              inquiry.listing.title as Record<string, string>,
              preferredLocale
            ),
          }
        : null,
    }));

    // Get total count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityServiceInquiries)
      .where(and(...conditions));

    const total = totalResult?.count || 0;

    return apiSuccess({
      inquiries: localizedInquiries,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logError(
      { component: 'provider-inquiries-api', operation: 'GET' },
      'Community service provider inquiries fetch error',
      error
    );
    return apiInternalError();
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
      return apiUnauthorized();
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
      return apiNotFound('Inquiry not found');
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
      return apiForbidden('Access denied');
    }

    // Update inquiry with Drizzle
    await db
      .update(communityServiceInquiries)
      .set({
        providerResponse: response,
        status: status || 'RESPONDED',
        respondedAt: now(),
        updatedAt: now(),
      })
      .where(
        and(eq(communityServiceInquiries.id, id), eq(communityServiceInquiries.tenantId, tenantId))
      );

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
      .where(
        and(eq(communityServiceInquiries.id, id), eq(communityServiceInquiries.tenantId, tenantId))
      )
      .limit(1);

    const locale = getPreferredLocale(request);
    const localizedUpdated = {
      ...updatedInquiry,
      listing: updatedInquiry?.listing
        ? {
            ...updatedInquiry.listing,
            title: resolveLocaleText(
              updatedInquiry.listing.title as Record<string, string>,
              locale
            ),
          }
        : updatedInquiry?.listing,
    };

    return apiSuccess({
      success: true,
      inquiry: localizedUpdated as Record<string, unknown>,
    });
  } catch (error) {
    logError(
      { component: 'provider-inquiries-api', operation: 'RESPOND' },
      'Community service inquiry response error',
      error
    );
    return apiInternalError();
  }
}
