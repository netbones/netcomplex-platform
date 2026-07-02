import { relations } from 'drizzle-orm';
import { userAchievements } from './user-achievements';
import { achievementDefinitions } from './achievement-definitions';
import { users } from './users';

export const userAchievementsRelations = relations(userAchievements, helpers => ({
  definition: helpers.one(achievementDefinitions, {
    relationName: 'AchievementDefinitionToUserAchievement',
    fields: [userAchievements.definitionId],
    references: [achievementDefinitions.id],
  }),
  user: helpers.one(users, {
    relationName: 'UserAchievementTouser',
    fields: [userAchievements.userId],
    references: [users.id],
  }),
}));
