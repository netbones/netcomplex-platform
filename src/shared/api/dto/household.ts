import type { InferSelectModel } from 'drizzle-orm';
import { households, profiles } from '../db';

// API-safe household shape
export interface HouseholdDTO {
  id: string;
  propertyId: string;
  organizationId: string | null;
  occupancyType: string;
  status: string;
  moveInDate: string | null;
  moveOutDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// Household with resident profiles attached
export interface HouseholdProfileDTO extends HouseholdDTO {
  profiles: ProfileDTO[];
}

// Profile shape for inclusion within household data
export interface ProfileDTO {
  id: string;
  displayName: string;
  profileAddress: string;
  userId: string | null;
  avatar: string | null;
  occupantType: string;
  residencyType: string;
  isPublic: boolean;
  occupantSince: string;
  status: string;
}

// Maps a Drizzle household row to HouseholdDTO
export function toHouseholdDTO(household: InferSelectModel<typeof households>): HouseholdDTO {
  return {
    id: household.id,
    propertyId: household.propertyId,
    organizationId: household.organizationId || null,
    occupancyType: household.occupancyType,
    status: household.status,
    moveInDate: household.moveInDate?.toISOString() ?? null,
    moveOutDate: household.moveOutDate?.toISOString() ?? null,
    createdAt: household.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: household.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

// Maps a Drizzle profile row to ProfileDTO
export function toProfileDTO(profile: InferSelectModel<typeof profiles>): ProfileDTO {
  return {
    id: profile.id,
    displayName: profile.displayName,
    profileAddress: profile.profileAddress,
    userId: profile.userId || null,
    avatar: profile.avatar || null,
    occupantType: profile.occupantType,
    residencyType: profile.residencyType,
    isPublic: profile.isPublic,
    occupantSince: profile.occupantSince?.toISOString() ?? new Date().toISOString(),
    status: profile.status,
  };
}
