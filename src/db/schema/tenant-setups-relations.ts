import { relations } from 'drizzle-orm';
import { tenantSetups } from './tenant-setups';
import { tenants } from './tenants';
import { setupMissions } from './setup-missions';
import { setupSettings } from './setup-settings';

export const tenantSetupsRelations = relations(tenantSetups, (helpers) => ({ tenant: helpers.one(tenants, { relationName: 'TenantToTenantSetup', fields: [ tenantSetups.tenantId ], references: [ tenants.id ] }), missions: helpers.many(setupMissions, { relationName: 'SetupMissionToTenantSetup' }), settings: helpers.many(setupSettings, { relationName: 'SetupSettingToTenantSetup' }) }));