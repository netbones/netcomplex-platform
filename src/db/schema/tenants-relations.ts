import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { assistSessions } from './assist-sessions';
import { users } from './users';
import { tenantModules } from './tenant-modules';
import { tenantAchievements } from './tenant-achievements';

export const tenantsRelations = relations(tenants, helpers => ({
  assistSessions: helpers.many(assistSessions, { relationName: 'AssistSessionToTenant' }),
  owner: helpers.one(users, {
    relationName: 'TenantOwner',
    fields: [tenants.ownerId],
    references: [users.id],
  }),
  tenantModules: helpers.many(tenantModules, { relationName: 'TenantToTenantModule' }),
  tenantAchievements: helpers.many(tenantAchievements, {
    relationName: 'TenantToTenantAchievement',
  }),
}));
