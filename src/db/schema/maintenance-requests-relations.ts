import { relations } from 'drizzle-orm';
import { maintenanceRequests } from './maintenance-requests';
import { tenants } from './tenants';
import { internalMaintenanceNotes } from './internal-maintenance-notes';
import { serviceProviders } from './service-providers';
import { maintenanceTeams } from './maintenance-teams';
import { users } from './users';
import { properties } from './properties';
import { requestHistories } from './request-histories';
import { requestNotes } from './request-notes';

export const maintenanceRequestsRelations = relations(maintenanceRequests, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'MaintenanceRequestToTenant',
    fields: [maintenanceRequests.tenantId],
    references: [tenants.id],
  }),
  internalNotes: helpers.many(internalMaintenanceNotes, {
    relationName: 'InternalMaintenanceNoteToMaintenanceRequest',
  }),
  assignedProvider: helpers.one(serviceProviders, {
    relationName: 'ProviderAssignments',
    fields: [maintenanceRequests.assignedProviderId],
    references: [serviceProviders.id],
  }),
  assignedTeam: helpers.one(maintenanceTeams, {
    relationName: 'TeamAssignments',
    fields: [maintenanceRequests.assignedTeamId],
    references: [maintenanceTeams.id],
  }),
  landlord: helpers.one(users, {
    relationName: 'MaintenanceRequest_landlord',
    fields: [maintenanceRequests.landlordId],
    references: [users.id],
  }),
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
  histories: helpers.many(requestHistories, { relationName: 'MaintenanceRequestToRequestHistory' }),
  notes: helpers.many(requestNotes, { relationName: 'MaintenanceRequestToRequestNote' }),
}));
