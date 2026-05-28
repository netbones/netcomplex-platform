import type { InferSelectModel } from 'drizzle-orm';
import { announcements } from '@api/db';

// API-safe announcement shape
export interface AnnouncementDTO {
  id: string;
  title: string;
  content: string;
  author: string;
  priority: string;
  targetFilter: string;
  targetRoles: string[];
  resourceId: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Maps a Drizzle announcement row to AnnouncementDTO
export function toAnnouncementDTO(
  announcement: InferSelectModel<typeof announcements>
): AnnouncementDTO {
  return {
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    author: announcement.author,
    priority: announcement.priority,
    targetFilter: announcement.targetFilter,
    targetRoles: announcement.targetRoles || [],
    resourceId: announcement.resourceId || null,
    expiresAt: announcement.expiresAt?.toISOString() ?? null,
    createdAt: announcement.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: announcement.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

// Maps an array of Drizzle announcement rows to AnnouncementDTO[]
export function toAnnouncementDTOs(
  announcementRows: InferSelectModel<typeof announcements>[]
): AnnouncementDTO[] {
  return announcementRows.map(toAnnouncementDTO);
}
