import { relations } from 'drizzle-orm';
import { maintenanceRequests } from './maintenance-requests';
import { users } from './users';
import { properties } from './properties';

export const maintenanceRequestsRelations = relations(maintenanceRequests, helpers => ({
  user: helpers.one(users, {
    relationName: 'MaintenanceRequestTouser',
    fields: [maintenanceRequests.userId],
    references: [users.id],
  }),
  property: helpers.one(properties, {
    relationName: 'MaintenanceRequestToProperty',
    fields: [maintenanceRequests.propertyId],
    references: [properties.id],
  }),
}));
