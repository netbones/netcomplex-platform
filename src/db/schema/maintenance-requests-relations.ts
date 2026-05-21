import { relations } from 'drizzle-orm';
import { maintenanceRequests } from './maintenance-requests';
import { properties } from './properties';
import { users } from './users';

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
}));
