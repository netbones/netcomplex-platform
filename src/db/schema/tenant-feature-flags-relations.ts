import { relations } from 'drizzle-orm';
import { tenantFeatureFlags } from './tenant-feature-flags';
import { tenants } from './tenants';

export const tenantFeatureFlagsRelations = relations(tenantFeatureFlags, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantFeatureFlags.tenantId],
    references: [tenants.id],
  }),
}));
