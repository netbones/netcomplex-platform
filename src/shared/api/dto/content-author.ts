import { z } from 'zod/v4';

export const contentAuthorDto = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
});

export type ContentAuthorDto = z.infer<typeof contentAuthorDto>;
