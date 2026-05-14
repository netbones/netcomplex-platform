import { relations } from 'drizzle-orm';
import { tenantModules } from './tenant-modules';
import { tenants } from './tenants';
import { platformModules } from './platform-modules';

export const tenantModulesRelations = relations(tenantModules, helpers => ({
  tenant: helpers.one(tenants, {
    relationName: 'TenantToTenantModule',
    fields: [tenantModules.tenantId],
    references: [tenants.id],
  }),
  module: helpers.one(platformModules, {
    relationName: 'PlatformModuleToTenantModule',
    fields: [tenantModules.moduleKey],
    references: [platformModules.key],
  }),
}));
