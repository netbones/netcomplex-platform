import { relations } from 'drizzle-orm';
import { achievementDefinitions } from './achievement-definitions';
import { tenantAchievements } from './tenant-achievements';

export const achievementDefinitionsRelations = relations(achievementDefinitions, helpers => ({
  tenantAchievements: helpers.many(tenantAchievements, {
    relationName: 'AchievementDefinitionToTenantAchievement',
  }),
}));
