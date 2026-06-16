import { relations } from 'drizzle-orm';
import { maintenanceTeams } from './maintenance-teams';
import { maintenanceRequests } from './maintenance-requests';

export const maintenanceTeamsRelations = relations(maintenanceTeams, (helpers) => ({ assignments: helpers.many(maintenanceRequests, { relationName: 'TeamAssignments' }) }));