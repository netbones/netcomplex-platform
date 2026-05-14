import { relations } from 'drizzle-orm';
import { notifications } from './notifications';
import { users } from './users';

export const notificationsRelations = relations(notifications, helpers => ({
  user: helpers.one(users, {
    relationName: 'NotificationTouser',
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
