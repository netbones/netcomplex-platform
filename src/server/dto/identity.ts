import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { users } from '@/db/schema/users';
import { properties } from '@/db/schema/properties';
import { profiles } from '@/db/schema/profiles';
import { albums } from '@/db/schema/albums';
import { soloSeats } from '@/db/schema/solo-seats';
import { premiumSeats } from '@/db/schema/premium-seats';
import { standardSeats } from '@/db/schema/standard-seats';
import { agentAccesses } from '@/db/schema/agent-accesses';
import { platformSuspensions } from '@/db/schema/platform-suspensions';

const dateSchema = z.date().transform(d => d.toISOString());

export const userDto = createSelectSchema(users, {
  email: z.string().optional(),
  phone: z.string().nullable().optional(),
  avatar: z.string().nullable(),
  profileSlug: z.string().nullable().optional(),
  createdAt: dateSchema.optional(),
}).pick({
  id: true,
  name: true,
  image: true,
  avatar: true,
  role: true,
  isActive: true,
  email: true,
  phone: true,
  profileSlug: true,
  createdAt: true,
});

export const propertyDto = createSelectSchema(properties, {
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional(),
}).pick({
  id: true,
  street: true,
  unit: true,
  platformAddress: true,
  homeImage: true,
  ownerId: true,
  createdAt: true,
});

export const profileDto = createSelectSchema(profiles, {
  occupantSince: dateSchema.nullable().optional(),
  createdAt: dateSchema.optional(),
}).pick({
  id: true,
  displayName: true,
  profileAddress: true,
  avatar: true,
  occupantImage: true,
  rentalImage: true,
  residencyType: true,
  householdRole: true,
  isPublic: true,
  occupantSince: true,
  createdAt: true,
});

export const albumDto = createSelectSchema(albums, {
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional(),
}).pick({
  id: true,
  title: true,
  description: true,
  isPublic: true,
  mediaIds: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const seatDto = createSelectSchema(soloSeats, {
  createdAt: dateSchema.optional(),
}).pick({
  id: true,
  platformAddress: true,
  seatType: true,
  isComplimentary: true,
  status: true,
  createdAt: true,
});

export const premiumSeatDto = createSelectSchema(premiumSeats, {
  createdAt: dateSchema.optional(),
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
  archivedAt: dateSchema.nullable().optional(),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional(),
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

export const agentAccessDto = createSelectSchema(agentAccesses, {
  startedAt: dateSchema.optional(),
  expiresAt: dateSchema.optional(),
  acceptedAt: dateSchema.nullable().optional(),
  rejectedAt: dateSchema.nullable().optional(),
  revokedAt: dateSchema.nullable().optional(),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional(),
}).pick({
  id: true,
  agentId: true,
  propertyId: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
});

export const suspensionDto = createSelectSchema(platformSuspensions, {
  startDate: dateSchema.optional(),
  endDate: dateSchema.nullable().optional(),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional(),
}).pick({
  id: true,
  tenantId: true,
  userId: true,
  suspensionType: true,
  reason: true,
  description: true,
  startDate: true,
  endDate: true,
  isPermanent: true,
  isActive: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
});

export type UserDto = z.infer<typeof userDto>;
export type PropertyDto = z.infer<typeof propertyDto>;
export type ProfileDto = z.infer<typeof profileDto>;
export type AlbumDto = z.infer<typeof albumDto>;
export type SeatDto = z.infer<typeof seatDto>;
export type PremiumSeatDto = z.infer<typeof premiumSeatDto>;
export type StandardSeatDto = z.infer<typeof standardSeatDto>;
export type AgentAccessDto = z.infer<typeof agentAccessDto>;
export type SuspensionDto = z.infer<typeof suspensionDto>;
