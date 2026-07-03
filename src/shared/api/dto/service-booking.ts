import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { serviceBookings } from '../db';

const dateSch = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));

export const serviceBookingDto = createSelectSchema(serviceBookings, {
  price: z
    .number()
    .nullable()
    .transform(v => v ?? 0),
  platformFee: z
    .number()
    .nullable()
    .transform(v => v ?? 0),
  date: dateSch,
  createdAt: dateSch,
  updatedAt: dateSch,
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

export type ServiceBookingDto = z.infer<typeof serviceBookingDto>;
