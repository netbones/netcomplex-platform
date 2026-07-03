import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { communityServiceListings } from '../db';

const dateSch = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));

export const listingDto = createSelectSchema(communityServiceListings, {
  price: z.coerce.number().nullable(),
  createdAt: dateSch,
  updatedAt: dateSch,
})
  .pick({
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
  })
  .extend({
    provider: z
      .object({
        id: z.string().optional(),
        name: z.string().optional(),
        email: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        avatar: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
  });

export type ListingDto = z.infer<typeof listingDto>;
