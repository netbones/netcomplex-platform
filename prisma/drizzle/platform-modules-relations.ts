import { relations } from 'drizzle-orm';
import { platformModules } from './platform-modules';
import { tenantModules } from './tenant-modules';

export const platformModulesRelations = relations(platformModules, (helpers) => ({ tenantModules: helpers.many(tenantModules, { relationName: 'PlatformModuleToTenantModule' }) }));