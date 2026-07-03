import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { communityServiceReviews } from '../db';

const dateSch = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));
const nullDate = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : null));

export const reviewDto = createSelectSchema(communityServiceReviews, {
  serviceDate: nullDate,
  createdAt: dateSch,
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

export type ReviewDto = z.infer<typeof reviewDto>;
