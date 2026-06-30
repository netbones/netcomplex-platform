import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { resources } from '@/db/schema/resources';

const dateSchema = z.date().transform(d => d.toISOString());

export const resourceDto = createSelectSchema(resources, {
  publishedAt: dateSchema.nullable(),
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
