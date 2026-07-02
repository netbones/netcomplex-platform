import { z } from 'zod';
import {
  communityServiceListings,
  communityServiceReviews,
  db,
  notDeleted,
  now,
  settings,
} from '@api/server';
import { TRPCError } from '@trpc/server';
import { eq, and, isNull, sql } from 'drizzle-orm';

export const DEFAULT_SERVICE_CATEGORIES = {
  COMMUNITY: [
    'TUTORING',
    'PET_CARE',
    'CHILDCARE',
    'TRANSPORT',
    'HEALTH_WELLNESS',
    'TECHNOLOGY',
    'CREATIVE_ARTS',
    'HOME_HELP',
    'LEGAL_FINANCIAL',
    'OTHER',
  ],
  THIRD_PARTY: [
    'GARDENING',
    'MAINTENANCE',
    'PLUMBING',
    'ELECTRICAL',
    'CLEANING',
    'SECURITY',
    'PEST_CONTROL',
    'APPLIANCE_REPAIR',
    'OTHER',
  ],
} as const;

export const SERVICE_CATEGORIES = DEFAULT_SERVICE_CATEGORIES;

export async function getServiceCategories(
  tenantId: string
): Promise<typeof DEFAULT_SERVICE_CATEGORIES> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.tenantId, tenantId), eq(settings.key, 'marketplace_service_categories')))
    .limit(1);
  if (row) {
    try {
      const parsed = JSON.parse(row.value);
      if (
        parsed &&
        typeof parsed === 'object' &&
        'COMMUNITY' in parsed &&
        'THIRD_PARTY' in parsed
      ) {
        return parsed as typeof DEFAULT_SERVICE_CATEGORIES;
      }
    } catch {
      /* fall through to default */
    }
  }
  return DEFAULT_SERVICE_CATEGORIES;
}

export const PriceTypeEnum = z.enum(['FIXED', 'HOURLY', 'QUOTE', 'FREE']);
export const ListingStatusEnum = z.enum([
  'DRAFT',
  'ACTIVE',
  'PENDING',
  'SOLD',
  'RENTED',
  'WITHDRAWN',
]);
export const InquiryStatusEnum = z.enum([
  'PENDING',
  'RESPONDED',
  'ACCEPTED',
  'DECLINED',
  'COMPLETED',
  'CANCELLED',
]);
export const ProviderTypeEnum = z.enum(['COMMUNITY', 'THIRD_PARTY']);

export const PaginationInput = z
  .object({
    limit: z.number().int().positive().default(20),
    offset: z.number().int().min(0).default(0),
  })
  .optional()
  .default({ limit: 20, offset: 0 });

export const IdInput = z.object({ id: z.string() });

export const LocaleInput = z.object({
  id: z.string(),
  locale: z.string().optional(),
});

// ──────────────────────────────────────────
// Listing Schemas
// ──────────────────────────────────────────

export const ListListingsInput = z
  .object({
    category: z.string().optional(),
    search: z.string().optional(),
    verified: z.boolean().optional(),
    featured: z.boolean().optional(),
    providerId: z.string().optional(),
    minRating: z.number().min(0).max(5).optional(),
    priceType: PriceTypeEnum.optional(),
    locale: z.string().optional(),
    limit: z.number().int().positive().default(20),
    offset: z.number().int().min(0).default(0),
  })
  .optional()
  .default({ limit: 20, offset: 0 });

export const CreateListingInput = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  providerType: ProviderTypeEnum.default('COMMUNITY'),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  priceType: PriceTypeEnum,
  price: z.number().positive().optional(),
  currency: z.string().default('ZAR'),
  serviceAreas: z.array(z.string()).default([]),
  availability: z.any().optional(),
  licenseNumber: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  responseTime: z.number().int().positive().default(24),
  contactMethods: z.array(z.string()).default(['PLATFORM_MESSAGE']),
  images: z.array(z.string()).default([]),
  portfolio: z.array(z.string()).default([]),
  termsAndConditions: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  locale: z.string().default('en'),
});

export const UpdateListingInput = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  priceType: PriceTypeEnum.optional(),
  price: z.number().positive().optional(),
  currency: z.string().optional(),
  serviceAreas: z.array(z.string()).optional(),
  availability: z.any().optional(),
  licenseNumber: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  responseTime: z.number().int().positive().optional(),
  contactMethods: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  portfolio: z.array(z.string()).optional(),
  termsAndConditions: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  locale: z.string().optional(),
});

export const PublishListingInput = z.object({
  id: z.string(),
  publish: z.boolean(),
});

// ──────────────────────────────────────────
// Inquiry Schemas
// ──────────────────────────────────────────

export const CreateInquiryInput = z.object({
  listingId: z.string().min(1),
  serviceType: z.string().optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  location: z.string().optional(),
  description: z.string().min(1),
  contactMethod: z.string().default('PLATFORM_MESSAGE'),
});

export const ListInquiriesInput = z
  .object({
    status: z.string().optional(),
    limit: z.number().int().positive().default(20),
    offset: z.number().int().min(0).default(0),
  })
  .optional()
  .default({ limit: 20, offset: 0 });

export const RespondToInquiryInput = z.object({
  id: z.string(),
  response: z.string().optional(),
  status: InquiryStatusEnum.optional(),
});

// ──────────────────────────────────────────
// Review Schemas
// ──────────────────────────────────────────

export const ListReviewsInput = z.object({
  listingId: z.string().min(1),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().min(0).default(0),
});

export const CreateReviewInput = z.object({
  listingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().optional(),
  serviceDate: z.string().optional(),
  responseQuality: z.number().int().min(1).max(5).optional(),
});

// ──────────────────────────────────────────
// Moderation Schemas
// ──────────────────────────────────────────

export const ModerateListingInput = z.object({
  id: z.string(),
  status: ListingStatusEnum,
  isPublished: z.boolean().optional(),
  notes: z.string().optional(),
});

export const ListModerationInput = z
  .object({
    status: z.string().optional(),
    limit: z.number().int().positive().default(20),
    offset: z.number().int().min(0).default(0),
  })
  .optional()
  .default({ limit: 20, offset: 0 });

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

export function resolveLocaleText(
  value: Record<string, string> | string | null | undefined,
  preferredLocale: string
): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[preferredLocale] || Object.values(value)[0] || '';
}

/** Verify a listing exists in the user's tenant */
export async function getTenantListing(listingId: string, tenantId: string) {
  const [listing] = await db
    .select()
    .from(communityServiceListings)
    .where(
      and(
        eq(communityServiceListings.id, listingId),
        eq(communityServiceListings.tenantId, tenantId),
        notDeleted(communityServiceListings)
      )
    );
  if (!listing) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found' });
  }
  return listing;
}

/** Update a listing's aggregate rating from its published reviews */
export async function updateListingRating(listingId: string, tenantId: string) {
  const [ratingStats] = await db
    .select({
      avgRating: sql<number>`avg(${communityServiceReviews.rating})`,
      reviewCount: sql<number>`count(*)`,
    })
    .from(communityServiceReviews)
    .where(
      and(
        eq(communityServiceReviews.listingId, listingId),
        eq(communityServiceReviews.isPublished, true)
      )
    );

  await db
    .update(communityServiceListings)
    .set({
      rating: Number(ratingStats?.avgRating) || 0,
      reviewCount: ratingStats?.reviewCount || 0,
      updatedAt: now(),
    })
    .where(
      and(
        eq(communityServiceListings.id, listingId),
        eq(communityServiceListings.tenantId, tenantId)
      )
    );
}
