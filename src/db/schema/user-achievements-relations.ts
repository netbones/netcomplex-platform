import { relations } from 'drizzle-orm';
import { userAchievements } from './user-achievements';
import { users } from './users';

export const userAchievementsRelations = relations(userAchievements, helpers => ({
  user: helpers.one(users, {
    relationName: 'UserAchievementTouser',
    fields: [userAchievements.userId],
    references: [users.id],
  }),
}));
