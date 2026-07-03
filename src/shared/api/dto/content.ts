import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { contents } from '../db';

const dateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));
const nullableDateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : null));

export const contentDto = createSelectSchema(contents, {
  publishedAt: nullableDateSchema,
  expiresAt: nullableDateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
}).pick({
  id: true,
  title: true,
  content: true,
  excerpt: true,
  image: true,
  category: true,
  tags: true,
  published: true,
  featured: true,
  priority: true,
  defaultLocale: true,
  contentType: true,
  viewCount: true,
  commentsEnabled: true,
  authorId: true,
  groupId: true,
  publishedAt: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
});

export const publicContentDto = contentDto.pick({
  id: true,
  title: true,
  content: true,
  excerpt: true,
  image: true,
  category: true,
  tags: true,
  authorId: true,
  publishedAt: true,
  contentType: true,
});

export type ContentDto = z.infer<typeof contentDto>;
export type PublicContentDto = z.infer<typeof publicContentDto>;

export type ContentDTO = ContentDto;
export type PublicContentDTO = PublicContentDto;

export function toContentDTO(row: z.input<typeof contentDto>): ContentDto {
  return contentDto.parse(row);
}

export function toContentDTOs(rows: z.input<typeof contentDto>[]): ContentDto[] {
  return rows.map(row => contentDto.parse(row));
}

export function toPublicContentDTO(row: z.input<typeof publicContentDto>): PublicContentDto {
  return publicContentDto.parse(row);
}
