import { relations } from 'drizzle-orm';
import { achievementDefinitions } from './achievement-definitions';
import { tenantAchievements } from './tenant-achievements';
import { userAchievements } from './user-achievements';
import { userAchievementProgresses } from './user-achievement-progresses';

export const achievementDefinitionsRelations = relations(achievementDefinitions, (helpers) => ({ tenantAchievements: helpers.many(tenantAchievements, { relationName: 'AchievementDefinitionToTenantAchievement' }), userAchievements: helpers.many(userAchievements, { relationName: 'AchievementDefinitionToUserAchievement' }), userAchievementProgress: helpers.many(userAchievementProgresses, { relationName: 'AchievementDefinitionToUserAchievementProgress' }) }));