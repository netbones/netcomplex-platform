import { relations } from 'drizzle-orm';
import { userAchievements } from './user-achievements';
import { tenants } from './tenants';
import { achievementDefinitions } from './achievement-definitions';
import { users } from './users';

export const userAchievementsRelations = relations(userAchievements, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'TenantToUserAchievement', fields: [ userAchievements.tenantId ], references: [ tenants.id ] }), definition: helpers.one(achievementDefinitions, { relationName: 'AchievementDefinitionToUserAchievement', fields: [ userAchievements.definitionId ], references: [ achievementDefinitions.id ] }), user: helpers.one(users, { relationName: 'UserAchievementTouser', fields: [ userAchievements.userId ], references: [ users.id ] }) }));