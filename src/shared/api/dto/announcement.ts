import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { announcements } from '../db';

const dateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));
const nullableDateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : null));

export const announcementDto = createSelectSchema(announcements, {
  createdAt: dateSchema,
  updatedAt: dateSchema,
  expiresAt: nullableDateSchema,
  targetRoles: z.preprocess(val => (val == null ? [] : val) as string[], z.array(z.string())),
}).pick({
  id: true,
  title: true,
  content: true,
  author: true,
  priority: true,
  targetFilter: true,
  targetRoles: true,
  resourceId: true,
  createdAt: true,
  updatedAt: true,
  expiresAt: true,
});

export type AnnouncementDto = z.infer<typeof announcementDto>;
export type AnnouncementDTO = AnnouncementDto;

export function toAnnouncementDTO(row: z.input<typeof announcementDto>): AnnouncementDto {
  return announcementDto.parse(row);
}

export function toAnnouncementDTOs(rows: z.input<typeof announcementDto>[]): AnnouncementDto[] {
  return rows.map(row => announcementDto.parse(row));
}
