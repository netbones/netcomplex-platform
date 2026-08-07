import { relations } from 'drizzle-orm';
import { tenantFeatureFlags } from './tenant-feature-flags';
import { tenants } from './tenants';

export const tenantFeatureFlagsRelations = relations(tenantFeatureFlags, helpers => ({
  tenant: helpers.one(tenants, {
    relationName: 'TenantToTenantFeatureFlag',
    fields: [tenantFeatureFlags.tenantId],
    references: [tenants.id],
  }),
}));
