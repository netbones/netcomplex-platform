import type { InferSelectModel } from 'drizzle-orm';
import { users } from '@api/db';

// API-safe user shape — never exposes internal fields
export interface UserDTO {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  isActive: boolean;
  profileSlug: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// Lightweight user summary for listings and references
export interface UserSummaryDTO {
  id: string;
  name: string;
  image: string | null;
  role: string;
  profileSlug: string | null;
}

// Maps a Drizzle user row to UserDTO
export function toUserDTO(user: InferSelectModel<typeof users>): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image || null,
    role: user.role,
    isActive: user.isActive,
    profileSlug: user.profileSlug || null,
    isPublic: user.isPublic,
    createdAt: user.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: user.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

// Maps an array of Drizzle user rows to UserDTO[]
export function toUserDTOs(userRows: InferSelectModel<typeof users>[]): UserDTO[] {
  return userRows.map(toUserDTO);
}

// Maps a Drizzle user row to UserSummaryDTO
export function toUserSummaryDTO(user: InferSelectModel<typeof users>): UserSummaryDTO {
  return {
    id: user.id,
    name: user.name,
    image: user.image || null,
    role: user.role,
    profileSlug: user.profileSlug || null,
  };
}
