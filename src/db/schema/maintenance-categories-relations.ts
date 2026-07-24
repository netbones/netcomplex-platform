import { relations } from 'drizzle-orm';
import { maintenanceCategories } from './maintenance-categories';
import { tenants } from './tenants';

export const maintenanceCategoriesRelations = relations(maintenanceCategories, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'MaintenanceCategoryToTenant', fields: [ maintenanceCategories.tenantId ], references: [ tenants.id ] }) }));