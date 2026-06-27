import { relations } from 'drizzle-orm';
import { maintenanceRequests } from './maintenance-requests';
import { properties } from './properties';
import { users } from './users';
import { maintenanceTeams } from './maintenance-teams';
import { serviceProviders } from './service-providers';
import { requestHistories } from './request-histories';
import { requestNotes } from './request-notes';
import { internalMaintenanceNotes } from './internal-maintenance-notes';

export const maintenanceRequestsRelations = relations(maintenanceRequests, helpers => ({
  property: helpers.one(properties, {
    relationName: 'MaintenanceRequestToProperty',
    fields: [maintenanceRequests.propertyId],
    references: [properties.id],
  }),
  user: helpers.one(users, {
    relationName: 'MaintenanceRequestTouser',
    fields: [maintenanceRequests.userId],
    references: [users.id],
  }),
  assignedTeam: helpers.one(maintenanceTeams, {
    relationName: 'TeamAssignments',
    fields: [maintenanceRequests.assignedTeamId],
    references: [maintenanceTeams.id],
  }),
  assignedProvider: helpers.one(serviceProviders, {
    relationName: 'ProviderAssignments',
    fields: [maintenanceRequests.assignedProviderId],
    references: [serviceProviders.id],
  }),
  histories: helpers.many(requestHistories, { relationName: 'MaintenanceRequestToRequestHistory' }),
  notes: helpers.many(requestNotes, { relationName: 'MaintenanceRequestToRequestNote' }),
  internalNotes: helpers.many(internalMaintenanceNotes, {
    relationName: 'InternalMaintenanceNoteToMaintenanceRequest',
  }),
}));
