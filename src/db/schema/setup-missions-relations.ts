import { relations } from 'drizzle-orm';
import { setupMissions } from './setup-missions';
import { tenantSetups } from './tenant-setups';

export const setupMissionsRelations = relations(setupMissions, (helpers) => ({ tenantSetup: helpers.one(tenantSetups, { relationName: 'SetupMissionToTenantSetup', fields: [ setupMissions.tenantSetupId ], references: [ tenantSetups.id ] }) }));