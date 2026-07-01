import { relations } from 'drizzle-orm';
import { userAchievements } from './user-achievements';
import { users } from './users';
import { achievementDefinitions } from './achievement-definitions';

export const userAchievementsRelations = relations(userAchievements, helpers => ({
  user: helpers.one(users, {
    relationName: 'UserAchievementTouser',
    fields: [userAchievements.userId],
    references: [users.id],
  }),
  definition: helpers.one(achievementDefinitions, {
    relationName: 'AchievementDefinitionToUserAchievement',
    fields: [userAchievements.definitionId],
    references: [achievementDefinitions.id],
  }),
}));
