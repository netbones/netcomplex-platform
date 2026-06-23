import { NextRequest } from 'next/server';
import {
  apiInternalError,
  apiSuccess,
  communityServiceInquiries,
  communityServiceListings,
  communityServiceReviews,
  db,
} from '@api/server';
import { requireProviderAccess } from '@shared/api';
import { logError } from '@shared/lib';
import { and, desc, eq, gte, inArray, isNull, sql } from 'drizzle-orm';

export const maxDuration = 8;

type SupportedPeriod = '7d' | '30d' | '90d' | 'all';

function getPeriodStart(period: SupportedPeriod): Date | null {
  const current = new Date();

  switch (period) {
    case '7d':
      return new Date(current.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(current.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(current.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

function getVisibility(displayStatus: string): 'full' | 'limited' | 'minimal' | 'none' {
  switch (displayStatus) {
    case 'VERIFIED':
      return 'full';
    case 'PROBATION':
      return 'limited';
    case 'SUSPENDED':
      return 'none';
    default:
      return 'minimal';
  }
}

export async function GET(request: NextRequest) {
  try {
    const providerAccess = await requireProviderAccess(request);
    if ('status' in providerAccess) {
      return providerAccess;
    }

    const { auth, tenantId, verification, reputation } = providerAccess;
    const searchParams = new URL(request.url).searchParams;
    const requestedPeriod = (searchParams.get('period') ?? '30d') as SupportedPeriod;
    const period: SupportedPeriod = ['7d', '30d', '90d', 'all'].includes(requestedPeriod)
      ? requestedPeriod
      : '30d';
    const periodStart = getPeriodStart(period);

    const listingRows = await db
      .select({
        id: communityServiceListings.id,
        category: communityServiceListings.category,
        status: communityServiceListings.status,
        isPublished: communityServiceListings.isPublished,
        verified: communityServiceListings.verified,
        rating: communityServiceListings.rating,
        reviewCount: communityServiceListings.reviewCount,
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

    const listingIds = listingRows.map(row => row.id);
    const listingsCount = listingRows.length;
    const activeListingsCount = listingRows.filter(
      row => row.isPublished && row.status === 'ACTIVE'
    ).length;
    const reviewSummaryFromListings = listingRows.reduce(
      (acc, row) => ({
        reviewCount: acc.reviewCount + (row.reviewCount ?? 0),
        ratingTotal: acc.ratingTotal + (row.rating ?? 0) * (row.reviewCount ?? 0),
      }),
      { reviewCount: 0, ratingTotal: 0 }
    );

    if (verification.displayStatus === 'SUSPENDED') {
      return apiSuccess({
        period,
        analyticsVisibility: 'none',
        verificationStatus: verification.displayStatus,
        verification,
        reputationScore: reputation.totalScore,
        listingsCount,
        activeListingsCount,
        inquiriesCount: 0,
        avgRating:
          reviewSummaryFromListings.reviewCount > 0
            ? Number(
                (
                  reviewSummaryFromListings.ratingTotal / reviewSummaryFromListings.reviewCount
                ).toFixed(2)
              )
            : 0,
        totalViews: 0,
        reviewSummary: {
          averageRating:
            reviewSummaryFromListings.reviewCount > 0
              ? Number(
                  (
                    reviewSummaryFromListings.ratingTotal / reviewSummaryFromListings.reviewCount
                  ).toFixed(2)
                )
              : 0,
          reviewCount: reviewSummaryFromListings.reviewCount,
        },
        inquiriesSummary: {
          pending: 0,
          responded: 0,
        },
        reputationProgress: reputation,
        limited: true,
        suspensionNotice: 'Provider analytics are unavailable while the provider is suspended.',
      });
    }

    let inquiriesCount = 0;
    let pendingInquiriesCount = 0;
    let respondedInquiriesCount = 0;
    let reviewCount = reviewSummaryFromListings.reviewCount;
    let averageRating =
      reviewSummaryFromListings.reviewCount > 0
        ? Number(
            (reviewSummaryFromListings.ratingTotal / reviewSummaryFromListings.reviewCount).toFixed(
              2
            )
          )
        : 0;

    if (listingIds.length > 0) {
      const inquiryFilters = [
        eq(communityServiceInquiries.tenantId, tenantId),
        inArray(communityServiceInquiries.listingId, listingIds),
      ];

      if (periodStart) {
        inquiryFilters.push(gte(communityServiceInquiries.createdAt, periodStart));
      }

      const [inquiryStats] = await db
        .select({
          total: sql<number>`count(*)`,
          pending: sql<number>`sum(case when ${communityServiceInquiries.status} = 'PENDING' then 1 else 0 end)`,
          responded: sql<number>`sum(case when ${communityServiceInquiries.respondedAt} is not null then 1 else 0 end)`,
        })
        .from(communityServiceInquiries)
        .where(and(...inquiryFilters));

      inquiriesCount = inquiryStats?.total ?? 0;
      pendingInquiriesCount = inquiryStats?.pending ?? 0;
      respondedInquiriesCount = inquiryStats?.responded ?? 0;

      const reviewFilters = [
        eq(communityServiceReviews.tenantId, tenantId),
        inArray(communityServiceReviews.listingId, listingIds),
        eq(communityServiceReviews.isPublished, true),
      ];

      if (periodStart) {
        reviewFilters.push(gte(communityServiceReviews.createdAt, periodStart));
      }

      const [reviewStats] = await db
        .select({
          averageRating: sql<number>`avg(${communityServiceReviews.rating})`,
          reviewCount: sql<number>`count(*)`,
        })
        .from(communityServiceReviews)
        .where(and(...reviewFilters));

      reviewCount = reviewStats?.reviewCount ?? reviewCount;
      averageRating = Number((reviewStats?.averageRating ?? averageRating ?? 0).toFixed(2));
    }

    const analyticsVisibility = getVisibility(verification.displayStatus);

    return apiSuccess({
      period,
      analyticsVisibility,
      verificationStatus: verification.displayStatus,
      verification,
      reputationScore: reputation.totalScore,
      listingsCount,
      activeListingsCount,
      inquiriesCount: analyticsVisibility === 'minimal' ? 0 : inquiriesCount,
      avgRating: analyticsVisibility === 'minimal' ? 0 : averageRating,
      totalViews: 0,
      reviewSummary: {
        averageRating: analyticsVisibility === 'minimal' ? 0 : averageRating,
        reviewCount: analyticsVisibility === 'minimal' ? 0 : reviewCount,
      },
      inquiriesSummary: {
        pending: analyticsVisibility === 'minimal' ? 0 : pendingInquiriesCount,
        responded: analyticsVisibility === 'minimal' ? 0 : respondedInquiriesCount,
      },
      reputationProgress: reputation,
      limited: analyticsVisibility !== 'full',
      dataNotes:
        analyticsVisibility === 'limited'
          ? ['Probation providers see limited analytics while building trust.']
          : analyticsVisibility === 'minimal'
            ? [
                'Unverified providers only see profile-level analytics until verification progresses.',
              ]
            : [
                'Listing views tracking is not implemented yet; totalViews returns 0 in this phase.',
              ],
    });
  } catch (error) {
    logError(
      { component: 'provider-analytics-api', operation: 'GET' },
      'Provider analytics fetch error',
      error
    );
    return apiInternalError();
  }
}
