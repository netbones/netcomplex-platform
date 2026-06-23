import { relations } from 'drizzle-orm';
import { userAchievementProgresses } from './user-achievement-progresses';
import { users } from './users';

export const userAchievementProgressesRelations = relations(userAchievementProgresses, helpers => ({
  user: helpers.one(users, {
    relationName: 'UserAchievementProgressTouser',
    fields: [userAchievementProgresses.userId],
    references: [users.id],
  }),
}));
