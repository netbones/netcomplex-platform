import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { communityServiceListings } from '@/db/schema/community-service-listings';
import { communityServiceReviews } from '@/db/schema/community-service-reviews';
import { serviceBookings } from '@/db/schema/service-bookings';

const dateSchema = z.date().transform(d => d.toISOString());

export const listingDto = createSelectSchema(communityServiceListings, {
  price: z.number().nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
}).pick({
  id: true,
  providerId: true,
  providerType: true,
  title: true,
  description: true,
  category: true,
  subcategory: true,
  priceType: true,
  price: true,
  currency: true,
  serviceAreas: true,
  responseTime: true,
  contactMethods: true,
  images: true,
  rating: true,
  reviewCount: true,
  verified: true,
  isPublished: true,
  isFeatured: true,
  status: true,
  slug: true,
  locale: true,
  createdAt: true,
  updatedAt: true,
});

export const reviewDto = createSelectSchema(communityServiceReviews, {
  serviceDate: dateSchema.nullable(),
  createdAt: dateSchema,
})
  .pick({
    id: true,
    listingId: true,
    rating: true,
    title: true,
    comment: true,
    serviceDate: true,
    responseQuality: true,
    isPublished: true,
    createdAt: true,
  })
  .extend({
    reviewer: z.object({ id: z.string(), name: z.string() }).optional(),
  });

export const serviceBookingDto = createSelectSchema(serviceBookings, {
  price: z
    .number()
    .nullable()
    .transform(v => v ?? 0),
  platformFee: z
    .number()
    .nullable()
    .transform(v => v ?? 0),
  date: dateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
})
  .pick({
    id: true,
    listingId: true,
    providerId: true,
    userId: true,
    date: true,
    startTime: true,
    endTime: true,
    price: true,
    platformFee: true,
    paymentStatus: true,
    status: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    listingTitle: z.string().nullable().optional(),
    listingCategory: z.string().nullable().optional(),
    userName: z.string().nullable().optional(),
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
