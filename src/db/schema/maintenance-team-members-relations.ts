import { relations } from 'drizzle-orm';
import { maintenanceTeamMembers } from './maintenance-team-members';
import { maintenanceTeams } from './maintenance-teams';
import { users } from './users';
import { tenants } from './tenants';

export const maintenanceTeamMembersRelations = relations(maintenanceTeamMembers, (helpers) => ({ team: helpers.one(maintenanceTeams, { relationName: 'MaintenanceTeamToMaintenanceTeamMember', fields: [ maintenanceTeamMembers.teamId ], references: [ maintenanceTeams.id ] }), user: helpers.one(users, { relationName: 'MaintenanceTeamMemberTouser', fields: [ maintenanceTeamMembers.userId ], references: [ users.id ] }), Tenant: helpers.one(tenants, { relationName: 'MaintenanceTeamMemberToTenant', fields: [ maintenanceTeamMembers.tenantId ], references: [ tenants.id ] }) }));