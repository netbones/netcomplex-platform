import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { userAchievements } from '../db';

const dateSch = z.date().transform(d => d.toISOString());

export const userAchievementDto = createSelectSchema(userAchievements, {
  unlockedAt: dateSch,
}).pick({
  id: true,
  userId: true,
  definitionId: true,
  unlockedAt: true,
});
