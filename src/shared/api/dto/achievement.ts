import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { achievementDefinitions } from '../db';

const dateSch = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));

export const achievementDto = createSelectSchema(achievementDefinitions, {
  createdAt: dateSch,
}).pick({
  id: true,
  key: true,
  label: true,
  description: true,
  icon: true,
  category: true,
  threshold: true,
  eventType: true,
  createdAt: true,
});

export type AchievementDto = z.infer<typeof achievementDto>;
