import { z } from 'zod';

const dateSchema = z.date().transform(d => d.toISOString());

export const userDto = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullable(),
  avatar: z.string().nullable(),
  role: z.string(),
  isActive: z.boolean(),
  email: z.string().optional(),
  phone: z.string().nullable().optional(),
  profileSlug: z.string().nullable().optional(),
  createdAt: z
    .date()
    .transform(d => d.toISOString())
    .optional(),
});

export const propertyDto = z.object({
  id: z.string(),
  street: z.string(),
  unit: z.string(),
  platformAddress: z.string(),
  homeImage: z.string().nullable(),
  ownerId: z.string().nullable(),
  createdAt: dateSchema.optional(),
});

export const profileDto = z.object({
  id: z.string(),
  displayName: z.string(),
  profileAddress: z.string(),
  avatar: z.string().nullable(),
  occupantImage: z.string().nullable(),
  rentalImage: z.string().nullable(),
  residencyType: z.string(),
  householdRole: z.string(),
  isPublic: z.boolean(),
  occupantSince: dateSchema.nullable().optional(),
  createdAt: dateSchema.optional(),
});

export const albumDto = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  isPublic: z.boolean(),
  mediaIds: z.array(z.string()),
  userId: z.string(),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional(),
});

export const seatDto = z.object({
  id: z.string(),
  platformAddress: z.string(),
  seatType: z.string(),
  isComplimentary: z.boolean().optional(),
  status: z.string(),
  createdAt: dateSchema.optional(),
});

export const premiumSeatDto = z.object({
  id: z.string(),
  platformAddress: z.string(),
  subscriptionTier: z.string(),
  tier: z.string(),
  maxProperties: z.number(),
  isActive: z.boolean(),
  portfolioName: z.string().nullable(),
  status: z.string(),
  messageRetentionDays: z.number(),
  createdAt: dateSchema.optional(),
});

export type UserDto = z.infer<typeof userDto>;
export type PropertyDto = z.infer<typeof propertyDto>;
export type ProfileDto = z.infer<typeof profileDto>;
export type AlbumDto = z.infer<typeof albumDto>;
export type SeatDto = z.infer<typeof seatDto>;
export type PremiumSeatDto = z.infer<typeof premiumSeatDto>;
