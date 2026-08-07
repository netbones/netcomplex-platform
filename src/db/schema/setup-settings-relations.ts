import { relations } from 'drizzle-orm';
import { setupSettings } from './setup-settings';
import { tenantSetups } from './tenant-setups';

export const setupSettingsRelations = relations(setupSettings, helpers => ({
  tenantSetup: helpers.one(tenantSetups, {
    relationName: 'SetupSettingToTenantSetup',
    fields: [setupSettings.tenantSetupId],
    references: [tenantSetups.id],
  }),
}));
