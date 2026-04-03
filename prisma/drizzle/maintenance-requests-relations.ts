import { relations } from 'drizzle-orm';
import { maintenanceRequests } from './maintenance-requests';
import { users } from './users';

export const maintenanceRequestsRelations = relations(maintenanceRequests, (helpers) => ({ user: helpers.one(users, { relationName: 'MaintenanceRequestTouser', fields: [ maintenanceRequests.userId ], references: [ users.id ] }) }));