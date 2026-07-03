import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { households, profiles } from '../db';

const dateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));
const nullableDateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : null));

export const householdDto = createSelectSchema(households, {
  moveInDate: nullableDateSchema,
  moveOutDate: nullableDateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
}).pick({
  id: true,
  propertyId: true,
  organizationId: true,
  occupancyType: true,
  status: true,
  moveInDate: true,
  moveOutDate: true,
  createdAt: true,
  updatedAt: true,
});

export const profileDto = createSelectSchema(profiles, {
  occupantSince: nullableDateSchema,
  createdAt: dateSchema,
}).pick({
  id: true,
  displayName: true,
  profileAddress: true,
  userId: true,
  avatar: true,
  householdRole: true,
  residencyType: true,
  isPublic: true,
  occupantSince: true,
  status: true,
});

export const householdProfileDto = householdDto.extend({
  profiles: z.array(profileDto),
});

export type HouseholdDto = z.infer<typeof householdDto>;
export type ProfileDto = z.infer<typeof profileDto>;
export type HouseholdProfileDto = z.infer<typeof householdProfileDto>;

export type HouseholdDTO = HouseholdDto;
export type ProfileDTO = ProfileDto;
export type HouseholdProfileDTO = HouseholdProfileDto;

export function toHouseholdDTO(row: z.input<typeof householdDto>): HouseholdDto {
  return householdDto.parse(row);
}

export function toProfileDTO(row: z.input<typeof profileDto>): ProfileDto {
  return profileDto.parse(row);
}
