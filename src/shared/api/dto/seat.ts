import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { soloSeats, premiumSeats, standardSeats } from '../db';

const dateSch = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));
const nullDate = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : null));

export const seatDto = createSelectSchema(soloSeats, {
  createdAt: dateSch,
}).pick({
  id: true,
  platformAddress: true,
  seatType: true,
  isComplimentary: true,
  status: true,
  createdAt: true,
});

export const premiumSeatDto = createSelectSchema(premiumSeats, {
  createdAt: dateSch,
}).pick({
  id: true,
  platformAddress: true,
  subscriptionTier: true,
  tier: true,
  maxProperties: true,
  isActive: true,
  portfolioName: true,
  status: true,
  messageRetentionDays: true,
  createdAt: true,
});

export const standardSeatDto = createSelectSchema(standardSeats, {
  archivedAt: nullDate,
  createdAt: dateSch,
  updatedAt: dateSch,
}).pick({
  id: true,
  userId: true,
  propertyId: true,
  isPrimaryOwner: true,
  platformAddress: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export type SeatDto = z.infer<typeof seatDto>;
export type PremiumSeatDto = z.infer<typeof premiumSeatDto>;
export type StandardSeatDto = z.infer<typeof standardSeatDto>;
