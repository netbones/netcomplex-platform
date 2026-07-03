import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { resources } from '../db';

const dateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));
const nullableDateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : null));

export const resourceDto = createSelectSchema(resources, {
  publishedAt: nullableDateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
}).pick({
  id: true,
  tenantId: true,
  title: true,
  description: true,
  category: true,
  fileUrl: true,
  fileType: true,
  fileSize: true,
  externalUrl: true,
  bodyContent: true,
  version: true,
  downloadCount: true,
  visibility: true,
  authorId: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type ResourceDto = z.infer<typeof resourceDto>;
export type ResourceDTO = ResourceDto;

export function toResourceDTO(row: z.input<typeof resourceDto>): ResourceDto {
  return resourceDto.parse(row);
}

export function toResourceDTOs(rows: z.input<typeof resourceDto>[]): ResourceDto[] {
  return rows.map(row => resourceDto.parse(row));
}
