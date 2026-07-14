import { z } from 'zod';
import {
  router,
  tenantProcedure,
  privilegedProcedure,
  db,
  serviceProviders,
  providerMerits,
  providerLegalAgreements,
  communityServiceListings,
  communityServiceInquiries,
  communityServiceReviews,
  sendEmail,
  toEnvelope,
  notDeleted,
  now,
} from '@api/server';
import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';
import { createId } from '@shared/lib/id';
import { and, eq, desc, gte, inArray, sql } from 'drizzle-orm';
import {
  getProviderRecordForUser,
  upsertProviderVerification,
  findProviderDuplicateByCompanyName,
  getProviderLegalAgreementStatus,
  getProviderDueDiligenceSnapshot,
  getProviderVerificationSnapshot,
  getProviderReputationSnapshot,
} from '@shared/api';
import {
  providerRegistrationSchema,
  providerLegalAcceptanceSchema,
  PROVIDER_LEGAL_DOCUMENTS,
  createDueDiligenceRegistrationNote,
  getAcceptedLegalDocuments,
} from '@shared/lib/providers/registration';
import type { ProviderVerificationStatus } from '@shared/api';

async function recordLegalForProvider(params: {
  tenantId: string;
  providerId: string;
  legalAgreements: { tos?: boolean; privacy?: boolean; codeOfConduct?: boolean };
}) {
  const acceptedDocuments = getAcceptedLegalDocuments(
    params.legalAgreements as { tos: boolean; privacy: boolean; codeOfConduct: boolean }
  );
  const timestamp = now();

  const existingRows = await db
    .select({
      agreementType: providerLegalAgreements.agreementType,
      version: providerLegalAgreements.version,
    })
    .from(providerLegalAgreements)
    .where(
      and(
        eq(providerLegalAgreements.tenantId, params.tenantId),
        eq(providerLegalAgreements.providerId, params.providerId)
      )
    );

  const existingKeys = new Set(existingRows.map(row => `${row.agreementType}:${row.version}`));

  const newRows = acceptedDocuments
    .filter(document => !existingKeys.has(`${document.agreementType}:${document.version}`))
    .map(document => ({
      id: createId(),
      providerId: params.providerId,
      tenantId: params.tenantId,
      agreementType: document.agreementType,
      version: document.version,
      acceptedAt: timestamp,
      ipAddress: null,
      userAgent: null,
      createdAt: timestamp,
    }));

  if (newRows.length > 0) {
    await db.insert(providerLegalAgreements).values(newRows);
  }

  return getProviderLegalAgreementStatus(params.tenantId, params.providerId);
}

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

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

async function requireProviderFromContext(ctx: { userId: string; role: string; tenantId: string }) {
  const userId = ctx.userId;

  const [provider] = await db
    .select()
    .from(serviceProviders)
    .where(
      and(
        eq(serviceProviders.tenantId, ctx.tenantId),
        eq(serviceProviders.userId, userId),
        notDeleted(serviceProviders)
      )
    )
    .limit(1);

  return provider ?? null;
}

async function requireProviderAccess(ctx: { userId: string; role: string; tenantId: string }) {
  const providerRecord = await requireProviderFromContext(ctx);
  const hasListing = await db
    .select({ id: communityServiceListings.id })
    .from(communityServiceListings)
    .where(
      and(
        eq(communityServiceListings.tenantId, ctx.tenantId),
        eq(communityServiceListings.providerId, ctx.userId),
        notDeleted(communityServiceListings)
      )
    )
    .limit(1);

  const hasRoleAccess = hasPermission(ctx.role, 'providers');
  if (!hasRoleAccess && !providerRecord && hasListing.length === 0) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Provider access required' });
  }

  const verification = await getProviderVerificationSnapshot(
    ctx.tenantId,
    providerRecord?.id ?? null
  );

  if (providerRecord && verification.isSuspended) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Your provider account has been suspended. Contact your community administrator.',
    });
  }

  const reputation = await getProviderReputationSnapshot(
    ctx.tenantId,
    providerRecord?.id ?? null,
    verification.verificationThreshold
  );

  return { providerRecord, verification, reputation };
}

