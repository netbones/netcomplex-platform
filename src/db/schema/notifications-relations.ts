import { relations } from 'drizzle-orm';
import { notifications } from './notifications';
import { tenants } from './tenants';
import { users } from './users';

export const notificationsRelations = relations(notifications, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'NotificationToTenant',
    fields: [notifications.tenantId],
    references: [tenants.id],
  }),
  user: helpers.one(users, {
    relationName: 'NotificationTouser',
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
