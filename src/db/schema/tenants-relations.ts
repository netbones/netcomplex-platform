import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { tenantModules } from './tenant-modules';
import { users } from './users';

export const tenantsRelations = relations(tenants, helpers => ({
  tenantModules: helpers.many(tenantModules, { relationName: 'TenantToTenantModule' }),
  owner: helpers.one(users, {
    relationName: 'TenantOwner',
    fields: [tenants.ownerId],
    references: [users.id],
  }),
}));