export const providersRouter = router({
  validateRegistration: tenantProcedure
    .input(
      z.object({
        email: z.string().email(),
        companyName: z.string().min(1),
      })
    )
    .meta({
      openapi: { method: 'POST', path: '/providers/validate', protect: true, tags: ['providers'] },
    })
    .mutation(async ({ input, ctx }) => {
      const canRegister =
        hasPermission(ctx.role, 'directory') || hasPermission(ctx.role, 'providers');
      if (!canRegister) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Directory or provider access is required',
        });
      }

      const requestedEmail = input.email.trim().toLowerCase();
      const duplicate = await findProviderDuplicateByCompanyName(ctx.tenantId, input.companyName);

      return toEnvelope({
        canSubmit: !duplicate && requestedEmail === ctx.session.user.email.trim().toLowerCase(),
        emailMatchesAccount: requestedEmail === ctx.session.user.email.trim().toLowerCase(),
        companyAvailable: !duplicate,
        duplicateCompanyName: duplicate?.companyName ?? null,
      });
    }),

  registerProvider: tenantProcedure
    .input(providerRegistrationSchema)
    .meta({
      openapi: { method: 'POST', path: '/providers/register', protect: true, tags: ['providers'] },
    })
    .mutation(async ({ input, ctx }) => {
      const canRegister =
        hasPermission(ctx.role, 'directory') || hasPermission(ctx.role, 'providers');
      if (!canRegister) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Directory or provider access is required',
        });
      }

      const sessionEmail = ctx.session.user.email.trim().toLowerCase();
      if (input.email.trim().toLowerCase() !== sessionEmail) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Registration email must match your signed-in account email',
        });
      }

      const existingLinkedProvider = await getProviderRecordForUser(ctx.tenantId, sessionEmail);
      if (existingLinkedProvider) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A provider profile is already linked to this account',
        });
      }

      const duplicate = await findProviderDuplicateByCompanyName(ctx.tenantId, input.companyName);
      if (duplicate) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Company already registered',
        });
      }

      const timestamp = now();
      const providerId = createId();

      const [provider] = await db
        .insert(serviceProviders)
        .values({
          id: providerId,
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          companyName: input.companyName,
          contactName: input.contactName,
          phone: input.phone ?? null,
          email: input.email,
          trade: input.trade ?? 'GENERAL',
          website: input.website ?? null,
          isActive: false,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning();

      const verificationStatus: ProviderVerificationStatus = 'PROBATION';
      const verification = await upsertProviderVerification({
        tenantId: ctx.tenantId,
        providerId,
        status: verificationStatus,
        notes: createDueDiligenceRegistrationNote(input.website),
        startDate: timestamp,
        verificationThreshold: 300,
        probationThreshold: 0,
      });

      const legalStatus = await recordLegalForProvider({
        tenantId: ctx.tenantId,
        providerId,
        legalAgreements: input.legalAgreements,
      });

      const dueDiligence = await getProviderDueDiligenceSnapshot(
        ctx.tenantId,
        providerId,
        verificationStatus
      );

      void sendEmail({
        to: input.email,
        subject: 'Provider Registration Received',
        html: `<p>Thank you for registering as a provider, <strong>${input.companyName}</strong>.</p><p>Your registration is under review. We will notify you once your verification is complete.</p>`,
      });

      return toEnvelope({
        provider,
        verification,
        legalStatus,
        dueDiligence,
        website: input.website ?? null,
      });
    }),

  getLegalDocuments: tenantProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/providers/legal',
        protect: false,
        tags: ['providers'],
      },
    })
    .query(async ({ ctx }) => {
      const sessionEmail = ctx.session?.user?.email ?? null;
      const providerRecord = sessionEmail
        ? await getProviderRecordForUser(ctx.tenantId, sessionEmail)
        : null;
      const legalStatus = await getProviderLegalAgreementStatus(
        ctx.tenantId,
        providerRecord?.id ?? null
      );

      return toEnvelope({
        providerRecordExists: Boolean(providerRecord),
        documents:
          legalStatus.documents.length > 0 ? legalStatus.documents : PROVIDER_LEGAL_DOCUMENTS,
        acceptedAgreementCount: legalStatus.acceptedAgreementCount,
        allAccepted: legalStatus.allAccepted,
      });
    }),

  acceptLegalAgreements: tenantProcedure
    .input(providerLegalAcceptanceSchema)
    .meta({
      openapi: {
        method: 'POST',
        path: '/providers/legal/accept',
        protect: true,
        tags: ['providers'],
      },
    })
    .mutation(async ({ input, ctx }) => {
      const sessionEmail = ctx.session.user.email;
      const providerRecord = await getProviderRecordForUser(ctx.tenantId, sessionEmail);
      if (!providerRecord) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Linked provider profile not found',
        });
      }

      const legalStatus = await recordLegalForProvider({
        tenantId: ctx.tenantId,
        providerId: providerRecord.id,
        legalAgreements: input,
      });

      return toEnvelope(legalStatus);
    }),

  getVerificationStatus: tenantProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/providers/verification',
        protect: true,
        tags: ['providers'],
      },
    })
    .query(async ({ ctx }) => {
      const { providerRecord, verification, reputation } = await requireProviderAccess(ctx);

      return toEnvelope({
        providerRecordExists: Boolean(providerRecord),
        verificationStatus: verification.displayStatus,
        verification,
        reputationProgress: reputation,
      });
    }),

  updateVerification: privilegedProcedure
    .input(
      z.object({
        providerId: z.string(),
        status: z.enum(['PENDING', 'PROBATION', 'VERIFIED', 'SUSPENDED']),
        notes: z.string().nullable().optional(),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
        verificationThreshold: z.number().optional(),
        probationThreshold: z.number().optional(),
      })
    )
    .meta({
      openapi: {
        method: 'PATCH',
        path: '/providers/verification',
        protect: true,
        tags: ['providers'],
      },
    })
    .mutation(async ({ input, ctx }) => {
      if (!hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin permission required' });
      }

      const [providerRecord] = await db
        .select({ id: serviceProviders.id, companyName: serviceProviders.companyName })
        .from(serviceProviders)
        .where(
          and(
            eq(serviceProviders.tenantId, ctx.tenantId),
            eq(serviceProviders.id, input.providerId),
            notDeleted(serviceProviders)
          )
        )
        .limit(1);

      if (!providerRecord) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
      }

      const verification = await upsertProviderVerification({
        tenantId: ctx.tenantId,
        providerId: input.providerId,
        status: input.status,
        notes: input.notes ?? null,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : null,
        verificationThreshold: input.verificationThreshold,
        probationThreshold: input.probationThreshold,
      });

      return toEnvelope({
        provider: providerRecord,
        verification,
      });
    }),

  getReputation: tenantProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/providers/reputation',
        protect: true,
        tags: ['providers'],
      },
    })
    .query(async ({ ctx }) => {
      const { providerRecord, verification, reputation } = await requireProviderAccess(ctx);

      if (!providerRecord) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Provider registration is not complete for this account',
        });
      }

      const merits = await db
        .select()
        .from(providerMerits)
        .where(
          and(
            eq(providerMerits.tenantId, ctx.tenantId),
            eq(providerMerits.providerId, providerRecord.id)
          )
        )
        .orderBy(desc(providerMerits.createdAt));

      return toEnvelope({
        verificationStatus: verification.displayStatus,
        reputationScore: reputation.totalScore,
        progress: reputation,
        verification,
        eligibleForVerification: reputation.totalScore >= verification.verificationThreshold,
        band:
          reputation.totalScore >= verification.verificationThreshold
            ? 'VERIFIED_CANDIDATE'
            : reputation.totalScore >= 100
              ? 'EMERGING'
              : 'PROBATION',
        merits: merits.slice(0, 10).map(merit => ({
          id: merit.id,
          meritType: merit.meritType,
          points: merit.points,
          description: merit.description,
          referenceId: merit.referenceId,
          createdAt: merit.createdAt.toISOString(),
        })),
      });
    }),

  getReputationHistory: tenantProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(30),
        from: z.string().nullable().optional(),
        to: z.string().nullable().optional(),
      })
    )
    .meta({
      openapi: {
        method: 'GET',
        path: '/providers/reputation/history',
        protect: true,
        tags: ['providers'],
      },
    })
    .query(async ({ input, ctx }) => {
      const { providerRecord } = await requireProviderAccess(ctx);

      if (!providerRecord) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Provider registration is not complete for this account',
        });
      }

      const from = parseDateParam(input.from ?? null);
      const to = parseDateParam(input.to ?? null);

      const conditions = [
        eq(providerMerits.tenantId, ctx.tenantId),
        eq(providerMerits.providerId, providerRecord.id),
      ];

      if (from) conditions.push(gte(providerMerits.createdAt, from));
      if (to) conditions.push(sql`${providerMerits.createdAt} <= ${to}`);

      const merits = await db
        .select()
        .from(providerMerits)
        .where(and(...conditions))
        .orderBy(desc(providerMerits.createdAt))
        .limit(input.limit);

      return toEnvelope({
        merits: merits.map(merit => ({
          id: merit.id,
          meritType: merit.meritType,
          points: merit.points,
          description: merit.description,
          referenceId: merit.referenceId,
          createdAt: merit.createdAt.toISOString(),
        })),
      });
    }),

  getReputationScore: tenantProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/providers/reputation-score',
        protect: true,
        tags: ['providers'],
      },
    })
    .query(async ({ ctx }) => {
      const { verification, reputation } = await requireProviderAccess(ctx);

      return toEnvelope({
        verificationStatus: verification.displayStatus,
        reputationScore: reputation.totalScore,
        progress: reputation,
        verification,
      });
    }),

  getAnalytics: tenantProcedure
    .input(
      z
        .object({
          period: z.enum(['7d', '30d', '90d', 'all']).default('30d'),
        })
        .default({ period: '30d' })
    )
    .meta({
      openapi: {
        method: 'GET',
        path: '/providers/analytics',
        protect: true,
        tags: ['providers'],
      },
    })
    .query(async ({ input, ctx }) => {
      const { verification, reputation } = await requireProviderAccess(ctx);

      const periodStart = getPeriodStart(input.period);

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
            eq(communityServiceListings.tenantId, ctx.tenantId),
            eq(communityServiceListings.providerId, ctx.userId),
            notDeleted(communityServiceListings)
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
        return toEnvelope({
          period: input.period,
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
          inquiriesSummary: { pending: 0, responded: 0 },
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
              (
                reviewSummaryFromListings.ratingTotal / reviewSummaryFromListings.reviewCount
              ).toFixed(2)
            )
          : 0;

      if (listingIds.length > 0) {
        const inquiryFilters = [
          eq(communityServiceInquiries.tenantId, ctx.tenantId),
          inArray(communityServiceInquiries.listingId, listingIds),
        ];
        if (periodStart) inquiryFilters.push(gte(communityServiceInquiries.createdAt, periodStart));

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
          eq(communityServiceReviews.tenantId, ctx.tenantId),
          inArray(communityServiceReviews.listingId, listingIds),
          eq(communityServiceReviews.isPublished, true),
        ];
        if (periodStart) reviewFilters.push(gte(communityServiceReviews.createdAt, periodStart));

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

      return toEnvelope({
        period: input.period,
        analyticsVisibility: 'full',
        verificationStatus: verification.displayStatus,
        verification,
        reputationScore: reputation.totalScore,
        listingsCount,
        activeListingsCount,
        inquiriesCount,
        avgRating: averageRating,
        totalViews: 0,
        reviewSummary: { averageRating, reviewCount },
        inquiriesSummary: { pending: pendingInquiriesCount, responded: respondedInquiriesCount },
        reputationProgress: reputation,
        limited: false,
        dataNotes: [
          'Listing views tracking is not implemented yet; totalViews returns 0 in this phase.',
        ],
      });
    }),

  getDashboard: tenantProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/providers/dashboard',
        protect: true,
        tags: ['providers'],
      },
    })
    .query(async ({ ctx }) => {
      const { providerRecord, verification, reputation } = await requireProviderAccess(ctx);

      if (verification.isSuspended) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            'Your provider account has been suspended. Contact your community administrator.',
        });
      }

      if (!providerRecord) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Provider registration is not complete for this account',
        });
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
            eq(communityServiceListings.tenantId, ctx.tenantId),
            eq(communityServiceListings.providerId, ctx.userId),
            notDeleted(communityServiceListings)
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
              eq(communityServiceInquiries.tenantId, ctx.tenantId),
              inArray(communityServiceInquiries.listingId, listingIds)
            )
          );

        inquiryCount = inquiryStats?.total ?? 0;
        pendingInquiries = inquiryStats?.pending ?? 0;
      }

      const activeListings = listingRows.filter(
        listing => listing.isPublished && listing.status === 'ACTIVE'
      );

      return toEnvelope({
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
    }),
});
