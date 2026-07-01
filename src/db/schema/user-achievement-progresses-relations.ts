import { relations } from 'drizzle-orm';
import { userAchievementProgresses } from './user-achievement-progresses';
import { users } from './users';
import { achievementDefinitions } from './achievement-definitions';

export const userAchievementProgressesRelations = relations(userAchievementProgresses, (helpers) => ({ user: helpers.one(users, { relationName: 'UserAchievementProgressTouser', fields: [ userAchievementProgresses.userId ], references: [ users.id ] }), definition: helpers.one(achievementDefinitions, { relationName: 'AchievementDefinitionToUserAchievementProgress', fields: [ userAchievementProgresses.definitionId ], references: [ achievementDefinitions.id ] }) }));