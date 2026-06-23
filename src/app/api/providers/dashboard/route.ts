import { NextRequest } from 'next/server';
import {
  apiInternalError,
  apiNotFound,
  apiSuccess,
  communityServiceInquiries,
  communityServiceListings,
  db,
} from '@api/server';
import { requireProviderAccess } from '@shared/api';
import { logError } from '@shared/lib';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

export const maxDuration = 8;

function resolveTitle(title: unknown): string {
  if (typeof title === 'string') return title;
  if (title && typeof title === 'object') {
    const values = Object.values(title as Record<string, unknown>).filter(
      value => typeof value === 'string'
    ) as string[];
    return values[0] ?? 'Untitled listing';
  }

  return 'Untitled listing';
}

export async function GET(request: NextRequest) {
  try {
    const providerAccess = await requireProviderAccess(request);
    if ('status' in providerAccess) {
      return providerAccess;
    }

    const { auth, tenantId, providerRecord, verification, reputation } = providerAccess;

    if (!providerRecord) {
      return apiNotFound('Provider registration is not complete for this account');
    }

    const listingRows = await db
      .select({
        id: communityServiceListings.id,
        title: communityServiceListings.title,
        category: communityServiceListings.category,
        status: communityServiceListings.status,
        isPublished: communityServiceListings.isPublished,
        verified: communityServiceListings.verified,
        rating: communityServiceListings.rating,
        reviewCount: communityServiceListings.reviewCount,
        updatedAt: communityServiceListings.updatedAt,
      })
      .from(communityServiceListings)
      .where(
        and(
          eq(communityServiceListings.tenantId, tenantId),
          eq(communityServiceListings.providerId, auth.userId),
          isNull(communityServiceListings.deletedAt)
        )
      )
      .orderBy(desc(communityServiceListings.updatedAt));

    const listingIds = listingRows.map(listing => listing.id);

    let inquiryCount = 0;
    let pendingInquiries = 0;

    if (listingIds.length > 0) {
      const [inquiryStats] = await db
        .select({
          total: sql<number>`count(*)`,
          pending: sql<number>`sum(case when ${communityServiceInquiries.status} = 'PENDING' then 1 else 0 end)`,
        })
        .from(communityServiceInquiries)
        .where(
          and(
            eq(communityServiceInquiries.tenantId, tenantId),
            inArray(communityServiceInquiries.listingId, listingIds)
          )
        );

      inquiryCount = inquiryStats?.total ?? 0;
      pendingInquiries = inquiryStats?.pending ?? 0;
    }

    const activeListings = listingRows.filter(
      listing => listing.isPublished && listing.status === 'ACTIVE'
    );

    return apiSuccess({
      providerId: providerRecord.id,
      companyName: providerRecord.companyName,
      trade: providerRecord.trade,
      contactName: providerRecord.contactName,
      phone: providerRecord.phone,
      email: providerRecord.email,
      isActive: providerRecord.isActive,
      verificationStatus: verification.displayStatus,
      verification,
      reputationScore: reputation.totalScore,
      reputationProgress: reputation,
      listingCount: listingRows.length,
      activeListingsCount: activeListings.length,
      inquiryCount,
      pendingInquiries,
      listings: activeListings.slice(0, 5).map(listing => ({
        id: listing.id,
        title: resolveTitle(listing.title),
        category: listing.category,
        status: listing.status,
        verified: listing.verified,
        isPublished: listing.isPublished,
        rating: Number((listing.rating ?? 0).toFixed(2)),
        reviewCount: listing.reviewCount,
        updatedAt: listing.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    logError(
      { component: 'provider-dashboard-api', operation: 'GET' },
      'Provider dashboard fetch error',
      error
    );
    return apiInternalError();
  }
}
