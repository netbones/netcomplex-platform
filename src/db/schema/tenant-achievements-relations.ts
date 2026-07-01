import { relations } from 'drizzle-orm';
import { tenantAchievements } from './tenant-achievements';
import { achievementDefinitions } from './achievement-definitions';
import { tenants } from './tenants';

export const tenantAchievementsRelations = relations(tenantAchievements, (helpers) => ({ definition: helpers.one(achievementDefinitions, { relationName: 'AchievementDefinitionToTenantAchievement', fields: [ tenantAchievements.definitionId ], references: [ achievementDefinitions.id ] }), tenant: helpers.one(tenants, { relationName: 'TenantToTenantAchievement', fields: [ tenantAchievements.tenantId ], references: [ tenants.id ] }) }));