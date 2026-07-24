import { relations } from 'drizzle-orm';
import { maintenanceTeams } from './maintenance-teams';
import { tenants } from './tenants';
import { maintenanceRequests } from './maintenance-requests';
import { maintenanceTeamMembers } from './maintenance-team-members';

export const maintenanceTeamsRelations = relations(maintenanceTeams, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'MaintenanceTeamToTenant', fields: [ maintenanceTeams.tenantId ], references: [ tenants.id ] }), assignments: helpers.many(maintenanceRequests, { relationName: 'TeamAssignments' }), members: helpers.many(maintenanceTeamMembers, { relationName: 'MaintenanceTeamToMaintenanceTeamMember' }) }));