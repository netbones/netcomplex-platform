import { relations } from 'drizzle-orm';
import { requestHistories } from './request-histories';
import { maintenanceRequests } from './maintenance-requests';
import { users } from './users';

export const requestHistoriesRelations = relations(requestHistories, helpers => ({
  request: helpers.one(maintenanceRequests, {
    relationName: 'MaintenanceRequestToRequestHistory',
    fields: [requestHistories.requestId],
    references: [maintenanceRequests.id],
  }),
  user: helpers.one(users, {
    relationName: 'RequestHistoryTouser',
    fields: [requestHistories.userId],
    references: [users.id],
  }),
}));
