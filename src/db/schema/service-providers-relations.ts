import { relations } from 'drizzle-orm';
import { serviceProviders } from './service-providers';
import { maintenanceRequests } from './maintenance-requests';

export const serviceProvidersRelations = relations(serviceProviders, helpers => ({
  assignments: helpers.many(maintenanceRequests, { relationName: 'ProviderAssignments' }),
}));
