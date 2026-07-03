import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { albums } from '../db';

const dateSch = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));

export const albumDto = createSelectSchema(albums, {
  createdAt: dateSch,
  updatedAt: dateSch,
}).pick({
  id: true,
  title: true,
  description: true,
  isPublic: true,
  mediaIds: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type AlbumDto = z.infer<typeof albumDto>;
