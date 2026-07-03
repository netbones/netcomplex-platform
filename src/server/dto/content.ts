// ── Shim: re-exports from shared/api/dto (ADR-024) ──
export { contentDto } from '@/shared/api/dto/content';
export type { ContentDto } from '@/shared/api/dto/content';
export { announcementDto } from '@/shared/api/dto/announcement';
export type { AnnouncementDto } from '@/shared/api/dto/announcement';

// Locally defined schemas not yet in shared/api/dto
import { z } from 'zod/v4';
export const contentAuthorDto = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
});
export type ContentAuthorDto = z.infer<typeof contentAuthorDto>;
