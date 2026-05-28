import type { InferSelectModel } from 'drizzle-orm';
import { groups } from '@api/db';

// API-safe group shape
export interface GroupDTO {
  id: string;
  name: string;
  description: string | null;
  category: string;
  image: string | null;
  color: string;
  isPublic: boolean;
  accessType: string;
  residentFilter: string;
  isActive: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

// Detailed group with additional context
export interface GroupDetailDTO extends GroupDTO {
  memberCount?: number;
}

// Maps a Drizzle group row to GroupDTO
export function toGroupDTO(group: InferSelectModel<typeof groups>): GroupDTO {
  return {
    id: group.id,
    name: group.name,
    description: group.description || null,
    category: group.category,
    image: group.image || null,
    color: group.color,
    isPublic: group.isPublic,
    accessType: group.accessType,
    residentFilter: group.residentFilter,
    isActive: group.isActive,
    ownerId: group.ownerId,
    createdAt: group.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: group.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

// Maps an array of Drizzle group rows to GroupDTO[]
export function toGroupDTOs(groupRows: InferSelectModel<typeof groups>[]): GroupDTO[] {
  return groupRows.map(toGroupDTO);
}
