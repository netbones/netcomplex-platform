import { relations } from 'drizzle-orm';
import { settings } from './settings';
import { tenants } from './tenants';

export const settingsRelations = relations(settings, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'SettingToTenant',
    fields: [settings.tenantId],
    references: [tenants.id],
  }),
}));
