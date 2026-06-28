import { z } from 'zod';

const dateSchema = z.date().transform(d => d.toISOString());

export const listingDto = z.object({
  id: z.string(),
  providerId: z.string(),
  providerType: z.string(),
  title: z.unknown(),
  description: z.unknown().nullable(),
  category: z.string(),
  subcategory: z.string().nullable(),
  priceType: z.string(),
  price: z.number().nullable(),
  currency: z.string(),
  serviceAreas: z.array(z.string()),
  responseTime: z.number(),
  contactMethods: z.array(z.string()),
  images: z.array(z.string()),
  rating: z.number(),
  reviewCount: z.number(),
  verified: z.boolean(),
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
  status: z.string(),
  slug: z.string().nullable(),
  locale: z.string(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

export const reviewDto = z.object({
  id: z.string(),
  listingId: z.string(),
  rating: z.number(),
  title: z.string().nullable(),
  comment: z.string().nullable(),
  serviceDate: dateSchema.nullable(),
  responseQuality: z.number().nullable(),
  isPublished: z.boolean(),
  createdAt: dateSchema,
  reviewer: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .optional(),
});

export const serviceBookingDto = z.object({
  id: z.string(),
  listingId: z.string(),
  providerId: z.string(),
  userId: z.string(),
  date: dateSchema,
  startTime: z.string(),
  endTime: z.string(),
  price: z.number(),
  platformFee: z.number(),
  paymentStatus: z.string(),
  status: z.string(),
  listingTitle: z.string().nullable().optional(),
  listingCategory: z.string().nullable().optional(),
  userName: z.string().nullable().optional(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

export const urgencyDto = z.object({
  commandBar: z.object({
    openMaintenance: z.number(),
    upcomingBookings: z.number(),
  }),
  domainBadges: z.object({
    maintenance: z.number(),
    bookings: z.number(),
    amenities: z.number(),
    'my-services': z.number(),
    events: z.number(),
  }),
});

export type ListingDto = z.infer<typeof listingDto>;
export type ReviewDto = z.infer<typeof reviewDto>;
export type ServiceBookingDto = z.infer<typeof serviceBookingDto>;
export type UrgencyDto = z.infer<typeof urgencyDto>;
