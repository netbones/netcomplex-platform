import { relations } from 'drizzle-orm';
import { userAchievementProgresses } from './user-achievement-progresses';
import { achievementDefinitions } from './achievement-definitions';
import { users } from './users';

export const userAchievementProgressesRelations = relations(userAchievementProgresses, helpers => ({
  definition: helpers.one(achievementDefinitions, {
    relationName: 'AchievementDefinitionToUserAchievementProgress',
    fields: [userAchievementProgresses.definitionId],
    references: [achievementDefinitions.id],
  }),
  user: helpers.one(users, {
    relationName: 'UserAchievementProgressTouser',
    fields: [userAchievementProgresses.userId],
    references: [users.id],
  }),
}));
