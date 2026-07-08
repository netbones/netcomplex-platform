import { z } from 'zod/v4';

const nullDate = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : null));

export const achievementProgressDto = z.object({
  definitionKey: z.string(),
  definitionId: z.string(),
  label: z.string(),
  count: z.number(),
  threshold: z.number(),
  percentage: z.number(),
  updatedAt: nullDate,
});

export type AchievementProgressDto = z.infer<typeof achievementProgressDto>;
