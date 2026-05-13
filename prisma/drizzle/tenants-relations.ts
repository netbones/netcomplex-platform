import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { tenantModules } from './tenant-modules';

export const tenantsRelations = relations(tenants, (helpers) => ({ tenantModules: helpers.many(tenantModules, { relationName: 'TenantToTenantModule' }) }));