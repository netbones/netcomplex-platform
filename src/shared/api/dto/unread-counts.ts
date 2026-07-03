import { z } from 'zod/v4';

export const unreadCountsDto = z.object({
  unreadCounts: z.record(z.string(), z.number()),
  totalUnread: z.number(),
});

export type UnreadCountsDto = z.infer<typeof unreadCountsDto>;
