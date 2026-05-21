import { relations } from 'drizzle-orm';
import { tenantModules } from './tenant-modules';
import { platformModules } from './platform-modules';
import { tenants } from './tenants';

export const tenantModulesRelations = relations(tenantModules, helpers => ({
  module: helpers.one(platformModules, {
    relationName: 'PlatformModuleToTenantModule',
    fields: [tenantModules.moduleKey],
    references: [platformModules.key],
  }),
  tenant: helpers.one(tenants, {
    relationName: 'TenantToTenantModule',
    fields: [tenantModules.tenantId],
    references: [tenants.id],
  }),
}));
